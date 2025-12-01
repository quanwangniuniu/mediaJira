from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from klaviyo.models import EmailDraft, Workflow


DRAFTS_URL = "/api/klaviyo/klaviyo-drafts/"
WORKFLOWS_URL = "/api/klaviyo/klaviyo-workflows/"


class EmailDraftAPITests(TestCase):
    """
    API tests for EmailDraft CRUD.
    """

    def setUp(self) -> None:
        self.client = APIClient()

        User = get_user_model()
        self.user = User.objects.create_user(
            email="test_klaviyo_draft@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.status_draft = getattr(EmailDraft, "STATUS_DRAFT", "draft")
        self.status_ready = getattr(EmailDraft, "STATUS_READY", "ready")

    # ------------------------------------------------------------------ #
    # Create
    # ------------------------------------------------------------------ #
    def test_create_email_draft(self):
        payload = {
            "name": "Welcome Email",
            "subject": "Welcome to MediaJira",
            "status": self.status_draft,
        }

        response = self.client.post(DRAFTS_URL, payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], payload["name"])
        self.assertEqual(response.data["subject"], payload["subject"])
        self.assertEqual(response.data["status"], payload["status"])

        self.assertEqual(
            EmailDraft.objects.filter(user=self.user).count(),
            1,
        )

    # ------------------------------------------------------------------ #
    # List
    # ------------------------------------------------------------------ #
    def test_list_email_drafts(self):
        EmailDraft.objects.create(
            name="Draft 1",
            subject="S1",
            status=self.status_draft,
            user=self.user,
        )
        EmailDraft.objects.create(
            name="Draft 2",
            subject="S2",
            status=self.status_draft,
            user=self.user,
        )

        response = self.client.get(DRAFTS_URL, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("count", response.data)
        self.assertGreaterEqual(response.data["count"], 2)

    # ------------------------------------------------------------------ #
    # Retrieve
    # ------------------------------------------------------------------ #
    def test_retrieve_email_draft(self):
        draft = EmailDraft.objects.create(
            name="Retrieve Draft",
            subject="Retrieve Subject",
            status=self.status_draft,
            user=self.user,   
        )

        url = f"{DRAFTS_URL}{draft.id}/"
        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], draft.id)
        self.assertEqual(response.data["name"], "Retrieve Draft")

    # ------------------------------------------------------------------ #
    # Update / PATCH
    # ------------------------------------------------------------------ #
    def test_update_email_draft_status_via_patch(self):
        draft = EmailDraft.objects.create(
            name="Patch Draft",
            subject="Patch Subject",
            status=self.status_draft,
            user=self.user,  
        )

        url = f"{DRAFTS_URL}{draft.id}/"
        payload = {"status": self.status_ready}

        response = self.client.patch(url, payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], self.status_ready)

        draft.refresh_from_db()
        self.assertEqual(draft.status, self.status_ready)

    # ------------------------------------------------------------------ #
    # Delete
    # ------------------------------------------------------------------ #
    def test_delete_email_draft(self):
        draft = EmailDraft.objects.create(
            name="Delete Draft",
            subject="Delete Subject",
            status=self.status_draft,
            user=self.user,   
        )

        url = f"{DRAFTS_URL}{draft.id}/"
        response = self.client.delete(url, format="json")

        self.assertIn(response.status_code, (200, 204))

        qs = EmailDraft.objects.filter(pk=draft.id, user=self.user)
        if qs.exists():
            obj = qs.first()
            if hasattr(obj, "is_deleted"):
                self.assertTrue(obj.is_deleted)
        else:
            self.assertFalse(
                EmailDraft.objects.filter(pk=draft.id, user=self.user).exists()
            )


class WorkflowAPITests(TestCase):
    """
    API tests for Workflow CRUD and basic integration with drafts.
    """

    def setUp(self) -> None:
        self.client = APIClient()

        User = get_user_model()
        self.user = User.objects.create_user(
            email="test_klaviyo_workflow@example.com",
            password="testpass123",
        )
        self.client.force_authenticate(user=self.user)

        self.status_draft = getattr(EmailDraft, "STATUS_DRAFT", "draft")
        self.status_ready = getattr(EmailDraft, "STATUS_READY", "ready")

    # ------------------------------------------------------------------ #
    # Create
    # ------------------------------------------------------------------ #
    def test_create_workflow(self):
        payload = {
            "name": "Welcome Workflow",
            "is_active": True,
        }

        response = self.client.post(WORKFLOWS_URL, payload, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["name"], payload["name"])
        self.assertTrue(response.data["is_active"])

        self.assertEqual(Workflow.objects.count(), 1)

    # ------------------------------------------------------------------ #
    # List
    # ------------------------------------------------------------------ #
    def test_list_workflows(self):
        Workflow.objects.create(
            name="WF 1",
            is_active=True,
            trigger_draft_status=self.status_ready,
        )
        Workflow.objects.create(
            name="WF 2",
            is_active=False,
            trigger_draft_status=self.status_ready,
        )

        response = self.client.get(WORKFLOWS_URL, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertIn("count", response.data)
        self.assertGreaterEqual(response.data["count"], 2)

    # ------------------------------------------------------------------ #
    # Basic integration
    # ------------------------------------------------------------------ #
    def test_workflow_with_linked_draft_visible_in_api(self):
        draft = EmailDraft.objects.create(
            name="Linked Draft",
            subject="Linked Subject",
            status=self.status_draft,
            user=self.user,    
        )
        workflow = Workflow.objects.create(
            name="Linked WF",
            is_active=True,
            trigger_draft_status=self.status_ready,
        )
        workflow.email_drafts.add(draft)

        url = f"{WORKFLOWS_URL}{workflow.id}/"
        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], workflow.id)
        self.assertEqual(response.data["name"], "Linked WF")
