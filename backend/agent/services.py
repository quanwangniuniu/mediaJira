import json
import logging
import os
from decimal import Decimal

from django.contrib.contenttypes.models import ContentType
from django.db.models import Max

from spreadsheet.models import Spreadsheet, Sheet, Cell
from decision.models import Decision, Signal, Option
from task.models import Task
from .models import AgentSession, AgentMessage, AgentWorkflowRun

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


def _mock_analysis(spreadsheet_name):
    """Return realistic mock analysis data when no API key is available."""
    return {
        "anomalies": [
            {
                "metric": "ROAS",
                "movement": "SHARP_DECREASE",
                "scope_type": "CAMPAIGN",
                "scope_value": "Campaign Alpha",
                "delta_value": -35.0,
                "delta_unit": "PERCENT",
                "period": "LAST_7_DAYS",
                "description": f"Campaign Alpha ROAS dropped 35% week-over-week in {spreadsheet_name}",
            },
            {
                "metric": "CPA",
                "movement": "SHARP_INCREASE",
                "scope_type": "CAMPAIGN",
                "scope_value": "Campaign Beta",
                "delta_value": 28.0,
                "delta_unit": "PERCENT",
                "period": "LAST_7_DAYS",
                "description": "Campaign Beta CPA increased 28% week-over-week",
            },
            {
                "metric": "CTR",
                "movement": "MODERATE_DECREASE",
                "scope_type": "AD_SET",
                "scope_value": "Ad Set Gamma",
                "delta_value": -15.0,
                "delta_unit": "PERCENT",
                "period": "LAST_3_DAYS",
                "description": "Ad Set Gamma CTR declined 15% over last 3 days",
            },
        ],
        "suggested_decision": {
            "title": f"Performance Anomaly Review — {spreadsheet_name}",
            "context_summary": "Multiple campaigns showing concerning performance trends that require immediate attention.",
            "reasoning": "ROAS drop in Campaign Alpha combined with CPA spike in Campaign Beta suggests audience fatigue or creative burnout. CTR decline in Ad Set Gamma may indicate ad frequency issues.",
            "risk_level": "HIGH",
            "confidence": 4,
            "options": [
                {"text": "Pause underperforming campaigns and reallocate budget to top performers", "order": 0},
                {"text": "Refresh creatives for Campaign Alpha and Beta while maintaining current budget", "order": 1},
                {"text": "Reduce budget by 20% across affected campaigns and monitor for 48 hours", "order": 2},
            ],
        },
        "recommended_tasks": [
            {"type": "optimization", "summary": "Optimize Campaign Alpha — address ROAS decline", "priority": "HIGH"},
            {"type": "alert", "summary": "Monitor Campaign Beta CPA trend", "priority": "MEDIUM"},
            {"type": "asset", "summary": "Prepare new creatives for Ad Set Gamma", "priority": "MEDIUM"},
        ],
    }


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


class AgentOrchestrator:
    def __init__(self, user, project, session):
        self.user = user
        self.project = project
        self.session = session

    def handle_message(self, message, spreadsheet_id=None, action=None):
        """Main entry point. Yields SSE chunks as dicts."""
        if action == 'analyze' and spreadsheet_id:
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
                status='creating_tasks'
            ).order_by('-created_at').first()
            if not workflow_run:
                workflow_run = self.session.workflow_runs.filter(
                    decision__isnull=False
                ).order_by('-created_at').first()
            if workflow_run and workflow_run.decision_id:
                yield from self.create_tasks_from_decision(
                    workflow_run.decision_id, workflow_run
                )
            else:
                yield {"type": "error", "content": "No decision found to create tasks from."}
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

        client = _get_llm_client()
        if client:
            try:
                analysis = _call_llm(client, spreadsheet_data)
            except Exception as e:
                logger.error(f"LLM call failed: {e}")
                analysis = _mock_analysis(spreadsheet.name)
        else:
            analysis = _mock_analysis(spreadsheet.name)

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

    def create_tasks_from_decision(self, decision_id, workflow_run=None):
        """Create Tasks based on a Decision and its analysis."""
        yield {"type": "text", "content": "Creating tasks..."}

        try:
            decision = Decision.objects.get(id=decision_id)
        except Decision.DoesNotExist:
            yield {"type": "error", "content": f"Decision {decision_id} not found."}
            return

        decision_ct = ContentType.objects.get_for_model(Decision)

        analysis = {}
        if workflow_run:
            analysis = workflow_run.analysis_result or {}

        recommended_tasks = analysis.get("recommended_tasks", [])
        if not recommended_tasks:
            # Fallback: create a generic task
            recommended_tasks = [
                {
                    "type": "optimization",
                    "summary": f"Review and act on: {decision.title}",
                    "priority": "MEDIUM",
                }
            ]

        task_ids = []
        for task_data in recommended_tasks:
            task = Task.objects.create(
                summary=task_data.get("summary", "AI Agent Generated Task"),
                description=f"Auto-generated from Decision: {decision.title}",
                type=task_data.get("type", "optimization"),
                priority=task_data.get("priority", "MEDIUM"),
                project=self.project,
                owner=self.user,
                content_type=decision_ct,
                object_id=str(decision.id),
            )
            task_ids.append(task.id)

        if workflow_run:
            workflow_run.created_tasks = task_ids
            workflow_run.status = 'completed'
            workflow_run.save()

        yield {
            "type": "task_created",
            "content": f"Created {len(task_ids)} tasks.",
            "data": {"task_ids": task_ids, "decision_id": decision_id},
        }
