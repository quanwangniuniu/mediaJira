from unittest.mock import patch

from django.test import TestCase

from core.models import CustomUser, Organization, Project
from decision.models import Decision, Option, Signal
from slack_integration.models import NotificationPreference, SlackWorkspaceConnection
from task.models import ApprovalRecord, Task, TaskComment


class TestSlackSignals(TestCase):
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org", slug="test-org")
        self.user = CustomUser.objects.create_user(
            email="test@example.com",
            username="testuser",
            password="password123",
            organization=self.organization,
        )
        self.reviewer = CustomUser.objects.create_user(
            email="reviewer@example.com",
            username="reviewer",
            password="password123",
            organization=self.organization,
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization,
        )
        self.slack_connection = SlackWorkspaceConnection.objects.create(
            organization=self.organization,
            slack_team_id="T123456",
            slack_team_name="Test Workspace",
            encrypted_access_token="encrypted",
            default_channel_id="C123456",
            default_channel_name="general",
        )

    def _create_pref(self, event_type, status=None, channel_id="C_TEST", channel_name="test"):
        return NotificationPreference.objects.create(
            connection=self.slack_connection,
            project=self.project,
            event_type=event_type,
            task_status=status,
            is_active=True,
            slack_channel_id=channel_id,
            slack_channel_name=channel_name,
        )

    def _create_task(self, summary="Task", status=Task.Status.DRAFT, **kwargs):
        defaults = {
            "summary": summary,
            "project": self.project,
            "owner": self.user,
            "status": status,
        }
        defaults.update(kwargs)
        return Task.objects.create(**defaults)

    def _create_commit_ready_decision(
        self,
        title="New Decision",
        risk_level=Decision.RiskLevel.LOW,
        project=None,
        author=None,
    ):
        decision = Decision.objects.create(
            title=title,
            author=author or self.user,
            project=project if project is not None else self.project,
            risk_level=risk_level,
            confidence=5,
            context_summary="Context",
            reasoning="Reasoning",
        )
        Signal.objects.create(
            decision=decision,
            author=self.user,
            display_text="Signal context",
        )
        Option.objects.create(decision=decision, text="Option A", is_selected=True, order=1)
        Option.objects.create(decision=decision, text="Option B", is_selected=False, order=2)
        return decision

    @patch("slack_integration.signals.send_slack_message")
    def test_task_created_notification_fires_when_task_is_submitted_from_draft(self, mock_send):
        """TASK_CREATED should fire when a draft task is submitted."""
        self._create_pref(NotificationPreference.EventType.TASK_CREATED)

        task = self._create_task(summary="Submitted Task")

        mock_send.assert_not_called()

        task.submit()
        task.save()

        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[0][1], "C_TEST")
        self.assertIn("New Task Submitted", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_task_created_notification_fires_for_task_born_submitted(self, mock_send):
        """TASK_CREATED should also fire for tasks created directly in SUBMITTED."""
        self._create_pref(NotificationPreference.EventType.TASK_CREATED)

        self._create_task(summary="Direct Submit Task", status=Task.Status.SUBMITTED)

        mock_send.assert_called_once()
        self.assertIn("New Task Submitted", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_task_under_review_notification_uses_status_change_preference(self, mock_send):
        """Only supported review-entry transitions should trigger TASK_STATUS_CHANGE."""
        self._create_pref(NotificationPreference.EventType.TASK_STATUS_CHANGE)

        task = self._create_task(summary="Review Task", current_approver=self.reviewer)

        task.submit()
        task.save()

        mock_send.assert_not_called()

        task.start_review()
        task.save()

        mock_send.assert_called_once()
        self.assertIn("Task Now Under Review", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_task_forward_notification_uses_status_change_preference(self, mock_send):
        """APPROVED -> UNDER_REVIEW should notify as a forwarded task."""
        self._create_pref(NotificationPreference.EventType.TASK_STATUS_CHANGE)

        task = self._create_task(
            summary="Forwarded Task",
            status=Task.Status.APPROVED,
            current_approver=self.reviewer,
            current_approval_step=2,
        )

        task.forward_to_next()
        task.save()

        mock_send.assert_called_once()
        self.assertIn("Task Forwarded to Next Approver", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_task_cancel_notification_uses_status_change_preference(self, mock_send):
        """Supported cancel transitions should notify through TASK_STATUS_CHANGE."""
        self._create_pref(NotificationPreference.EventType.TASK_STATUS_CHANGE)

        task = self._create_task(summary="Cancelled Task", status=Task.Status.SUBMITTED)

        task.cancel()
        task.save()

        mock_send.assert_called_once()
        self.assertIn("Task Cancelled", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_status_specific_preference_wins_over_generic_preference(self, mock_send):
        """Exact task_status matches should beat generic TASK_STATUS_CHANGE rules."""
        self._create_pref(
            NotificationPreference.EventType.TASK_STATUS_CHANGE,
            channel_id="C_GENERIC",
            channel_name="generic",
        )
        self._create_pref(
            NotificationPreference.EventType.TASK_STATUS_CHANGE,
            status=Task.Status.CANCELLED,
            channel_id="C_CANCELLED",
            channel_name="cancelled",
        )

        task = self._create_task(summary="Specific Status Task", status=Task.Status.SUBMITTED)

        task.cancel()
        task.save()

        mock_send.assert_called_once()
        self.assertEqual(mock_send.call_args[0][1], "C_CANCELLED")
        self.assertIn("Task Cancelled", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_task_approval_notification_comes_from_approval_record(self, mock_send):
        """APPROVED itself is silent; ApprovalRecord creation is what notifies Slack."""
        self._create_pref(NotificationPreference.EventType.TASK_STATUS_CHANGE)

        task = self._create_task(summary="Approval Task", status=Task.Status.UNDER_REVIEW)

        task.approve()
        task.save()

        mock_send.assert_not_called()

        ApprovalRecord.objects.create(
            task=task,
            approved_by=self.reviewer,
            is_approved=True,
            comment="Looks good",
            step_number=1,
        )

        mock_send.assert_called_once()
        self.assertIn("Task Approved", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_comment_notification_skips_draft_and_fires_after_submission(self, mock_send):
        """Comments on drafts stay silent until the task leaves DRAFT."""
        self._create_pref(NotificationPreference.EventType.COMMENT_UPDATED)

        task = self._create_task(summary="Comment Task")

        TaskComment.objects.create(
            task=task,
            user=self.user,
            body="Draft comment",
        )

        mock_send.assert_not_called()

        task.submit()
        task.save()

        TaskComment.objects.create(
            task=task,
            user=self.user,
            body="Submitted comment",
        )

        mock_send.assert_called_once()
        self.assertIn("Comment on", mock_send.call_args[0][2])
        self.assertIn("Submitted comment", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_no_notification_without_preference(self, mock_send):
        """Slack signals should stay silent when the project has no active preference."""
        task = self._create_task(summary="Silent Task")

        task.submit()
        task.save()

        task.start_review()
        task.save()

        TaskComment.objects.create(task=task, user=self.user, body="Still quiet")

        decision = self._create_commit_ready_decision(title="Silent Decision")
        decision.commit(user=self.user)
        decision.save()

        mock_send.assert_not_called()

    @patch("slack_integration.signals.send_slack_message")
    def test_decision_commit_notification_fires_when_decision_leaves_draft(self, mock_send):
        """Low-risk decisions should notify when DRAFT -> COMMITTED."""
        self._create_pref(NotificationPreference.EventType.DECISION_CREATED)

        decision = self._create_commit_ready_decision()

        mock_send.assert_not_called()

        decision.commit(user=self.user)
        decision.save()

        mock_send.assert_called_once()
        self.assertIn("New Decision Committed", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_decision_submit_for_approval_notification_fires_when_required(self, mock_send):
        """High-risk decisions should notify when DRAFT -> AWAITING_APPROVAL."""
        self._create_pref(NotificationPreference.EventType.DECISION_CREATED)

        decision = self._create_commit_ready_decision(
            title="Approval Decision",
            risk_level=Decision.RiskLevel.HIGH,
        )

        decision.submit_for_approval(user=self.user)
        decision.save()

        mock_send.assert_called_once()
        self.assertIn("Decision Submitted for Approval", mock_send.call_args[0][2])

    @patch("slack_integration.signals.send_slack_message")
    def test_decision_approval_notification_fires_when_awaiting_decision_is_approved(self, mock_send):
        """AWAITING_APPROVAL -> COMMITTED should emit the approved decision message."""
        self._create_pref(NotificationPreference.EventType.DECISION_CREATED)

        decision = self._create_commit_ready_decision(
            title="Approved Decision",
            risk_level=Decision.RiskLevel.HIGH,
        )
        decision.submit_for_approval(user=self.user)
        decision.save()

        mock_send.reset_mock()

        decision.approve(user=self.reviewer)
        decision.save()

        mock_send.assert_called_once()
        self.assertIn("Decision Approved", mock_send.call_args[0][2])
