from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db import transaction
from ..models import (
    Campaign,
    CampaignSettings,
    Template,
    TemplateDefaultContent,
    CampaignRecipients,
    CampaignTracking,
    CampaignSocialCard,
    CampaignComment,
)

User = get_user_model()


class EmailDraftCRUDTests(APITestCase):
    """Test CRUD operations for email drafts API"""

    def setUp(self):
        # Clean up any existing campaigns and templates
        Campaign.objects.all().delete()
        Template.objects.all().delete()
        
        # Use unique usernames to avoid conflicts
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        
        self.user = User.objects.create_user(
            username=f"tester_{unique_id}",
            email=f"tester_{unique_id}@example.com",
            password="12345"
        )
        self.other_user = User.objects.create_user(
            username=f"other_{unique_id}",
            email=f"other_{unique_id}@example.com",
            password="12345"
        )

        self.client = APIClient()
        self.client.force_authenticate(self.user)

        self.list_url = reverse("email-draft-list")

        # Create a template for use in tests
        self.template = Template.objects.create(
            name="Welcome Template",
            type="custom",
            content_type="template"
        )
        TemplateDefaultContent.objects.create(
            template=self.template,
            sections={
                "header": "<h1>Welcome!</h1>",
                "body": "<p>Welcome to our newsletter</p>"
            },
            links={
                "css": "https://example.com/style.css"
            }
        )
        
        # Campaign creation payload
        self.create_payload = {
            "type": "regular",
            "status": "draft",
            "settings": {
                "subject_line": "Welcome Email",
                "preview_text": "Check out our latest updates",
                "from_name": "Marketing Team",
                "reply_to": "reply@example.com",
                "template_id": self.template.id,
            },
            "recipients": {
                "list_id": "abc123",
                "list_name": "Newsletter Subscribers",
                "list_is_active": True
            },
            "tracking": {
                "opens": True,
                "html_clicks": True,
                "text_clicks": False,
                "google_analytics": "GA-123456789"
            }
        }

    # --------------------------
    # CREATE TESTS
    # --------------------------
    def test_create_campaign_with_template(self):
        """Test creating campaign with template_id"""
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        self.assertIsNotNone(campaign)
        self.assertEqual(campaign.user, self.user)
        self.assertTrue(hasattr(campaign, "settings"))
        self.assertTrue(hasattr(campaign.settings, "template"))
        self.assertTrue(hasattr(campaign.settings.template, "default_content"))

        # Check nested content - template is cloned, so name should be subject_line
        self.assertEqual(campaign.settings.template.name, "Welcome Email")
        self.assertIn("header", campaign.settings.template.default_content.sections)
        self.assertEqual(campaign.settings.template.default_content.sections["header"], "<h1>Welcome!</h1>")

    def test_create_campaign_with_existing_template(self):
        """Test creating campaign with existing template ID"""
        # Create existing template
        template = Template.objects.create(
            name="Existing Template",
            type="basic",
            content_type="template"
        )
        TemplateDefaultContent.objects.create(
            template=template,
            sections={"body": "Existing content"},
            links={}
        )

        payload = {
            "type": "regular",
            "status": "draft",
            "settings": {
                "subject_line": "Test Subject",
                "from_name": "Test Company",
                "template_id": template.id
            }
        }

        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        self.assertNotEqual(campaign.settings.template, template)
        self.assertEqual(campaign.settings.template.name, "Test Subject")
        self.assertTrue(hasattr(campaign.settings.template, "default_content"))
        self.assertEqual(
            campaign.settings.template.default_content.sections,
            template.default_content.sections
        )

    def test_create_campaign_with_minimal_data(self):
        """Test creating campaign with minimal required data"""
        # Create a template first
        template = Template.objects.create(
            name="Minimal Template",
            type="custom",
            content_type="template"
        )
        
        payload = {
            "type": "regular",
            "settings": {
                "subject_line": "Minimal Subject",
                "from_name": "Minimal Company",
                "template_id": template.id
            }
        }

        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        self.assertEqual(campaign.type, "regular")
        self.assertEqual(campaign.settings.subject_line, "Minimal Subject")

    def test_create_campaign_with_all_related_objects(self):
        """Test creating campaign with all optional related objects"""
        payload = {
            "type": "automation",
            "status": "sent",
            "settings": {
                "subject_line": "Full Campaign",
                "from_name": "Full Company",
                "template_id": self.template.id
            },
            "recipients": {
                "list_id": "list123",
                "list_name": "Full List"
            },
            "tracking": {
                "opens": True,
                "html_clicks": True,
                "google_analytics": "GA-123456789"
            },
            "social_card": {
                "title": "Social Title",
                "description": "Social description",
                "image_url": "https://example.com/image.jpg"
            }
        }

        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        self.assertEqual(campaign.type, "automation")
        self.assertEqual(campaign.status, "sent")
        self.assertTrue(hasattr(campaign, "recipients"))
        self.assertTrue(hasattr(campaign, "tracking"))
        self.assertTrue(hasattr(campaign, "social_card"))

    def test_create_campaign_validation_error(self):
        """Test creating campaign with validation errors"""
        payload = {
            "type": "regular",
            "settings": {
                "subject_line": "Hello *|NAME|*!",  # Unreplaced placeholder
                "from_name": "Test Company"
            }
        }

        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_create_campaign_unauthorized(self):
        """Test creating campaign without authentication"""
        self.client.force_authenticate(user=None)
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --------------------------
    # RETRIEVE TESTS
    # --------------------------
    def test_get_campaign_detail(self):
        """Test retrieving campaign returns nested template and content"""
        campaign = Campaign.objects.create(user=self.user, type="regular", status="draft")
        template = Template.objects.create(
            name="Test Template",
            type="custom",
            content_type="template"
        )
        TemplateDefaultContent.objects.create(
            template=template,
            sections={"body": "Hello"},
            links={"cta": "https://x.com"}
        )
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Subject",
            from_name="Team",
            template=template
        )

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("settings", response.data)
        self.assertIn("template", response.data["settings"])
        self.assertIn("default_content", response.data["settings"]["template"])

    def test_get_campaign_detail_not_found(self):
        """Test retrieving non-existent campaign"""
        url = reverse("email-draft-detail", args=[99999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn("detail", response.data)

    def test_get_campaign_detail_other_user(self):
        """Test retrieving campaign from another user returns 404"""
        campaign = Campaign.objects.create(user=self.other_user, type="regular")
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Other User Subject"
        )

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_campaign_detail_unauthorized(self):
        """Test retrieving campaign without authentication"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Test Subject"
        )

        self.client.force_authenticate(user=None)
        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --------------------------
    # UPDATE TESTS
    # --------------------------
    def test_partial_update_campaign(self):
        """Test partial update of campaign"""
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        update_payload = {
            "type": "automation",
            "status": "sent",
            "settings": {
                "subject_line": "Updated Subject"
            }
        }

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.patch(url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        campaign.refresh_from_db()
        self.assertEqual(campaign.type, "automation")
        self.assertEqual(campaign.status, "sent")
        self.assertEqual(campaign.settings.subject_line, "Updated Subject")

    def test_update_campaign_with_new_related_objects(self):
        """Test updating campaign with new related objects"""
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        update_payload = {
            "tracking": {
                "opens": False,
                "html_clicks": True,
                "google_analytics": "GA-987654321"
            },
            "social_card": {
                "title": "New Social Title",
                "description": "New social description"
            }
        }

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.patch(url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        campaign.refresh_from_db()
        self.assertTrue(hasattr(campaign, "tracking"))
        self.assertFalse(campaign.tracking.opens)
        self.assertEqual(campaign.tracking.google_analytics, "GA-987654321")

        self.assertTrue(hasattr(campaign, "social_card"))
        self.assertEqual(campaign.social_card.title, "New Social Title")

    def test_update_campaign_not_found(self):
        """Test updating non-existent campaign"""
        update_payload = {
            "settings": {
                "subject_line": "Updated Subject"
            }
        }

        url = reverse("email-draft-detail", args=[99999])
        response = self.client.put(url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_campaign_other_user(self):
        """Test updating campaign from another user returns 404"""
        campaign = Campaign.objects.create(user=self.other_user, type="regular")
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Other User Subject"
        )

        update_payload = {
            "settings": {
                "subject_line": "Updated Subject"
            }
        }

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.put(url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_update_campaign_validation_error(self):
        """Test updating campaign with validation errors"""
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        update_payload = {
            "settings": {
                "subject_line": "Hello *|NAME|*!",  # Unreplaced placeholder
                "from_name": "Updated Company",
                "template_id": self.template.id  # Need to provide template_id
            }
        }

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.put(url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    # --------------------------
    # DELETE TESTS
    # --------------------------
    def test_delete_campaign(self):
        """Deleting a campaign should remove it from DB"""
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign_id = response.data["id"]
        url = reverse("email-draft-detail", args=[campaign_id])
        del_response = self.client.delete(url)
        self.assertEqual(del_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Campaign.objects.filter(id=campaign_id).exists())

    def test_delete_campaign_not_found(self):
        """Test deleting non-existent campaign"""
        url = reverse("email-draft-detail", args=[99999])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_campaign_other_user(self):
        """Test deleting campaign from another user returns 404"""
        campaign = Campaign.objects.create(user=self.other_user, type="regular")
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Other User Subject"
        )

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_campaign_unauthorized(self):
        """Test deleting campaign without authentication"""
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign_id = response.data["id"]
        self.client.force_authenticate(user=None)
        url = reverse("email-draft-detail", args=[campaign_id])
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # --------------------------
    # LIST TESTS
    # --------------------------
    def test_list_campaigns(self):
        """List endpoint should return all campaigns for authenticated user"""
        # Create campaigns for both users
        campaign1 = Campaign.objects.create(user=self.user, type="regular", status="draft")
        CampaignSettings.objects.create(campaign=campaign1, subject_line="Subject 1")

        campaign2 = Campaign.objects.create(user=self.user, type="automation", status="sent")
        CampaignSettings.objects.create(campaign=campaign2, subject_line="Subject 2")

        campaign3 = Campaign.objects.create(user=self.other_user, type="regular", status="draft")
        CampaignSettings.objects.create(campaign=campaign3, subject_line="Other User Subject")

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Should only return campaigns for authenticated user
        self.assertEqual(len(response.data['results']), 2)
        campaign_ids = [campaign["id"] for campaign in response.data['results']]
        self.assertIn(campaign1.id, campaign_ids)
        self.assertIn(campaign2.id, campaign_ids)
        self.assertNotIn(campaign3.id, campaign_ids)

    def test_list_campaigns_empty(self):
        """Test listing campaigns when user has none"""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)

    def test_list_campaigns_unauthorized(self):
        """Test listing campaigns without authentication"""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_campaigns_with_pagination(self):
        """Test listing campaigns with pagination"""
        # Create multiple campaigns
        for i in range(15):
            campaign = Campaign.objects.create(
                user=self.user, 
                type="regular", 
                status="draft"
            )
            CampaignSettings.objects.create(
                campaign=campaign, 
                subject_line=f"Subject {i}"
            )

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 10)  # Default page size


class EmailDraftCommentTests(APITestCase):
    """Tests for the draft comment endpoints."""

    def setUp(self):
        import uuid

        unique_id = str(uuid.uuid4())[:8]
        self.user = User.objects.create_user(
            username=f"commenter_{unique_id}",
            email=f"commenter_{unique_id}@example.com",
            password="12345",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        self.campaign = Campaign.objects.create(user=self.user, type="regular")
        CampaignSettings.objects.create(
            campaign=self.campaign,
            subject_line="Subject",
        )
        self.comments_url = reverse("email-draft-comments", args=[self.campaign.id])

    def test_create_and_list_comments(self):
        """Users can create comments and retrieve them."""
        response = self.client.post(
            self.comments_url, {"body": "Need to adjust hero image"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "open")

        list_response = self.client.get(self.comments_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["body"], "Need to adjust hero image")

        resolved_response = self.client.get(f"{self.comments_url}?status=resolved")
        self.assertEqual(resolved_response.status_code, status.HTTP_200_OK)
        self.assertEqual(resolved_response.data, [])

    def test_resolve_and_reopen_comment(self):
        """Comments can be resolved and reopened."""
        comment = CampaignComment.objects.create(
            campaign=self.campaign,
            author=self.user,
            body="Double check CTA copy",
        )
        detail_url = reverse(
            "email-draft-update-comment",
            kwargs={"id": self.campaign.id, "comment_id": comment.id},
        )

        resolve_response = self.client.patch(
            detail_url, {"status": "resolved"}, format="json"
        )
        self.assertEqual(resolve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(resolve_response.data["status"], "resolved")
        self.assertIsNotNone(resolve_response.data["resolved_by_id"])
        self.assertIsNotNone(resolve_response.data["resolved_at"])

        reopen_response = self.client.patch(
            detail_url, {"status": "open"}, format="json"
        )
        self.assertEqual(reopen_response.status_code, status.HTTP_200_OK)
        self.assertEqual(reopen_response.data["status"], "open")
        self.assertIsNone(reopen_response.data["resolved_by_id"])

    def test_invalid_status_returns_error(self):
        """Invalid status payloads are rejected."""
        comment = CampaignComment.objects.create(
            campaign=self.campaign,
            author=self.user,
            body="Layout issue",
        )
        detail_url = reverse(
            "email-draft-update-comment",
            kwargs={"id": self.campaign.id, "comment_id": comment.id},
        )

        response = self.client.patch(
            detail_url, {"status": "pending"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)


class EmailDraftAdditionalEndpointsTests(APITestCase):
    """Test additional endpoints like preview and templates"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_preview_campaign(self):
        """Test preview endpoint returns campaign content"""
        campaign = Campaign.objects.create(user=self.user, type="regular", status="draft")
        template = Template.objects.create(
            name="Preview Template",
            type="custom",
            content_type="template"
        )
        TemplateDefaultContent.objects.create(
            template=template,
            sections={
                "header": "<h1>Preview Header</h1>",
                "body": "<p>Preview body content</p>"
            },
            links={}
        )
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Preview Subject",
            preview_text="Preview text",
            from_name="Preview Company",
            reply_to="preview@example.com",
            template=template
        )

        url = reverse("email-draft-preview", args=[campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data["subject_line"], "Preview Subject")
        self.assertEqual(data["preview_text"], "Preview text")
        self.assertEqual(data["from_name"], "Preview Company")
        self.assertEqual(data["reply_to"], "preview@example.com")
        self.assertEqual(len(data["sections"]), 2)
        
        # Check that both sections are present (order may vary)
        section_contents = [section["content"] for section in data["sections"]]
        self.assertIn("<h1>Preview Header</h1>", section_contents)
        self.assertIn("<p>Preview body content</p>", section_contents)

    def test_preview_campaign_without_template(self):
        """Test preview endpoint with campaign without template"""
        campaign = Campaign.objects.create(user=self.user, type="regular", status="draft")
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Preview Subject",
            preview_text="Preview text",
            from_name="Preview Company"
        )

        url = reverse("email-draft-preview", args=[campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data["subject_line"], "Preview Subject")
        self.assertEqual(data["preview_text"], "Preview text")
        self.assertEqual(data["from_name"], "Preview Company")
        self.assertEqual(len(data["sections"]), 0)  # No template sections

    def test_preview_campaign_without_settings(self):
        """Test preview endpoint with campaign without settings"""
        campaign = Campaign.objects.create(user=self.user, type="regular", status="draft")

        url = reverse("email-draft-preview", args=[campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_preview_campaign_not_found(self):
        """Test preview endpoint with non-existent campaign"""
        url = reverse("email-draft-preview", args=[99999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_preview_campaign_other_user(self):
        """Test preview endpoint with campaign from another user"""
        other_user = User.objects.create_user(
            username="other",
            email="other@example.com",
            password="12345"
        )
        campaign = Campaign.objects.create(user=other_user, type="regular", status="draft")
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Other User Subject"
        )

        url = reverse("email-draft-preview", args=[campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_list_templates(self):
        """Test templates endpoint returns available templates"""
        # Create active templates
        template1 = Template.objects.create(
            name="Template 1",
            type="basic",
            content_type="template",
            active=True
        )
        TemplateDefaultContent.objects.create(
            template=template1,
            sections={"body": "Template 1 content"},
            links={}
        )

        template2 = Template.objects.create(
            name="Template 2",
            type="custom",
            content_type="template",
            active=True
        )
        TemplateDefaultContent.objects.create(
            template=template2,
            sections={"body": "Template 2 content"},
            links={}
        )

        # Create inactive template (should not appear)
        template3 = Template.objects.create(
            name="Inactive Template",
            type="basic",
            content_type="template",
            active=False
        )

        url = reverse("email-draft-templates")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should only return active templates
        self.assertEqual(len(response.data), 2)
        template_names = [template["name"] for template in response.data]
        self.assertIn("Template 1", template_names)
        self.assertIn("Template 2", template_names)
        self.assertNotIn("Inactive Template", template_names)

    def test_list_templates_empty(self):
        """Test templates endpoint when no templates exist"""
        url = reverse("email-draft-templates")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)

    def test_list_templates_unauthorized(self):
        """Test templates endpoint without authentication"""
        self.client.force_authenticate(user=None)
        url = reverse("email-draft-templates")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class EmailDraftErrorHandlingTests(APITestCase):
    """Test error handling in email drafts API"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_campaign_missing_required_fields(self):
        """Test creating campaign with missing required fields"""
        payload = {
            "type": "regular"
            # Missing settings
        }

        response = self.client.post(reverse("email-draft-list"), payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_create_campaign_invalid_json(self):
        """Test creating campaign with invalid JSON"""
        response = self.client.post(
            reverse("email-draft-list"),
            "invalid json",
            content_type="application/json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_campaign_invalid_data(self):
        """Test updating campaign with invalid data"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Original Subject"
        )

        payload = {
            "settings": {
                "subject_line": "Hello *|NAME|*!",  # Unreplaced placeholder should cause validation error
                "from_name": "Test Company"
            }
        }

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.put(url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

    def test_database_transaction_rollback(self):
        """Test that database transactions are properly handled"""
        # This test ensures that if template creation fails,
        # the entire campaign creation is rolled back
        payload = {
            "type": "regular",
            "settings": {
                "subject_line": "Hello *|NAME|*!",  # Unreplaced placeholder should cause validation error
                "template_data": {
                    "template": {
                        "name": "Test Template",
                        "type": "custom",
                        "content_type": "template"
                    },
                    "default_content": {
                        "sections": {"body": "Test content"}
                    }
                }
            }
        }

        response = self.client.post(reverse("email-draft-list"), payload, format='json')
        # Should fail due to unreplaced placeholder
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # No campaign should be created
        self.assertEqual(Campaign.objects.count(), 0)
        self.assertEqual(Template.objects.count(), 0)