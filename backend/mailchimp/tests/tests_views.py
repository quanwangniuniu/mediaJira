from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import (
    Campaign, CampaignSettings, Template, TemplateDefaultContent, CampaignRecipients
)

User = get_user_model()


class EmailDraftCRUDTests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="pass123")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

        self.list_url = reverse("email-draft-list")

        # Reusable template data
        self.template_data = {
            "template": {"name": "Welcome Template"},
            "default_content": {
                "sections": {"header": "Hi!", "body": "Welcome to our newsletter"},
                "links": {"cta": "https://example.com"}
            }
        }

        # Campaign creation payload
        self.create_payload = {
            "user": self.user.id,
            "type": "regular",
            "status": "draft",
            "settings": {
                "subject_line": "Welcome Email",
                "from_name": "Marketing Team",
                "reply_to": "reply@example.com",
                "template_data": self.template_data,
            },
            "recipients": {
                "list_id": "abc123",
            }
        }

    # --------------------------
    # CREATE
    # --------------------------
    def test_create_campaign_with_template(self):
        """Test creating campaign with nested template + default content"""
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        self.assertIsNotNone(campaign)
        self.assertTrue(hasattr(campaign, "settings"))
        self.assertTrue(hasattr(campaign.settings, "template"))
        self.assertTrue(hasattr(campaign.settings.template, "default_content"))

        # Check nested content
        self.assertEqual(campaign.settings.template.name, "Welcome Template")
        self.assertIn("header", campaign.settings.template.default_content.sections)

    # --------------------------
    # RETRIEVE
    # --------------------------
    def test_get_campaign_detail(self):
        """Test retrieving campaign returns nested template and content"""
        campaign = Campaign.objects.create(user=self.user, type="regular", status="draft")
        template = Template.objects.create(name="Test Template")
        TemplateDefaultContent.objects.create(
            template=template,
            sections={"body": "Hello"},
            links={"cta": "https://x.com"}
        )
        settings = CampaignSettings.objects.create(
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

    # --------------------------
    # UPDATE
    # --------------------------
    def test_update_campaign_creates_new_template(self):
        """Updating template_data should create a new Template + DefaultContent"""
        response = self.client.post(self.list_url, self.create_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        campaign = Campaign.objects.first()
        old_template_id = campaign.settings.template.id

        update_payload = {
            "settings": {
                "subject_line": "Updated Subject",
                "template_data": {
                    "template": {"name": "Updated Template"},
                    "default_content": {
                        "sections": {"body": "Updated Body"},
                        "links": {"cta": "https://updated.com"}
                    }
                }
            }
        }

        url = reverse("email-draft-detail", args=[campaign.id])
        response = self.client.put(url, update_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        campaign.refresh_from_db()
        new_template_id = campaign.settings.template.id
        self.assertNotEqual(old_template_id, new_template_id)

    # --------------------------
    # LIST
    # --------------------------
    def test_list_campaigns(self):
        """List endpoint should return all campaigns"""
        Campaign.objects.create(user=self.user, type="regular", status="draft")
        Campaign.objects.create(user=self.user, type="regular", status="sent")

        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)

    # --------------------------
    # DELETE
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
