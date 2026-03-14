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
            # General chat — echo back with guidance
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
            "content": "Would you like me to create a Decision draft based on this analysis?",
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
            "content": "Would you like me to create a Decision draft based on this analysis?",
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
            "content": "Would you like me to create a Decision draft based on this analysis?",
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
