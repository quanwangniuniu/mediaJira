from django.test import TestCase
from django.contrib.auth import get_user_model
from ..models import (
    Campaign, CampaignSettings, Template, TemplateDefaultContent, CampaignRecipients
)

User = get_user_model()


class CampaignModelTests(TestCase):

    def setUp(self):
        self.user = User.objects.create_user(username="tester", password="12345")

    def test_create_template_and_default_content(self):
        template = Template.objects.create(name="Welcome Template")
        default_content = TemplateDefaultContent.objects.create(
            template=template,
            sections={"header": "Hello"},
            links={"cta": "https://example.com"}
        )
        self.assertEqual(template.default_content, default_content)
        self.assertIn("header", template.default_content.sections)

    def test_create_campaign_with_settings_and_recipients(self):
        template = Template.objects.create(name="Test Template")
        TemplateDefaultContent.objects.create(template=template, sections={}, links={})

        campaign = Campaign.objects.create(
            user=self.user,
            type="regular",
            status="draft",
        )
        settings = CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Subject",
            from_name="Tester",
            reply_to="reply@example.com",
            template=template,
        )
        recipients = CampaignRecipients.objects.create(
            campaign=campaign,
            list_id="abc123"
        )

        self.assertEqual(settings.campaign, campaign)
        self.assertEqual(recipients.campaign, campaign)
        self.assertEqual(campaign.settings.template.name, "Test Template")
