from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from task.models import Task, ApprovalRecord, TaskComment
from decision.models import Decision
from .models import SlackWorkspaceConnection, NotificationPreference
from .services import send_slack_message, create_default_preferences
from core.models import Project
import logging

logger = logging.getLogger(__name__)

def _get_connection(project):
    """Helper to get active Slack connection for a project."""
    if not project or not project.organization:
        return None
    return SlackWorkspaceConnection.objects.filter(
        organization=project.organization,
        is_active=True
    ).first()

def _check_preference(connection, project, event_type, task_status=None):
    """Helper to check for notification preferences."""
    qs = NotificationPreference.objects.filter(
        connection=connection,
        project=project,
        event_type=event_type,
        is_active=True
    )
    if task_status:
        # If a specific task status is provided, this logic prioritizes an exact match.
        # If no specific match is found, it falls back to the general preference (where task_status is None).
        pass
    
    # Simple filtration for now
    preferences = list(qs)
    # Return best match (specific status > no status)
    for p in preferences:
        if task_status and p.task_status == task_status:
            return p
    for p in preferences:
        if not p.task_status:
            return p
            
    return None

@receiver(post_save, sender=Project)
def notify_on_project_creation(sender, instance, created, **kwargs):
    """
    Ensure default Slack notification preferences are created for new projects
    if an active Slack connection exists for the organization.
    """
    if not created:
        return

    # Check for active connection
    if not instance.organization:
        return
        
    connection = SlackWorkspaceConnection.objects.filter(
        organization=instance.organization,
        is_active=True
    ).first()
    
    if connection:
        create_default_preferences(instance.organization, connection)


@receiver(post_save, sender=Task)
def notify_on_task_creation(sender, instance, created, **kwargs):
    """
    Triggers a Slack notification when a new task is created.
    """
    if not created:
        return

    connection = _get_connection(instance.project)
    if not connection:
        return

    preference = _check_preference(connection, instance.project, NotificationPreference.EventType.TASK_CREATED)
    if not preference:
        return

    channel_id = preference.slack_channel_id or connection.default_channel_id
    if not channel_id:
        return

    message = f"🆕 *New Task Created in {instance.project.name}*\n*Summary:* {instance.summary}\n*Priority:* {instance.priority}"
    if instance.owner:
        message += f"\n*Owner:* {instance.owner.email}"
        
    send_slack_message(connection, channel_id, message)

@receiver(pre_save, sender=Task)
def capture_status_change(sender, instance, **kwargs):
    """
    Capture the old status before saving to detect changes.
    We attach `_old_status` to the instance.
    """
    if instance.pk:
        try:
            old_task = Task.objects.get(pk=instance.pk)
            instance._old_status = old_task.status
        except Task.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None

@receiver(post_save, sender=Task)
def notify_on_task_update(sender, instance, created, **kwargs):
    """
    Triggers a Slack notification when task status changes.
    """
    if created:
        return # Handled by creation signal
    
    # Check if we captured an old status
    if not hasattr(instance, '_old_status') or not instance._old_status:
        return
        
    if instance.status == instance._old_status:
        return # No status change

    connection = _get_connection(instance.project)
    if not connection:
        return
        
    # Check preference for STATUS_CHANGE and specific target status
    preference = _check_preference(
        connection, 
        instance.project, 
        NotificationPreference.EventType.TASK_STATUS_CHANGE,
        task_status=instance.status
    )
    
    if not preference:
        return

    channel_id = preference.slack_channel_id or connection.default_channel_id
    if not channel_id:
        return
        
    # Suppress redundant notifications for immediate state transitions (e.g., Draft -> Submitted) 
    # occurring within 5 seconds of task creation.
    from django.utils import timezone
    if (instance._old_status == Task.Status.DRAFT and 
        instance.status == Task.Status.SUBMITTED and 
        (timezone.now() - instance.created_at).total_seconds() < 5):
        return

    # Suppress generic status notifications for Approval/Rejection events, 
    # as these are handled by the `notify_on_approval_decision` signal with richer context.
    if instance.status in [Task.Status.APPROVED, Task.Status.REJECTED]:
        return

    # Suppress internal system transition notifications (Approved -> Locked).
    if instance.status == Task.Status.LOCKED and instance._old_status == Task.Status.APPROVED:
        return

    message = f"🔄 *Task Status Updated*\n*Task:* {instance.summary}\n*New Status:* {instance.get_status_display()}\n*Previous:* {instance._old_status}"
    send_slack_message(connection, channel_id, message)

