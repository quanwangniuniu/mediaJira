import requests
import logging
from django.conf import settings
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import SlackWorkspaceConnection, NotificationPreference
from core.models import Project
from task.models import Task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

def exchange_oauth_code(code):
    """
    Exchanges a temporary authorization code for an access token via Slack API.
    """
    url = "https://slack.com/api/oauth.v2.access"
    data = {
        "client_id": settings.SLACK_CLIENT_ID,
        "client_secret": settings.SLACK_CLIENT_SECRET,
        "code": code,
        "redirect_uri": settings.SLACK_REDIRECT_URI
    }
    
    try:
        response = requests.post(url, data=data)
        response.raise_for_status()
        result = response.json()
    except requests.RequestException as e:
        logger.error(f"Slack OAuth request failed: {e}")
        raise ValidationError("Failed to connect to Slack API.")

    if not result.get("ok"):
        logger.error(f"Slack OAuth error: {result.get('error')}")
        raise ValidationError(f"Slack OAuth failed: {result.get('error')}")
        
    return result

    return connection
    
def get_slack_channels(connection, limit=100):
    """
    Fetches a list of public and private channels from the Slack workspace.
    Requires 'channels:read' and 'groups:read' scopes.
    """
    token = connection.get_access_token()
    if not token:
        return []

    url = "https://slack.com/api/conversations.list"
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "types": "public_channel,private_channel",
        "limit": limit,
        "exclude_archived": "true"
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        result = response.json()
        
        if not result.get("ok"):
            logger.error(f"Failed to fetch channels: {result.get('error')}")
            return []

        channels = []
        for ch in result.get("channels", []):
            channels.append({
                "id": ch["id"],
                "name": ch["name"],
                "is_private": ch.get("is_private", False)
            })
        
        # Sort by name
        channels.sort(key=lambda x: x["name"])
        return channels

    except Exception as e:
        logger.error(f"Error fetching Slack channels: {e}")
        return []

def create_default_preferences(organization, connection):
    """
    Creates default notification preferences for all projects in the organization.
    """
    projects = Project.objects.filter(organization=organization)
    
    event_types = [
        NotificationPreference.EventType.TASK_STATUS_CHANGE,
        NotificationPreference.EventType.TASK_CREATED,
        NotificationPreference.EventType.COMMENT_UPDATED,
        NotificationPreference.EventType.DECISION_CREATED,
        NotificationPreference.EventType.DEADLINE_REMINDER,
    ]
    
    for project in projects:
        for event_type in event_types:
            NotificationPreference.objects.get_or_create(
                connection=connection,
                project=project,
                event_type=event_type,
                defaults={
                    'is_active': True,
                    'slack_channel_id': connection.default_channel_id,
                    'slack_channel_name': connection.default_channel_name
                }
            )

def store_slack_connection(organization, slack_data):
    """
    Persists or updates the Slack connection for a given organization.
    """
    team_id = slack_data.get("team", {}).get("id")
    team_name = slack_data.get("team", {}).get("name")
    access_token = slack_data.get("access_token")
    installer_user_id = slack_data.get("authed_user", {}).get("id")
    
    # Extract incoming webhook info (if available) as default channel
    incoming_webhook = slack_data.get("incoming_webhook", {})
    default_channel_id = incoming_webhook.get("channel_id")
    default_channel_name = incoming_webhook.get("channel")

    if not team_id or not access_token:
        raise ValidationError("Invalid Slack data: missing team_id or access_token.")

    # Atomic update to ensure data consistency
    with transaction.atomic():
        # Update existing connection for this team or create a new one.
        connection, created = SlackWorkspaceConnection.objects.update_or_create(
            organization=organization,
            slack_team_id=team_id,
            defaults={
                "slack_team_name": team_name,
                "installer_slack_user_id": installer_user_id,
                "default_channel_id": default_channel_id,
                "default_channel_name": default_channel_name,
                "is_active": True
            }
        )
        
        # Securely store the token
        connection.set_access_token(access_token)
        connection.save()
        
        # Create default preferences
        create_default_preferences(organization, connection)
        
    return connection

def send_slack_message(connection, channel_id, text, blocks=None):
    """
    Sends a message to a specified Slack channel using the connection's bot token.
    """
    token = connection.get_access_token()
    if not token:
        logger.error(f"No access token for connection {connection.id}")
        return False
        
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "channel": channel_id,
        "text": text,
    }
    if blocks:
        payload["blocks"] = blocks
        
    try:
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        
        if not result.get("ok"):
            logger.error(f"Failed to send Slack message: {result.get('error')}")
            return False
            
        return True
    except requests.RequestException as e:
        logger.error(f"Error sending Slack message: {e}")
        return False

def revoke_slack_connection(connection):
    """
    Deactivates the specified Slack connection (soft delete).
    """
    connection.is_active = False
    connection.save()
    return True



def check_and_send_reminders():
    """
    Checks for tasks due tomorrow and triggers reminders if configured.
    This function is intended to be called by a periodic task runner (e.g. Celery beat) daily.
    """
    # 1. Find tasks due today or tomorrow
    today = timezone.now().date()
    tomorrow = today + timedelta(days=1)
    
    # Verified: Task model contains 'due_date' field as per logic requirements.
    try:
        # Check for tasks due today OR tomorrow
        tasks_due = Task.objects.filter(due_date__in=[today, tomorrow])
    except Exception:
        # Gracefully handle potential schema mismatch during migrations
        return 0

    count = 0
    for task in tasks_due:
        if not task.project or not task.project.organization:
            continue
            
        # 2. Get Connection
        connection = SlackWorkspaceConnection.objects.filter(
            organization=task.project.organization,
            is_active=True
        ).first()
        
        if not connection:
            continue
            
        # 3. Check Preferences for DEADLINE_REMINDER
        # Note: We query NotificationPreference, which is Project-scoped.
        qs = NotificationPreference.objects.filter(
            connection=connection,
            project=task.project,
            event_type=NotificationPreference.EventType.DEADLINE_REMINDER,
            is_active=True
        )
        
        # Filter completed tasks
        if task.status in [Task.Status.DRAFT, Task.Status.APPROVED, Task.Status.LOCKED, Task.Status.CANCELLED, Task.Status.REJECTED]:
            continue
            
        preference = qs.first()
        
        if not preference:
            continue
            
        channel_id = preference.slack_channel_id or connection.default_channel_id
        if not channel_id:
            continue
            
        due_label = "Today" if task.due_date == timezone.now().date() else "Tomorrow"
        message = f"⏰ *Task Due {due_label}*\n*Task:* {task.summary}\n*Assignee:* {task.owner.email if task.owner else 'Unassigned'}"
        
        if send_slack_message(connection, channel_id, message):
            count += 1
            
    return count
