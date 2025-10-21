from django.test import TestCase
from ..serializers import CampaignSerializer, CampaignSettingsSerializer
from ..models import Campaign, Template, TemplateDefaultContent
from django.contrib.auth import get_user_model

User = get_user_model()


class CampaignSerializerTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="12345")
        self.template_data = {
            "template": {"name": "Welcome Template"},
            "default_content": {
                "sections": {"body": "Hi"},
                "links": {"cta": "https://example.com"}
            }
        }

        self.valid_data = {
            "user": self.user.id,
            "type": "regular",
            "status": "draft",
            "settings": {
                "subject_line": "Welcome Email",
                "from_name": "Team",
                "reply_to": "reply@example.com",
                "template_data": self.template_data,
            },
        }

    def test_serializer_creates_campaign_and_template(self):
        serializer = CampaignSerializer(data=self.valid_data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        campaign = serializer.save()

        self.assertEqual(Campaign.objects.count(), 1)
        self.assertEqual(campaign.settings.template.name, "Welcome Template")
        self.assertEqual(
            campaign.settings.template.default_content.sections["body"],
            "Hi"
        )

    def test_update_creates_new_template(self):
        serializer = CampaignSerializer(data=self.valid_data)
        serializer.is_valid(raise_exception=True)
        campaign = serializer.save()
        old_template_id = campaign.settings.template.id

        update_data = {
            "settings": {
                "template_data": {
                    "template": {"name": "Updated Template"},
                    "default_content": {
                        "sections": {"body": "Updated"},
                        "links": {"cta": "https://updated.com"}
                    }
                }
            }
        }

        serializer = CampaignSerializer(instance=campaign, data=update_data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        campaign = serializer.save()
        new_template_id = campaign.settings.template.id

        self.assertNotEqual(old_template_id, new_template_id)


class PlaceholderValidationTests(TestCase):
    def test_valid_subject_and_preview(self):
        serializer = CampaignSettingsSerializer(data={
            "subject_line": "Welcome to our newsletter!",
            "preview_text": "Check out our latest updates."
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_unreplaced_placeholder_in_subject(self):
        serializer = CampaignSettingsSerializer(data={
            "subject_line": "Hello *|NAME|*, welcome!",
            "preview_text": "Preview text is clean."
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("placeholders", serializer.errors)

    def test_unreplaced_placeholder_in_preview(self):
        serializer = CampaignSettingsSerializer(data={
            "subject_line": "Hello there!",
            "preview_text": "Hi *|EMAIL|*, check this out!"
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("placeholders", serializer.errors)