@receiver(post_save, sender=ApprovalRecord)
def notify_on_approval_decision(sender, instance, created, **kwargs):
    """
    Triggers notification on approval decision.
    """
    if not created:
        return

    task = instance.task
    connection = _get_connection(task.project)
    if not connection:
        return

    # Approval decisions are treated as a subset of task status changes for notification purposes.
    # Checks for a generic TASK_STATUS_CHANGE preference.
    preference = _check_preference(connection, task.project, NotificationPreference.EventType.TASK_STATUS_CHANGE)
    if not preference:
        return

    channel_id = preference.slack_channel_id or connection.default_channel_id
    if not channel_id:
        return

    status_icon = "✅" if instance.is_approved else "❌"
    decision = "Approved" if instance.is_approved else "Rejected"
    
    message = f"{status_icon} *Task {decision}*\n*Task:* {task.summary}\n*Decider:* {instance.approved_by.email}"
    if instance.comment:
        message += f"\n*Comment:* {instance.comment}"

    send_slack_message(connection, channel_id, message)

@receiver(post_save, sender=TaskComment)
def notify_on_comment(sender, instance, created, **kwargs):
    """
    Triggers notification when a comment is added.
    """
    if not created:
        return
        
    task = instance.task
    connection = _get_connection(task.project)
    if not connection:
        return
        
    preference = _check_preference(connection, task.project, NotificationPreference.EventType.COMMENT_UPDATED)
    if not preference:
        return
        
    channel_id = preference.slack_channel_id or connection.default_channel_id
    if not channel_id:
        return
        
    message = f"💬 *New Comment on {task.summary}*\n*User:* {instance.user.email}\n*Comment:* {instance.body}"
    send_slack_message(connection, channel_id, message)

@receiver(post_save, sender=Decision)
def notify_on_decision_creation(sender, instance, created, **kwargs):
    """
    Triggers a Slack notification when a new decision is created.
    Decisions are Organization-scoped (no Project link), so we use the 
    Connection's default channel.
    """
    if not created:
        return

    # Decisions must have an author to belong to an Org
    if not instance.author or not instance.author.organization:
        return

    # Find connection for the Organization
    connection = SlackWorkspaceConnection.objects.filter(
        organization=instance.author.organization,
        is_active=True
    ).first()
    
    if not connection:
        return

    # Check for ANY active preference for DECISION_CREATED
    # Since decisions are Org-wide, we respect the setting if enabled in any project (or structurally, just if the record exists and is True)
    # Given frontend syncs them, checking active ones is correct.
    preference = NotificationPreference.objects.filter(
        connection=connection,
        event_type=NotificationPreference.EventType.DECISION_CREATED,
        is_active=True
    ).first()

    if not preference:
        return

    channel_id = preference.slack_channel_id or connection.default_channel_id
    if not channel_id:
        return

    # Construct message
    risk_emoji = "🟢"
    if instance.risk_level == Decision.RiskLevel.HIGH:
        risk_emoji = "🔴"
    elif instance.risk_level == Decision.RiskLevel.MEDIUM:
        risk_emoji = "🟡"

    message = f"⚖️ *New Decision Created*\n*Title:* {instance.title}\n*Risk:* {instance.get_risk_level_display()} {risk_emoji}\n*Confidence:* {instance.confidence}/5\n*Author:* {instance.author.email}"
    
    send_slack_message(connection, channel_id, message)
