
from django.test import TestCase
from unittest.mock import patch, MagicMock
from slack_integration.services import send_slack_message, check_and_send_reminders
from slack_integration.models import encrypt_token, decrypt_token, SlackWorkspaceConnection, NotificationPreference
from core.models import Organization, Project, CustomUser
from task.models import Task
from django.utils import timezone
from datetime import timedelta

class TestSlackServices(TestCase):
    
    def test_encryption_decryption(self):
        """
        Test that tokens can be encrypted and correctly decrypted.
        """
        original_token = "xoxb-12345-abcdef"
        encrypted = encrypt_token(original_token)
        
        self.assertNotEqual(original_token, encrypted)
        
        decrypted = decrypt_token(encrypted)
        self.assertEqual(decrypted, original_token)

    def test_decrypt_none(self):
        self.assertIsNone(decrypt_token(None))

    @patch('slack_integration.services.requests.post')
    def test_send_slack_message_success(self, mock_post):
        """
        Test sending a message successfully.
        """
        # Mock connection object
        connection = MagicMock(spec=SlackWorkspaceConnection)
        connection.get_access_token.return_value = "xoxb-token"
        connection.id = 1 # ID required for logging purposes, even in case of success.
        
        # Mock requests response
        mock_response = MagicMock()
        mock_response.json.return_value = {"ok": True}
        mock_response.raise_for_status.return_value = None
        mock_post.return_value = mock_response
        
        result = send_slack_message(connection, "C123", "Hello World")
        
        self.assertTrue(result)
        mock_post.assert_called_once()
        args, kwargs = mock_post.call_args
        self.assertEqual(kwargs['json']['channel'], "C123")
        self.assertEqual(kwargs['json']['text'], "Hello World")
        self.assertEqual(kwargs['headers']['Authorization'], "Bearer xoxb-token")

    @patch('slack_integration.services.requests.post')
    def test_send_slack_message_api_error(self, mock_post):
        """
        Test handling of Slack API errors.
        """
        connection = MagicMock(spec=SlackWorkspaceConnection)
        connection.get_access_token.return_value = "xoxb-token"
        
        mock_response = MagicMock()
        mock_response.json.return_value = {"ok": False, "error": "channel_not_found"}
        mock_post.return_value = mock_response
        
        result = send_slack_message(connection, "C123", "Hello")
        
        self.assertFalse(result)

    def test_send_slack_message_no_token(self):
        """
        Test graceful exit if token is missing.
        """
        connection = MagicMock(spec=SlackWorkspaceConnection)
        connection.get_access_token.return_value = None
        connection.id = 1
        
        result = send_slack_message(connection, "C123", "Hello")
        
        
        self.assertFalse(result)

    @patch('slack_integration.services.send_slack_message')
    def test_deadline_reminders(self, mock_send):
        """
        Test that reminders are sent for tasks due tomorrow.
        """
        # Setup
        org = Organization.objects.create(name="Reminder Org", slug="reminder-org")
        proj = Project.objects.create(name="Reminder Proj", organization=org)
        user = CustomUser.objects.create_user(email="u@example.com", username="u", password="p", organization=org)
        
        conn = SlackWorkspaceConnection.objects.create(
            organization=org,
            slack_team_id="T_REMIND",
            encrypted_access_token="encrypted"
        )
        
        # Prefs
        NotificationPreference.objects.create(
            connection=conn,
            project=proj,
            event_type=NotificationPreference.EventType.DEADLINE_REMINDER,
            slack_channel_id="C_REMIND"
        )
        
        # Task due tomorrow
        tomorrow = timezone.now().date() + timedelta(days=1)
        mock_send.return_value = True

        # CASE 1: Task due tomorrow -> Should remind
        t1 = Task.objects.create(
            summary="Due Tomorrow",
            project=proj,
            owner=user,
            due_date=tomorrow, # Verified: Field exists
            status=Task.Status.SUBMITTED
        )
        
        # CASE 2: Task due later -> No remind
        t2 = Task.objects.create(
            summary="Due Later",
            project=proj,
            owner=user,
            due_date=tomorrow + timedelta(days=1),
            status=Task.Status.SUBMITTED
        )

        # CASE 3: Task due tomorrow but DONE -> No remind
        t3 = Task.objects.create(
            summary="Done Tomorrow",
            project=proj,
            owner=user,
            due_date=tomorrow,
            status=Task.Status.APPROVED
        )
        
        # Execute
        count = check_and_send_reminders()
        
        self.assertEqual(count, 1)
        mock_send.assert_called_once()
        self.assertIn("Due Tomorrow", mock_send.call_args[0][2])
