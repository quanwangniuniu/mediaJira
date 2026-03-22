import json
import logging
import os
import requests
from decimal import Decimal

from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.db.models import Max

from spreadsheet.models import Spreadsheet, Sheet, Cell
from decision.models import Decision, Signal, Option
from task.models import Task
from .models import AgentSession, AgentMessage, AgentWorkflowRun, ImportedCSVFile
from . import data_service
from . import file_parser

logger = logging.getLogger(__name__)


def _get_llm_client():
    """Return an Anthropic client if API key is set, else None."""
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return None
    try:
        import anthropic
        return anthropic.Anthropic(api_key=api_key)
    except ImportError:
        logger.warning("anthropic package not installed, using mock LLM")
        return None


def _extract_spreadsheet_data(spreadsheet):
    """Extract spreadsheet data into a structured dict for LLM analysis."""
    data = {"name": spreadsheet.name, "sheets": []}
    for sheet in spreadsheet.sheets.filter(is_deleted=False).order_by('position'):
        columns = list(
            sheet.columns.filter(is_deleted=False)
            .order_by('position')
            .values_list('name', flat=True)
        )
        rows_data = []
        rows = sheet.rows.filter(is_deleted=False).order_by('position')[:100]  # limit rows
        for row in rows:
            cells = Cell.objects.filter(
                sheet=sheet, row=row, is_deleted=False
            ).select_related('column').order_by('column__position')
            row_dict = {}
            for cell in cells:
                col_name = cell.column.name if cell.column else f"col_{cell.column_id}"
                if cell.computed_type == 'NUMBER' and cell.computed_number is not None:
                    row_dict[col_name] = float(cell.computed_number)
                elif cell.computed_string:
                    row_dict[col_name] = cell.computed_string
                elif cell.string_value:
                    row_dict[col_name] = cell.string_value
                elif cell.number_value is not None:
                    row_dict[col_name] = float(cell.number_value)
                elif cell.boolean_value is not None:
                    row_dict[col_name] = cell.boolean_value
            if row_dict:
                rows_data.append(row_dict)
        data["sheets"].append({
            "name": sheet.name,
            "columns": columns,
            "rows": rows_data,
        })
    return data


def _call_llm(client, spreadsheet_data):
    """Call Claude API to analyze spreadsheet data."""
    system_prompt = (
        "You are a media buying analyst AI. Analyze spreadsheet data and identify "
        "anomalies in campaign performance metrics like ROAS, CPA, CTR, conversion "
        "rate, ad spend, etc.\n\n"
        "Return your analysis as JSON with this structure:\n"
        '{"anomalies": [{"metric": "...", "movement": "...", "scope_type": "...", '
        '"scope_value": "...", "delta_value": ..., "delta_unit": "...", '
        '"period": "...", "description": "..."}], '
        '"suggested_decision": {"title": "...", "context_summary": "...", '
        '"reasoning": "...", "risk_level": "LOW|MEDIUM|HIGH", "confidence": 1-5, '
        '"options": [{"text": "...", "order": 0}]}, '
        '"recommended_tasks": [{"type": "optimization|alert|asset|execution", '
        '"summary": "...", "priority": "HIGH|MEDIUM|LOW"}]}\n\n'
        "Only return valid JSON, no markdown code fences."
    )
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": f"Analyze this spreadsheet data:\n{json.dumps(spreadsheet_data, default=str)}",
            }
        ],
    )
    text = response.content[0].text
    return json.loads(text)


def _get_dify_config():
    """Return Dify API config if configured, else None."""
    api_url = getattr(settings, 'DIFY_API_URL', os.environ.get('DIFY_API_URL'))
    api_key = getattr(settings, 'DIFY_API_KEY', os.environ.get('DIFY_API_KEY'))
    if api_url and api_key:
        return {'url': api_url, 'key': api_key}
    return None


