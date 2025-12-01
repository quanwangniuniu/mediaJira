# backend/klaviyo/tests/test_triggers.py

from django.test import TestCase

from klaviyo.models import EmailDraft, Workflow, WorkflowExecutionLog


class WorkflowTriggerTests(TestCase):
    """
    Tests for EmailDraft -> Workflow trigger logic and WorkflowExecutionLog.
    """

    def _create_draft(self, status=None) -> EmailDraft:
        """
        Helper to create a simple EmailDraft with a given status.
        """
        if status is None:
            status = getattr(EmailDraft, "STATUS_DRAFT", "draft")

        return EmailDraft.objects.create(
            name="Test Draft",
            subject="Test Subject",
            status=status,
        )

    def _create_workflow(
        self,
        *,
        trigger_status=None,
        is_active=True,
        drafts=None,
    ) -> Workflow:
        """
        Helper to create a Workflow and optionally link drafts.
        """
        if trigger_status is None:
            # Default to "ready" trigger if available, otherwise fall back to raw string
            trigger_status = getattr(EmailDraft, "STATUS_READY", "ready")

        workflow = Workflow.objects.create(
            name="Test Workflow",
            is_active=is_active,
            trigger_draft_status=trigger_status,
        )

        if drafts:
            workflow.email_drafts.add(*drafts)

        return workflow

    # ------------------------------------------------------------------ #
    # 1. Positive path: draft status changes from draft -> ready
    # ------------------------------------------------------------------ #
    def test_trigger_log_created_when_draft_status_changes_to_ready(self):
        """
        When a draft moves from STATUS_DRAFT -> STATUS_READY and is linked to
        an active workflow that listens to that status, a WorkflowExecutionLog
        should be created.
        """
        draft = self._create_draft(status=getattr(EmailDraft, "STATUS_DRAFT", "draft"))
        workflow = self._create_workflow(
            trigger_status=getattr(EmailDraft, "STATUS_READY", "ready"),
            is_active=True,
            drafts=[draft],
        )

        # Change status to ready -> should fire trigger
        draft.status = getattr(EmailDraft, "STATUS_READY", "ready")
        draft.save()

        logs = WorkflowExecutionLog.objects.all()
        self.assertEqual(logs.count(), 1)

        log = logs.first()
        self.assertEqual(log.workflow_id, workflow.id)
        self.assertEqual(log.email_draft_id, draft.id)
        self.assertEqual(log.trigger_type, "draft_status_change")
        self.assertEqual(log.status, "executed")

    # ------------------------------------------------------------------ #
    # 2. No-op: status does not change -> no trigger
    # ------------------------------------------------------------------ #
    def test_no_log_when_status_does_not_change(self):
        """
        Saving a draft without changing its status must NOT create logs.
        """
        draft = self._create_draft(status=getattr(EmailDraft, "STATUS_DRAFT", "draft"))
        self._create_workflow(
            trigger_status=getattr(EmailDraft, "STATUS_READY", "ready"),
            is_active=True,
            drafts=[draft],
        )

        # Save without status change
        draft.save()

        self.assertEqual(
            WorkflowExecutionLog.objects.count(),
            0,
            "Saving without status change should not create a log",
        )

    # ------------------------------------------------------------------ #
    # 3. Inactive workflows should not trigger
    # ------------------------------------------------------------------ #
    def test_inactive_workflow_does_not_trigger(self):
        """
        Workflows with is_active=False must not generate logs even if the
        status matches.
        """
        draft = self._create_draft(status=getattr(EmailDraft, "STATUS_DRAFT", "draft"))
        self._create_workflow(
            trigger_status=getattr(EmailDraft, "STATUS_READY", "ready"),
            is_active=False,
            drafts=[draft],
        )

        draft.status = getattr(EmailDraft, "STATUS_READY", "ready")
        draft.save()

        self.assertEqual(
            WorkflowExecutionLog.objects.count(),
            0,
            "Inactive workflows should not create logs",
        )

    # ------------------------------------------------------------------ #
    # 4. Only workflows with matching trigger_draft_status fire
    # ------------------------------------------------------------------ #
    def test_only_matching_trigger_status_workflows_are_triggered(self):
        """
        Only workflows whose trigger_draft_status equals the new draft status
        should be triggered.
        """
        draft = self._create_draft(status=getattr(EmailDraft, "STATUS_DRAFT", "draft"))

        # Workflow that listens to "ready" (should trigger)
        wf_matching = self._create_workflow(
            trigger_status=getattr(EmailDraft, "STATUS_READY", "ready"),
            is_active=True,
            drafts=[draft],
        )

        # Workflow that listens to "scheduled" (should NOT trigger)
        scheduled_status = getattr(EmailDraft, "STATUS_SCHEDULED", "scheduled")
        self._create_workflow(
            trigger_status=scheduled_status,
            is_active=True,
            drafts=[draft],
        )

        draft.status = getattr(EmailDraft, "STATUS_READY", "ready")
        draft.save()

        logs = WorkflowExecutionLog.objects.all()
        self.assertEqual(logs.count(), 1)
        self.assertEqual(logs.first().workflow_id, wf_matching.id)

    # ------------------------------------------------------------------ #
    # 5. Trigger data structure sanity check
    # ------------------------------------------------------------------ #
    def test_trigger_data_contains_expected_fields(self):
        """
        trigger_data JSON field should contain core fields such as
        from_status, to_status, workflow_id and draft_id.
        """
        draft = self._create_draft(status=getattr(EmailDraft, "STATUS_DRAFT", "draft"))
        self._create_workflow(
            trigger_status=getattr(EmailDraft, "STATUS_READY", "ready"),
            is_active=True,
            drafts=[draft],
        )

        draft.status = getattr(EmailDraft, "STATUS_READY", "ready")
        draft.save()

        log = WorkflowExecutionLog.objects.first()
        self.assertIsNotNone(log)

        data = log.trigger_data or {}
        for key in ["from_status", "to_status", "workflow_id", "draft_id"]:
            self.assertIn(
                key,
                data,
                f"trigger_data should contain '{key}' but it was missing",
            )
