from django.test import TestCase
from klaviyo.models import EmailDraft, Workflow


class ModelRelationshipTests(TestCase):

    def test_workflow_draft_relationship(self):
        draft = EmailDraft.objects.create(
            name="Test",
            subject="Hello",
            status=getattr(EmailDraft, "STATUS_DRAFT", "draft")
        )

        workflow = Workflow.objects.create(
            name="WF",
            trigger_draft_status=getattr(EmailDraft, "STATUS_READY", "ready"),
            is_active=True,
        )

        workflow.email_drafts.add(draft)

        # Assertion
        self.assertIn(draft, workflow.email_drafts.all())