def _call_dify(spreadsheet_data, user_id=None):
    """Call Dify workflow API to analyze spreadsheet data.

    Dify workflows accept inputs and return structured outputs.
    Expected workflow: Input (spreadsheet_data JSON) → LLM analysis → structured output.
    """
    config = _get_dify_config()
    if not config:
        raise RuntimeError("Dify not configured (DIFY_API_URL / DIFY_API_KEY missing)")

    api_url = config['url'].rstrip('/')
    headers = {
        'Authorization': f"Bearer {config['key']}",
        'Content-Type': 'application/json',
    }

    payload = {
        'inputs': {
            'spreadsheet_data': json.dumps(spreadsheet_data, default=str),
        },
        'response_mode': 'blocking',
        'user': str(user_id or 'agent'),
    }

    response = requests.post(
        f"{api_url}/v1/workflows/run",
        headers=headers,
        json=payload,
        timeout=120,
    )

    if response.status_code != 200:
        logger.error(f"Dify API error: HTTP {response.status_code}")
        raise RuntimeError(f"Dify API returned {response.status_code}")

    result = response.json()

    # Dify workflow output is in data.outputs
    outputs = result.get('data', {}).get('outputs', {})

    # The workflow should return our expected JSON structure.
    # It may be in a 'result' or 'text' key, or directly as structured data.
    if isinstance(outputs, dict):
        # If the output has our expected keys directly
        if 'anomalies' in outputs:
            return outputs
        # If wrapped in a 'result' or 'text' key
        for key in ('result', 'text', 'output', 'analysis'):
            val = outputs.get(key)
            if val:
                if isinstance(val, str):
                    try:
                        return json.loads(val)
                    except json.JSONDecodeError:
                        pass
                elif isinstance(val, dict) and 'anomalies' in val:
                    return val

    # Fallback: try to parse the entire output as our structure
    logger.warning(f"Unexpected Dify output format, falling back. Keys: {list(outputs.keys()) if isinstance(outputs, dict) else type(outputs)}")
    raise RuntimeError("Dify returned unexpected output format")


def _run_analysis(spreadsheet_data, user_id=None):
    """Run analysis using the best available provider: Dify > Claude.

    Raises RuntimeError if no provider is configured or all providers fail.
    """
    # 1. Try Dify first if configured
    dify_config = _get_dify_config()
    if dify_config:
        try:
            return _call_dify(spreadsheet_data, user_id)
        except Exception as e:
            logger.error(f"Dify call failed, falling back to Claude: {e}")

    # 2. Try Claude API
    client = _get_llm_client()
    if client:
        try:
            return _call_llm(client, spreadsheet_data)
        except Exception as e:
            logger.error(f"LLM call failed: {e}")

    # 3. No LLM available
    raise RuntimeError(
        "No analysis provider available. Configure DIFY_API_URL/DIFY_API_KEY "
        "or ANTHROPIC_API_KEY to enable analysis."
    )


def _serialize_project_members(project, excluded_users=None):
    """Return a minimal project member list for Dify follow-up disambiguation."""
    from core.models import ProjectMember

    excluded_user_ids = {
        user.id for user in (excluded_users or []) if getattr(user, 'id', None)
    }
    members = (
        ProjectMember.objects.filter(project=project, is_active=True)
        .exclude(user_id__in=excluded_user_ids)
        .select_related('user')
    )

    serialized = []
    for member in members:
        user = member.user
        display_name = user.get_full_name().strip() or user.username or user.email
        serialized.append(
            {
                'username': user.username,
                'email': user.email,
                'display_name': display_name,
            }
        )
    return serialized


def _coerce_json(value):
    """Parse a JSON string if possible, otherwise return the original value."""
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


def _normalize_dify_chat_output(output):
    """Normalize Dify follow-up output to {status, text, forwards}."""
    parsed = _coerce_json(output)
    if isinstance(parsed, dict):
        status = parsed.get('status') or 'completed'
        if status not in ('completed', 'needs_clarification'):
            status = 'completed'

        text = parsed.get('text')
        if not isinstance(text, str) or not text.strip():
            fallback_text = parsed.get('result') or parsed.get('output') or parsed.get('answer')
            if isinstance(fallback_text, str) and fallback_text.strip():
                text = fallback_text
            else:
                text = ''

        forwards = _coerce_json(parsed.get('forwards', []))
        if not isinstance(forwards, list):
            forwards = []

        normalized_forwards = []
        for item in forwards:
            if not isinstance(item, dict):
                continue
            username = item.get('username')
            content = item.get('content')
            if not isinstance(username, str) or not username.strip():
                continue
            if not isinstance(content, str) or not content.strip():
                continue
            normalized_forwards.append(
                {
                    'username': username.strip(),
                    'content': content.strip(),
                }
            )

        if text.strip():
            return {
                'status': status,
                'text': text.strip(),
                'forwards': normalized_forwards,
            }

    if isinstance(parsed, str) and parsed.strip():
        return {
            'status': 'completed',
            'text': parsed.strip(),
            'forwards': [],
        }
    return None


