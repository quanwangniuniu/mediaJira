import requests
import logging
from django.conf import settings
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import SlackWorkspaceConnection

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
