from django.test import TestCase
from unittest.mock import patch
from core.models import Organization, Project, CustomUser
from task.models import Task, ApprovalRecord, TaskComment
from decision.models import Decision
from slack_integration.models import NotificationPreference, SlackWorkspaceConnection

class TestSlackSignals(TestCase):
    
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org", slug="test-org")
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="password123",
            organization=self.organization
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.slack_connection = SlackWorkspaceConnection.objects.create(
            organization=self.organization,
            slack_team_id="T123456",
            slack_team_name="Test Workspace",
            default_channel_id="C123456",
            default_channel_name="general"
        )
    
    def _create_pref(self, event_type, status=None):
        NotificationPreference.objects.create(
            connection=self.slack_connection,
            project=self.project,
            event_type=event_type,
            task_status=status,
            is_active=True,
            slack_channel_id="C_TEST"
        )

    @patch('slack_integration.signals.send_slack_message')
    def test_task_creation(self, mock_send):
        """Test TASK_CREATED event"""
        self._create_pref(NotificationPreference.EventType.TASK_CREATED)
        
        Task.objects.create(
            summary="New Task",
            project=self.project,
            owner=self.user
        )
        
        mock_send.assert_called_once()
        self.assertIn("New Task Created", mock_send.call_args[0][2])

    @patch('slack_integration.signals.send_slack_message')
    def test_task_status_change(self, mock_send):
        """Test TASK_STATUS_CHANGE event"""
        self._create_pref(NotificationPreference.EventType.TASK_STATUS_CHANGE)
        
        task = Task.objects.create(
            summary="Status Task",
            project=self.project, 
            owner=self.user,
            status=Task.Status.DRAFT
        )
        # Creation should NOT trigger status change notification (unless created pref exists, which doesn't here)
        mock_send.assert_not_called()
        
        # Update status
        task.submit()
        task.save()
        
        mock_send.assert_called_once()
        msg = mock_send.call_args[0][2]
        self.assertIn("Status Updated", msg)
        self.assertIn("Submitted", msg)

    @patch('slack_integration.signals.send_slack_message')
    def test_comment_added(self, mock_send):
        """Test COMMENT_UPDATED event"""
        self._create_pref(NotificationPreference.EventType.COMMENT_UPDATED)
        
        task = Task.objects.create(
            summary="Comment Task",
            project=self.project,
            owner=self.user
        )
        
        TaskComment.objects.create(
            task=task,
            user=self.user,
            body="Important update"
        )
        
        mock_send.assert_called_once()
        self.assertIn("New Comment", mock_send.call_args[0][2])
        self.assertIn("Important update", mock_send.call_args[0][2])

    @patch('slack_integration.signals.send_slack_message')
    def test_no_notification_without_pref(self, mock_send):
        """Verify silence when no preference exists"""
        # Create task (no pref)
        task = Task.objects.create(
            summary="Silent",
            project=self.project,
            owner=self.user
        )
        mock_send.assert_not_called()
        
        # Update status (no pref)
        task.submit()
        task.save()
        mock_send.assert_not_called()
        
        # Add comment (no pref)
        TaskComment.objects.create(task=task, user=self.user, body="Shhh")
        mock_send.assert_not_called()

    @patch('slack_integration.signals.send_slack_message')
    def test_status_specific_preference(self, mock_send):
        """Test filtering by specific status"""
        # Only notify if status becomes APPROVED
        self._create_pref(NotificationPreference.EventType.TASK_STATUS_CHANGE, status=Task.Status.APPROVED)
        
        task = Task.objects.create(
            summary="Approval Task", 
            project=self.project, 
            owner=self.user,
            status=Task.Status.UNDER_REVIEW
        )
        
        # Change to REJECTED (Should NOT notify)
        task.reject()
        task.save()
        mock_send.assert_not_called()
        
        # Change to APPROVED (Should notify)
        task.revise()
        task.save()
        task.submit()
        task.save()
        task.start_review()
        task.save()
        task.approve()
        task.save()
        mock_send.assert_called_once()
        self.assertIn("Approved", mock_send.call_args[0][2])

    @patch('slack_integration.signals.send_slack_message')
    def test_decision_creation(self, mock_send):
        """Test DECISION_CREATED event"""
        # Decisions don't have projects, so we just rely on Org default channel from connection
        self._create_pref(NotificationPreference.EventType.DECISION_CREATED)
        
        Decision.objects.create(
            title="New Decision",
            author=self.user,
            risk_level=Decision.RiskLevel.HIGH,
            confidence=5,
            context_summary="Context",
            reasoning="Reasoning"
        )
        
        mock_send.assert_called_once()
        self.assertIn("New Decision Created", mock_send.call_args[0][2])