def _call_dify_chat(chat_messages, user_id=None, analysis_result=None, project_members=None):
    """Call Dify chat workflow API with conversation context."""
    api_url = getattr(settings, 'DIFY_API_URL', '') or os.environ.get('DIFY_API_URL', '')
    api_key = getattr(settings, 'DIFY_CHAT_API_KEY', '') or os.environ.get('DIFY_CHAT_API_KEY', '')
    if not api_url or not api_key:
        raise RuntimeError("Dify chat not configured (DIFY_API_URL / DIFY_CHAT_API_KEY missing)")

    api_url = api_url.rstrip('/')
    headers = {
        'Authorization': f"Bearer {api_key}",
        'Content-Type': 'application/json',
    }

    payload = {
        'inputs': {
            'chat_messages': chat_messages,
            'analysis_result': json.dumps(analysis_result, default=str) if analysis_result else '',
            'project_members': json.dumps(project_members or [], default=str),
        },
        'response_mode': 'blocking',
        'user': str(user_id or 'agent'),
    }

    response = requests.post(
        f"{api_url}/v1/workflows/run",
        headers=headers,
        json=payload,
        timeout=120,
    )

    if response.status_code != 200:
        logger.error(f"Dify chat API error: HTTP {response.status_code}")
        raise RuntimeError(f"Dify chat API returned {response.status_code}")

    result = response.json()
    outputs = result.get('data', {}).get('outputs', {})

    if isinstance(outputs, dict):
        candidates = [outputs]
        for key in ('result', 'text', 'output', 'answer'):
            val = outputs.get(key)
            if val:
                candidates.append(val)
        for candidate in candidates:
            normalized = _normalize_dify_chat_output(candidate)
            if normalized:
                return normalized
    else:
        normalized = _normalize_dify_chat_output(outputs)
        if normalized:
            return normalized

    # Extract text reply and forwards
    reply = ''
    forwards = []

    if isinstance(outputs, dict):
        for key in ('result', 'text', 'output', 'answer'):
            val = outputs.get(key)
            if val and isinstance(val, str):
                # Try to parse as JSON — Dify may wrap {text, forwards} in a string
                try:
                    parsed = json.loads(val)
                    if isinstance(parsed, dict) and 'text' in parsed:
                        reply = parsed['text']
                        ft = parsed.get('forwards', [])
                        if isinstance(ft, str):
                            try:
                                ft = json.loads(ft)
                            except (json.JSONDecodeError, TypeError):
                                ft = []
                        if isinstance(ft, list):
                            forwards = ft
                        break
                except (json.JSONDecodeError, TypeError):
                    pass
                # Not JSON or no 'text' key — use as plain reply
                reply = val
                break
    elif isinstance(outputs, str):
        try:
            parsed = json.loads(outputs)
            if isinstance(parsed, dict) and 'text' in parsed:
                reply = parsed['text']
                ft = parsed.get('forwards', [])
                if isinstance(ft, str):
                    try:
                        ft = json.loads(ft)
                    except (json.JSONDecodeError, TypeError):
                        ft = []
                if isinstance(ft, list):
                    forwards = ft
        except (json.JSONDecodeError, TypeError):
            reply = outputs

    if not reply:
        logger.warning(f"Unexpected Dify chat output format: {type(outputs)}")
        raise RuntimeError("Dify chat returned unexpected output format")

    # Fallback: if forwards not extracted above, check outputs directly
    if not forwards and isinstance(outputs, dict):
        ft = outputs.get('forwards', [])
        if isinstance(ft, str):
            try:
                ft = json.loads(ft)
            except (json.JSONDecodeError, TypeError):
                ft = []
        if isinstance(ft, list):
            forwards = ft

    return {"reply": reply, "forwards": forwards}


