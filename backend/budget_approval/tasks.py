from celery import shared_task
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import BudgetRequest, BudgetEscalationRule
from user_preferences.services.notification_dispatcher import NotificationDispatcher

User = get_user_model()


@shared_task
def trigger_escalation(budget_request_id):
    """
    Celery task to handle budget request escalation notifications
    
    This task is called asynchronously when a budget request meets escalation criteria.
    It uses the existing notification system from user_preferences to send notifications.
    """
    try:
        budget_request = BudgetRequest.objects.get(id=budget_request_id)
        
        if not budget_request.is_escalated:
            print(f"[ESCALATION] Budget request {budget_request_id} is not marked for escalation")
            return False
        
        # Get escalation rules for this request
        escalation_rules = BudgetEscalationRule.objects.filter(
            budget_pool=budget_request.budget_pool,
            threshold_currency=budget_request.currency,
            is_active=True
        )
        
        # Prepare escalation message
        escalation_message = f"""
Budget Request Escalation Alert

Request ID: #{budget_request_id}
Amount: {budget_request.amount} {budget_request.currency}
Requested By: {budget_request.requested_by.username}
Project: {budget_request.budget_pool.project.name}
Ad Channel: {budget_request.budget_pool.ad_channel.name}
Escalation Roles: {', '.join([rule.escalate_to_role.name for rule in escalation_rules])}
Triggered At: {timezone.now()}

This budget request has been escalated due to exceeding threshold limits.
Please review and take appropriate action.
        """
        
        # Get users who should receive escalation notifications
        escalation_users = []
        for rule in escalation_rules:
            # Use the get_escalation_approvers method from the model
            approvers = rule.get_escalation_approvers()
            escalation_users.extend(approvers)
        
        # Remove duplicates and convert to User objects
        unique_user_ids = list(set(escalation_users))
        users = User.objects.filter(id__in=unique_user_ids)
        
        # Send notifications to each escalation user
        notification_results = []
        for user in users:
            result = send_escalation_notification(user, escalation_message)
            notification_results.append({
                'user_id': user.id,
                'username': user.username,
                'success': result
            })
        
        print(f"[ESCALATION] Successfully triggered escalation for budget request {budget_request_id}")
        print(f"[ESCALATION] Notified {len(users)} users")
        
        return {
            'budget_request_id': budget_request_id,
            'escalation_users': notification_results,
            'success': True
        }
        
    except BudgetRequest.DoesNotExist:
        print(f"[ESCALATION] Budget request {budget_request_id} not found")
        return False
    except Exception as e:
        print(f"[ESCALATION] Error triggering escalation for budget request {budget_request_id}: {str(e)}")
        return False


def send_escalation_notification(user, message):
    """
    Send escalation notification to a specific user using the notification dispatcher
    
    This uses the existing notification system from user_preferences
    """
    try:
        # Use the notification dispatcher service
        dispatcher = NotificationDispatcher()
        
        # Trigger type for budget escalation
        trigger_type = 'budget_escalation'
        
        # Dispatch the notification
        result = dispatcher.dispatch_mock_notification(
            user_id=user.id,
            trigger_type=trigger_type,
            message=message
        )
        
        # Print mock logs to console
        for log_line in result.get('mock_logs', []):
            print(log_line)
        
        # Check if notification was sent successfully
        if 'error' in result:
            print(f"[ESCALATION NOTIFICATION] Error for user {user.username}: {result['error']}")
            return False
        
        if result.get('quiet_hours_active', False):
            print(f"[ESCALATION NOTIFICATION] Skipped for user {user.username} - quiet hours active")
            return False
        
        channels_notified = result.get('channels_would_notify', [])
        print(f"[ESCALATION NOTIFICATION] Successfully notified user {user.username} via: {channels_notified}")
        
        return True
        
    except Exception as e:
        print(f"[ESCALATION NOTIFICATION] Error sending notification to user {user.username}: {str(e)}")
        return False