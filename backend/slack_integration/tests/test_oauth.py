from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import patch
from core.models import Organization, CustomUser
from slack_integration.models import SlackWorkspaceConnection
from slack_integration.views import SLACK_OAUTH_STATE_SALT
from django.core.exceptions import ValidationError
from django.core import signing

class TestSlackOAuth(APITestCase):
    
    def setUp(self):
        # Setup similar to our previous fixtures
        self.organization = Organization.objects.create(name="Test Org", slug="test-org")
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="password123",
            organization=self.organization
        )

    def test_oauth_init_url(self):
        """
        Test generating the Slack OAuth URL.
        """
        self.client.force_authenticate(user=self.user)
        url = reverse('slack-oauth-init')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('url', response.data)
        self.assertIn('state', response.data)
        self.assertIn('client_id=', response.data['url'])
        self.assertIn('scope=', response.data['url'])
        self.assertIn('state=', response.data['url'])
        payload = signing.loads(response.data['state'], salt=SLACK_OAUTH_STATE_SALT, max_age=600)
        self.assertEqual(payload['user_id'], self.user.id)

    @patch('slack_integration.views.exchange_oauth_code')
    def test_oauth_callback_success(self, mock_exchange):
        """
        Test successful OAuth callback handling.
        """
        self.client.force_authenticate(user=self.user)
        
        # Mock Slack response
        mock_exchange.return_value = {
            "ok": True,
            "access_token": "xoxb-new-token",
            "team": {"id": "T_NEW", "name": "New Team"},
            "authed_user": {"id": "U_INSTALLER"},
            "incoming_webhook": {
                "channel": "#general",
                "channel_id": "C_GENERAL",
                "configuration_url": "https://..."
            }
        }
        
        state = signing.dumps({"user_id": self.user.id, "nonce": "nonce"}, salt=SLACK_OAUTH_STATE_SALT)
        url = reverse('slack-oauth-callback')
        data = {'code': 'valid_code', 'state': state}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['success'])
        
        # Verify DB
        connection = SlackWorkspaceConnection.objects.get(organization=self.organization)
        self.assertEqual(connection.slack_team_id, "T_NEW")
        self.assertEqual(connection.default_channel_id, "C_GENERAL")
        # Token should be encrypted, but decrypted value matches
        self.assertEqual(connection.get_access_token(), "xoxb-new-token")

    @patch('slack_integration.views.exchange_oauth_code')
    def test_oauth_callback_failure(self, mock_exchange):
        """
        Test OAuth callback failure from Slack.
        """
        self.client.force_authenticate(user=self.user)
        
        # Mock validation error from service
        # Mock validation error from service
        mock_exchange.side_effect = ValidationError("Slack OAuth failed")
        
        state = signing.dumps({"user_id": self.user.id, "nonce": "nonce"}, salt=SLACK_OAUTH_STATE_SALT)
        url = reverse('slack-oauth-callback')
        data = {'code': 'invalid_code', 'state': state}
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_oauth_callback_rejects_invalid_state(self):
        """
        Test OAuth callback rejects an invalid state payload.
        """
        self.client.force_authenticate(user=self.user)

        url = reverse('slack-oauth-callback')
        data = {'code': 'valid_code', 'state': 'invalid-state'}
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'Invalid Slack OAuth state.')

    def test_connection_status_disconnected_shape(self):
        """
        Test disconnected status returns the same field names as the connected serializer.
        """
        self.client.force_authenticate(user=self.user)

        url = reverse('slack-connection-status')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                'is_connected': False,
                'slack_team_id': None,
                'slack_team_name': None,
                'default_channel_id': None,
                'default_channel_name': None,
                'is_active': False,
            }
        )

    def test_revoke_connection(self):
        """
        Test revoking (disconnecting) the Slack integration.
        """
        self.client.force_authenticate(user=self.user)
        
        # Ensure connection exists first
        SlackWorkspaceConnection.objects.create(
            organization=self.organization,
            slack_team_id="T_REVOKE",
            slack_team_name="Revoke Team",
            encrypted_access_token="encrypted",
            is_active=True
        )
        
        url = reverse('slack-disconnect')
        
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify it's inactive
        conn = SlackWorkspaceConnection.objects.get(slack_team_id="T_REVOKE")
        self.assertFalse(conn.is_active)