def _get_or_create_bot_private_chat(bot, target_user, project):
    """Find or create a private chat with exactly 2 participants: bot and target.

    Unlike ChatService.create_private_chat, this enforces participant_count==2
    so it won't accidentally match a group-like chat where bot was added as a
    third participant (e.g. via @Agent lazy-join).
    """
    from chat.models import Chat, ChatType, ChatParticipant

    # First, find chats that contain both bot and target_user
    chat = (
        Chat.objects.filter(
            project=project,
            type=ChatType.PRIVATE,
            participants__user=bot,
        )
        .filter(participants__user=target_user)
        .distinct()
        .first()
    )

    # Second, verify it has exactly 2 participants (not a group chat)
    if chat:
        participant_count = chat.participants.count()
        if participant_count != 2:
            # Not exactly 2 participants, might be a group chat
            chat = None

    # If found, reactivate any inactive participants
    if chat:
        participants = ChatParticipant.objects.filter(chat=chat, user__in=[bot, target_user])
        for participant in participants:
            if not participant.is_active:
                participant.is_active = True
                participant.save(update_fields=['is_active', 'updated_at'])
        return chat, False

    # Not found, create new chat
    chat = Chat.objects.create(project=project, type=ChatType.PRIVATE)
    ChatParticipant.objects.create(chat=chat, user=bot, is_active=True)
    ChatParticipant.objects.create(chat=chat, user=target_user, is_active=True)
    return chat, True


def _forward_to_users(forwards, sender, project):
    """Send messages to users based on Dify forwards structure.

    Uses the Agent Bot system user as the chat sender so that
    the private chat always involves two distinct users — avoiding the
    sender==target bug when forwarding to oneself.
    """
    from chat.services import MessageService
    from chat.tasks import notify_new_message
    from core.models import ProjectMember
    from core.utils.bot_user import get_agent_bot_user

    bot = get_agent_bot_user()
    sender_name = sender.get_full_name() or sender.username or sender.email

    results = []
    for item in forwards:
        username = (item.get('username') or '').strip()
        content = (item.get('content') or '').strip()
        if not username or not content:
            continue

        prefixed_content = f"from {sender_name} by agent:\n{content}"

        members = (
            ProjectMember.objects.filter(project=project, is_active=True)
            .exclude(user=bot)
            .filter(user__username__iexact=username)
            .select_related('user')
        )
        if not members.exists():
            members = (
                ProjectMember.objects.filter(project=project, is_active=True)
                .exclude(user=bot)
                .filter(user__email__iexact=username)
                .select_related('user')
            )

        if not members.exists():
            logger.warning(f"Forward target '{username}' not found in project {project.id}")
            results.append({"username": username, "status": "not_found"})
            continue

        if members.count() > 1:
            logger.warning(f"Forward target '{username}' is ambiguous in project {project.id}")
            results.append({"username": username, "status": "ambiguous"})
            continue

        target_user = members.first().user
        try:
            chat, _ = _get_or_create_bot_private_chat(bot, target_user, project)
            message = MessageService.create_message(chat=chat, sender=bot, content=prefixed_content)
            notify_new_message.delay(message.id)
            logger.info(
                "Agent forwarded message for project=%s sender=%s target_user=%s username=%s chat=%s message=%s",
                project.id,
                sender.id,
                target_user.id,
                username,
                chat.id,
                message.id,
            )
            results.append({"username": username, "status": "sent", "user_id": target_user.id})
        except Exception as e:
            logger.error(f"Failed to forward to {username}: {e}")
            results.append({"username": username, "status": "error", "detail": str(e)})

    return results


