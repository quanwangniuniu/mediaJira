# backend/klaviyo/services.py

"""
Service layer for Klaviyo-like workflow trigger logic.

This module contains small, focused functions that:
- Find workflows that should be triggered
- Create WorkflowExecutionLog records
- (Optionally) schedule workflow actions for later execution
"""

from django.utils import timezone

from .models import EmailDraft, WorkflowExecutionLog


def execute_workflow_trigger(email_draft: EmailDraft, previous_status: str | None = None) -> None:
    """
    Main entry point for workflow triggers related to an EmailDraft.

    Called when an EmailDraft changes status (e.g. from "draft" → "ready").

    Steps:
        1. Find all active workflows linked to this draft.
        2. Filter workflows that are configured to trigger on the current status.
        3. For each workflow, create a WorkflowExecutionLog record.
        4. Optionally schedule further actions (e.g. async tasks, notifications).

    This keeps the signal handler very thin and makes the trigger logic testable.
    """
    current_status = email_draft.status

    # Find all workflows related to this draft and configured to trigger
    workflows = email_draft.workflows.filter(
        is_active=True,
        trigger_draft_status=current_status,
    )

    if not workflows.exists():
        # Nothing to trigger for this draft/status combination
        return

    for workflow in workflows:
        trigger_data = {
            "from_status": previous_status,
            "to_status": current_status,
            "draft_id": email_draft.id,
            "workflow_id": workflow.id,
            "triggered_at": timezone.now().isoformat(),
        }

        # Create execution log (and mark as executed for now)
        log = create_execution_log(
            workflow=workflow,
            email_draft=email_draft,
            trigger_type=WorkflowExecutionLog.TRIGGER_TYPE_DRAFT_STATUS_CHANGE,
            trigger_data=trigger_data,
        )

        # Optional: schedule any follow-up actions (e.g. send email, enqueue Celery task)
        schedule_workflow_action(workflow=workflow, email_draft=email_draft, log=log)


def create_execution_log(
    workflow,
    email_draft: EmailDraft,
    trigger_type: str,
    trigger_data: dict,
) -> WorkflowExecutionLog:
    """
    Create a WorkflowExecutionLog row for a given workflow + draft trigger.

    For this iteration we mark the log as immediately EXECUTED, but in a real system
    you might:
        - start with PENDING,
        - enqueue async processing,
        - then update to EXECUTED / FAILED later.
    """
    log = WorkflowExecutionLog.objects.create(
        workflow=workflow,
        email_draft=email_draft,
        trigger_type=trigger_type,
        trigger_data=trigger_data,
        status=WorkflowExecutionLog.STATUS_EXECUTED,
        executed_at=timezone.now(),
    )
    return log


def schedule_workflow_action(workflow, email_draft: EmailDraft, log: WorkflowExecutionLog) -> None:
    """
    Placeholder for scheduling or executing workflow actions.

    Examples:
        - Enqueue a Celery task to send an email
        - Call an external service
        - Write additional audit logs

    For now this is a no-op implementation, but keeping it as a separate function
    makes it easy to extend later without changing signal or service logic.
    """
    # TODO: integrate with Celery / async task queue if needed.
    # For now, we simply do nothing or you could add a logger.debug line.
    return