class AgentOrchestrator:
    def __init__(self, user, project, session):
        self.user = user
        self.project = project
        self.session = session

    def handle_message(self, message, spreadsheet_id=None, csv_filename=None, action=None, file_id=None):
        """Main entry point. Yields SSE chunks as dicts."""
        # file_id takes priority over csv_filename
        if file_id:
            yield from self.analyze_file(file_id)
            yield {"type": "done"}
            return
        if action == 'analyze' and csv_filename:
            yield from self.analyze_csv(csv_filename)
        elif action == 'analyze' and spreadsheet_id:
            yield from self.analyze_spreadsheet(spreadsheet_id)
        elif action == 'confirm_decision':
            workflow_run = self.session.workflow_runs.filter(
                status='awaiting_confirmation'
            ).order_by('-created_at').first()
            if workflow_run and workflow_run.analysis_result:
                yield from self.create_decision_draft(
                    workflow_run.analysis_result, workflow_run
                )
            else:
                yield {"type": "error", "content": "No pending analysis to confirm."}
        elif action == 'create_tasks':
            workflow_run = self.session.workflow_runs.filter(
                analysis_result__isnull=False
            ).order_by('-created_at').first()
            if workflow_run and workflow_run.analysis_result:
                yield from self.create_tasks_from_analysis(workflow_run)
            else:
                yield {"type": "error", "content": "No analysis found to create tasks from."}
        else:
            # Check if there's a completed analysis awaiting follow-up
            latest_run = self.session.workflow_runs.filter(
                status='awaiting_confirmation',
                chat_followed_up=False,
            ).order_by('-created_at').first()

            if latest_run:
                yield {"type": "text", "content": "Thinking..."}
                history = AgentMessage.objects.filter(
                    session=self.session
                ).order_by('created_at')
                chat_context = "\n".join(
                    f"[{m.role}]: {m.content}" for m in history
                )
                full_input = f"{chat_context}\n\n[user]: {message}"
                try:
                    from core.utils.bot_user import get_agent_bot_user

                    bot = get_agent_bot_user()
                    project_members = _serialize_project_members(
                        self.project,
                        excluded_users=[bot],
                    )
                    logger.info(
                        "Running agent follow-up chat for project=%s session=%s workflow_run=%s user=%s project_members=%s",
                        self.project.id,
                        self.session.id,
                        latest_run.id,
                        self.user.id,
                        len(project_members),
                    )
                    result = _call_dify_chat(
                        full_input,
                        user_id=self.user.id,
                        analysis_result=latest_run.analysis_result,
                        project_members=project_members,
                    )
                    follow_up_status = result.get("status", "completed")
                    reply = result.get("text") or result.get("reply", "")
                    forwards = result.get("forwards", [])
                    logger.info(
                        "Agent follow-up chat completed for workflow_run=%s status=%s forwards=%s close_follow_up=%s",
                        latest_run.id,
                        follow_up_status,
                        len(forwards),
                        follow_up_status == 'completed',
                    )

                    if follow_up_status == 'completed':
                        latest_run.chat_followed_up = True
                        latest_run.save(update_fields=['chat_followed_up'])
                    yield {"type": "text", "content": reply}

                    if forwards:
                        fwd_results = _forward_to_users(forwards, self.user, self.project)
                        sent = [r["username"] for r in fwd_results if r["status"] == "sent"]
                        failed = [r["username"] for r in fwd_results if r["status"] != "sent"]
                        if sent:
                            yield {"type": "text", "content": f"Message forwarded to: {', '.join(sent)}"}
                        if failed:
                            yield {"type": "text", "content": f"Could not forward to: {', '.join(failed)}"}
                except Exception as e:
                    logger.error(f"Dify chat call failed: {e}")
                    yield {"type": "error", "content": str(e)}
            else:
                yield {
                    "type": "text",
                    "content": (
                        "I can help you analyze spreadsheet data and create decisions. "
                        "To get started, select a spreadsheet and use the 'analyze' action."
                    ),
                }
        yield {"type": "done"}

    def analyze_file(self, file_id):
        """Analyse any uploaded file (CSV/Excel) by its DB id."""
        yield {"type": "text", "content": "Analyzing file data..."}

        try:
            record = ImportedCSVFile.objects.get(
                id=file_id, project=self.project, is_deleted=False,
            )
        except ImportedCSVFile.DoesNotExist:
            yield {"type": "error", "content": f"File {file_id} not found."}
            return

        csv_dir = data_service._get_csv_dir()
        filepath = os.path.join(csv_dir, os.path.basename(record.filename))

        if not os.path.isfile(filepath):
            yield {"type": "error", "content": "File not found on disk."}
            return

        try:
            spreadsheet_data = file_parser.parse_file_to_json(filepath, record.filename)
        except Exception as e:
            yield {"type": "error", "content": f"Failed to parse file: {e}"}
            return

        workflow_run = AgentWorkflowRun.objects.create(
            session=self.session,
            status='analyzing',
        )

        try:
            analysis = _run_analysis(spreadsheet_data, user_id=self.user.id)
        except RuntimeError as e:
            workflow_run.status = 'failed'
            workflow_run.error_message = str(e)
            workflow_run.save()
            yield {"type": "error", "content": str(e)}
            return

        workflow_run.analysis_result = analysis
        workflow_run.status = 'awaiting_confirmation'
        workflow_run.save()

        anomalies = analysis.get("anomalies", [])
        summary_parts = [f"Found {len(anomalies)} anomalies:"]
        for a in anomalies:
            summary_parts.append(f"- {a.get('description', str(a))}")

        yield {
            "type": "analysis",
            "content": "\n".join(summary_parts),
            "data": analysis,
        }
        yield {
            "type": "confirmation_request",
            "content": "I've finished the analysis. You can send one follow-up message now. I can explain the findings, turn them into a short report, or prepare messages to forward to specific project members. If you want me to forward something, include the exact username or email.",
            "data": {"workflow_run_id": str(workflow_run.id)},
        }

    def analyze_spreadsheet(self, spreadsheet_id):
        """Read spreadsheet data via ORM, send to LLM for analysis."""
        yield {"type": "text", "content": "Analyzing spreadsheet data..."}

        try:
            spreadsheet = Spreadsheet.objects.get(
                id=spreadsheet_id,
                project=self.project,
                is_deleted=False,
            )
        except Spreadsheet.DoesNotExist:
            yield {"type": "error", "content": f"Spreadsheet {spreadsheet_id} not found."}
            return

        workflow_run = AgentWorkflowRun.objects.create(
            session=self.session,
            spreadsheet=spreadsheet,
            status='analyzing',
        )

        spreadsheet_data = _extract_spreadsheet_data(spreadsheet)

        try:
            analysis = _run_analysis(spreadsheet_data, user_id=self.user.id)
        except RuntimeError as e:
            workflow_run.status = 'failed'
            workflow_run.error_message = str(e)
            workflow_run.save()
            yield {"type": "error", "content": str(e)}
            return

        workflow_run.analysis_result = analysis
        workflow_run.status = 'awaiting_confirmation'
        workflow_run.save()

        anomalies = analysis.get("anomalies", [])
        summary_parts = [f"Found {len(anomalies)} anomalies:"]
        for a in anomalies:
            summary_parts.append(f"- {a['description']}")

        yield {
            "type": "analysis",
            "content": "\n".join(summary_parts),
            "data": analysis,
        }
        yield {
            "type": "confirmation_request",
            "content": "I've finished the analysis. You can send one follow-up message now. I can explain the findings, turn them into a short report, or prepare messages to forward to specific project members. If you want me to forward something, include the exact username or email.",
            "data": {"workflow_run_id": str(workflow_run.id)},
        }

    def analyze_csv(self, csv_filename):
        """Read an uploaded CSV file from disk, send to LLM for analysis."""
        yield {"type": "text", "content": "Analyzing CSV data..."}

        safe_name = os.path.basename(csv_filename)

        # Verify file belongs to this project
        record = ImportedCSVFile.objects.filter(
            filename=safe_name, project=self.project, is_deleted=False
        ).first()
        if not record:
            yield {"type": "error", "content": f"CSV file not found: {safe_name}"}
            return

        csv_dir = data_service._get_csv_dir()
        filepath = os.path.join(csv_dir, safe_name)

        if not os.path.isfile(filepath):
            yield {"type": "error", "content": f"CSV file not found on disk: {safe_name}"}
            return

        columns, rows = data_service._read_csv_file(filepath)
        if not rows:
            yield {"type": "error", "content": "CSV file is empty or could not be parsed."}
            return

        workflow_run = AgentWorkflowRun.objects.create(
            session=self.session,
            status='analyzing',
        )

        # Build spreadsheet-like data structure for the analysis pipeline
        spreadsheet_data = {
            "name": safe_name,
            "sheets": [{
                "name": "Sheet1",
                "columns": columns,
                "rows": rows[:100],  # limit rows sent to LLM
            }],
        }

        try:
            analysis = _run_analysis(spreadsheet_data, user_id=self.user.id)
        except RuntimeError as e:
            workflow_run.status = 'failed'
            workflow_run.error_message = str(e)
            workflow_run.save()
            yield {"type": "error", "content": str(e)}
            return

        workflow_run.analysis_result = analysis
        workflow_run.status = 'awaiting_confirmation'
        workflow_run.save()

        anomalies = analysis.get("anomalies", [])
        summary_parts = [f"Found {len(anomalies)} anomalies:"]
        for a in anomalies:
            summary_parts.append(f"- {a.get('description', str(a))}")

        yield {
            "type": "analysis",
            "content": "\n".join(summary_parts),
            "data": analysis,
        }
        yield {
            "type": "confirmation_request",
            "content": "I've finished the analysis. You can send one follow-up message now. I can explain the findings, turn them into a short report, or prepare messages to forward to specific project members. If you want me to forward something, include the exact username or email.",
            "data": {"workflow_run_id": str(workflow_run.id)},
        }

    def create_decision_draft(self, analysis_result, workflow_run=None):
        """Create a Decision draft with Signals and Options from analysis."""
        yield {"type": "text", "content": "Creating decision draft..."}

        if workflow_run:
            workflow_run.status = 'creating_decision'
            workflow_run.save()

        suggested = analysis_result.get("suggested_decision", {})

        # Calculate next project_seq
        max_seq = Decision.objects.filter(
            project=self.project
        ).aggregate(Max('project_seq'))['project_seq__max'] or 0

        decision = Decision.objects.create(
            title=suggested.get("title", "AI Agent Analysis"),
            context_summary=suggested.get("context_summary", ""),
            reasoning=suggested.get("reasoning", ""),
            risk_level=suggested.get("risk_level", "MEDIUM"),
            confidence=suggested.get("confidence", 3),
            project=self.project,
            project_seq=max_seq + 1,
            author=self.user,
        )

        # Create signals from anomalies
        anomalies = analysis_result.get("anomalies", [])
        for anomaly in anomalies:
            Signal.objects.create(
                decision=decision,
                author=self.user,
                metric=anomaly.get("metric", ""),
                movement=anomaly.get("movement", ""),
                period=anomaly.get("period", ""),
                scope_type=anomaly.get("scope_type", ""),
                scope_value=anomaly.get("scope_value", ""),
                delta_value=anomaly.get("delta_value"),
                delta_unit=anomaly.get("delta_unit", ""),
                display_text=anomaly.get("description", ""),
            )

        # Create options
        options = suggested.get("options", [])
        for opt in options:
            Option.objects.create(
                decision=decision,
                text=opt.get("text", ""),
                order=opt.get("order", 0),
            )

        if workflow_run:
            workflow_run.decision = decision
            workflow_run.status = 'creating_tasks'
            workflow_run.save()

        yield {
            "type": "decision_draft",
            "content": f"Created decision draft: {decision.title}",
            "data": {"decision_id": decision.id},
        }
        yield {
            "type": "confirmation_request",
            "content": "Decision draft created. Would you like me to create tasks based on the recommended actions?",
            "data": {"decision_id": decision.id},
        }

    def create_tasks_from_analysis(self, workflow_run):
        """Create Tasks directly from analysis results, optionally linking to Decision if it exists."""
        yield {"type": "text", "content": "Creating tasks..."}

        analysis = workflow_run.analysis_result or {}
        recommended_tasks = analysis.get("recommended_tasks", [])
        if not recommended_tasks:
            yield {"type": "error", "content": "No recommended tasks found in analysis."}
            return

        # If a decision exists, link tasks to it; otherwise leave unlinked
        decision = workflow_run.decision
        if decision:
            decision_ct = ContentType.objects.get_for_model(Decision)
            link_kwargs = {
                "content_type": decision_ct,
                "object_id": str(decision.id),
            }
            desc_suffix = f" (Decision: {decision.title})"
        else:
            link_kwargs = {}
            desc_suffix = ""

        task_ids = []
        for task_data in recommended_tasks:
            summary = task_data.get("summary", "AI Agent Generated Task")[:255]
            task = Task.objects.create(
                summary=summary,
                description=f"Auto-generated from AI analysis{desc_suffix}",
                type=task_data.get("type", "optimization"),
                priority=task_data.get("priority", "MEDIUM"),
                project=self.project,
                owner=self.user,
                **link_kwargs,
            )
            task_ids.append(task.id)

        workflow_run.created_tasks = task_ids
        workflow_run.status = 'completed'
        workflow_run.save()

        yield {
            "type": "task_created",
            "content": f"Created {len(task_ids)} tasks.",
            "data": {"task_ids": task_ids, "decision_id": decision.id if decision else None},
        }
