from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from ..models import (
    Campaign, CampaignSettings, CampaignRecipients, CampaignVariateSettings,
    CampaignTracking, CampaignRSSOptions, CampaignABSplitOptions,
    CampaignSocialCard, CampaignReportSummary, CampaignDeliveryStatus,
    CampaignResendShortcutEligibility, CampaignResendShortcutUsage,
    Template, TemplateDefaultContent, CampaignEcommerceSummary
)

User = get_user_model()


class TemplateModelTests(TestCase):
    """Test Template model creation and relationships"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )       

    def test_create_template_with_required_fields(self):
        """Test creating template with minimal required fields"""
        template = Template.objects.create(
            name="Test Template",
            type="custom",
            content_type="template"
        )
        
        self.assertEqual(template.name, "Test Template")
        self.assertEqual(template.type, "custom")
        self.assertEqual(template.content_type, "template")
        self.assertTrue(template.active)  # Default value
        self.assertFalse(template.drag_and_drop)  # Default value
        self.assertFalse(template.responsive)  # Default value

    def test_create_template_with_all_fields(self):
        """Test creating template with all optional fields"""
        template = Template.objects.create(
            name="Full Template",
            type="basic",
            content_type="template",
            drag_and_drop=True,
            responsive=True,
            category="newsletter",
            created_by="admin",
            edited_by="admin",
            active=True,
            folder_id="folder123",
            thumbnail="https://example.com/thumb.jpg",
            share_url="https://example.com/share",
            links={"css": "https://example.com/style.css"}
        )
        
        self.assertEqual(template.name, "Full Template")
        self.assertTrue(template.drag_and_drop)
        self.assertTrue(template.responsive)
        self.assertEqual(template.category, "newsletter")
        self.assertEqual(template.created_by, "admin")
        self.assertEqual(template.folder_id, "folder123")

    def test_template_str_representation(self):
        """Test template string representation"""
        template = Template.objects.create(
            name="Test Template",
            type="custom",
            content_type="template"
        )
        expected = f"{template.name} ({template.id})"
        self.assertEqual(str(template), expected)


class TemplateDefaultContentModelTests(TestCase):
    """Test TemplateDefaultContent model creation and relationships"""

    def setUp(self):
        self.template = Template.objects.create(
            name="Test Template",
            type="custom",
            content_type="template"
        )

    def test_create_default_content(self):
        """Test creating template default content"""
        default_content = TemplateDefaultContent.objects.create(
            template=self.template,
            sections={
                "header": "<h1>Welcome</h1>",
                "body": "<p>Content here</p>",
                "footer": "<p>Footer</p>"
            },
            links={
                "css": "https://example.com/style.css",
                "js": "https://example.com/script.js"
            }
        )
        
        self.assertEqual(default_content.template, self.template)
        self.assertIn("header", default_content.sections)
        self.assertIn("css", default_content.links)
        self.assertEqual(default_content.sections["header"], "<h1>Welcome</h1>")

    def test_default_content_str_representation(self):
        """Test default content string representation"""
        default_content = TemplateDefaultContent.objects.create(
            template=self.template,
            sections={"body": "test"}
        )
        expected = f"Default Content for {self.template.name}"
        self.assertEqual(str(default_content), expected)

    def test_template_default_content_relationship(self):
        """Test one-to-one relationship between template and default content"""
        default_content = TemplateDefaultContent.objects.create(
            template=self.template,
            sections={"body": "test"}
        )
        
        # Test reverse relationship
        self.assertEqual(self.template.default_content, default_content)


class CampaignModelTests(TestCase):
    """Test Campaign model creation and relationships"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )

    def test_create_campaign_with_minimal_fields(self):
        """Test creating campaign with minimal required fields"""
        campaign = Campaign.objects.create(
            user=self.user,
            type="regular"
        )
        
        self.assertEqual(campaign.user, self.user)
        self.assertEqual(campaign.type, "regular")
        self.assertEqual(campaign.emails_sent, 0)  # Default value
        self.assertTrue(campaign.resendable)  # Default value
        self.assertFalse(campaign.needs_block_refresh)  # Default value

    def test_create_campaign_with_all_fields(self):
        """Test creating campaign with all optional fields"""
        campaign = Campaign.objects.create(
            user=self.user,
            parent_campaign_id="parent123",
            type="automation",
            create_time="2024-01-01T00:00:00Z",
            archive_url="https://example.com/archive",
            long_archive_url="https://example.com/long-archive",
            status="sent",
            emails_sent=1000,
            send_time="2024-01-01T10:00:00Z",
            content_type="html",
            needs_block_refresh=True,
            resendable=False
        )
        
        self.assertEqual(campaign.parent_campaign_id, "parent123")
        self.assertEqual(campaign.type, "automation")
        self.assertEqual(campaign.status, "sent")
        self.assertEqual(campaign.emails_sent, 1000)
        self.assertTrue(campaign.needs_block_refresh)
        self.assertFalse(campaign.resendable)

    def test_campaign_str_representation(self):
        """Test campaign string representation"""
        campaign = Campaign.objects.create(
            user=self.user,
            type="regular",
            status="draft"
        )
        expected = f"Campaign {campaign.id} - {campaign.status}"
        self.assertEqual(str(campaign), expected)


class CampaignSettingsModelTests(TestCase):
    """Test CampaignSettings model creation and relationships"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )
        self.campaign = Campaign.objects.create(
            user=self.user,
            type="regular"
        )
        self.template = Template.objects.create(
            name="Test Template",
            type="custom",
            content_type="template"
        )

    def test_create_campaign_settings_with_minimal_fields(self):
        """Test creating campaign settings with minimal fields"""
        settings = CampaignSettings.objects.create(
            campaign=self.campaign,
            subject_line="Test Subject"
        )
        
        self.assertEqual(settings.campaign, self.campaign)
        self.assertEqual(settings.subject_line, "Test Subject")
        self.assertTrue(settings.use_conversation)  # Default value
        self.assertTrue(settings.authenticate)  # Default value
        self.assertTrue(settings.auto_footer)  # Default value

    def test_create_campaign_settings_with_template(self):
        """Test creating campaign settings with template"""
        settings = CampaignSettings.objects.create(
            campaign=self.campaign,
            subject_line="Test Subject",
            preview_text="Preview text",
            title="Campaign Title",
            from_name="Test Company",
            reply_to="test@example.com",
            template=self.template
        )
        
        self.assertEqual(settings.template, self.template)
        self.assertEqual(settings.from_name, "Test Company")
        self.assertEqual(settings.reply_to, "test@example.com")

    def test_campaign_settings_str_representation(self):
        """Test campaign settings string representation"""
        settings = CampaignSettings.objects.create(
            campaign=self.campaign,
            subject_line="Test Subject"
        )
        expected = f"Settings for {self.campaign.id}"
        self.assertEqual(str(settings), expected)


class CampaignRecipientsModelTests(TestCase):
    """Test CampaignRecipients model creation and relationships"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )
        self.campaign = Campaign.objects.create(
            user=self.user,
            type="regular"
        )

    def test_create_campaign_recipients(self):
        """Test creating campaign recipients"""
        recipients = CampaignRecipients.objects.create(
            campaign=self.campaign,
            list_id="list123",
            list_name="Newsletter Subscribers",
            list_is_active=True,
            segment_text="Active subscribers",
            segment_opts={"status": "active"}
        )
        
        self.assertEqual(recipients.campaign, self.campaign)
        self.assertEqual(recipients.list_id, "list123")
        self.assertEqual(recipients.list_name, "Newsletter Subscribers")
        self.assertTrue(recipients.list_is_active)
        self.assertEqual(recipients.segment_text, "Active subscribers")

    def test_campaign_recipients_str_representation(self):
        """Test campaign recipients string representation"""
        recipients = CampaignRecipients.objects.create(
            campaign=self.campaign,
            list_id="list123",
            list_name="Test List"
        )
        expected = f"Recipients for {self.campaign.id}"
        self.assertEqual(str(recipients), expected)


class CampaignRelatedModelsTests(TestCase):
    """Test other campaign-related models"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )
        self.campaign = Campaign.objects.create(
            user=self.user,
            type="regular"
        )

    def test_campaign_variate_settings(self):
        """Test CampaignVariateSettings model"""
        variate_settings = CampaignVariateSettings.objects.create(
            campaign=self.campaign,
            winning_combination_id="combo123",
            winning_campaign_id="campaign123",
            winner_criteria="opens",
            wait_time=24,
            test_size=1000,
            subject_lines=["Subject A", "Subject B"],
            send_times=["2024-01-01T10:00:00Z", "2024-01-01T14:00:00Z"],
            from_names=["Company A", "Company B"],
            reply_to_addresses=["a@example.com", "b@example.com"],
            contents=[{"type": "html", "content": "<p>Content A</p>"}],
            combinations=[{"id": "combo1", "subject": 0, "send_time": 1}]
        )
        
        self.assertEqual(variate_settings.campaign, self.campaign)
        self.assertEqual(variate_settings.winner_criteria, "opens")
        self.assertEqual(variate_settings.wait_time, 24)
        self.assertEqual(len(variate_settings.subject_lines), 2)

    def test_campaign_tracking(self):
        """Test CampaignTracking model"""
        tracking = CampaignTracking.objects.create(
            campaign=self.campaign,
            opens=True,
            html_clicks=True,
            text_clicks=False,
            goal_tracking=True,
            ecomm360=False,
            google_analytics="GA-123456789",
            clicktale="CT-123456789",
            salesforce={"account": "sf_account"},
            capsule={"account": "capsule_account"}
        )
        
        self.assertEqual(tracking.campaign, self.campaign)
        self.assertTrue(tracking.opens)
        self.assertFalse(tracking.text_clicks)
        self.assertEqual(tracking.google_analytics, "GA-123456789")

    def test_campaign_rss_options(self):
        """Test CampaignRSSOptions model"""
        rss_opts = CampaignRSSOptions.objects.create(
            campaign=self.campaign,
            feed_url="https://example.com/rss",
            frequency="daily",
            schedule={"time": "10:00", "days": ["monday", "wednesday"]},
            last_sent="2024-01-01T10:00:00Z",
            constrain_rss_img=True
        )
        
        self.assertEqual(rss_opts.campaign, self.campaign)
        self.assertEqual(rss_opts.feed_url, "https://example.com/rss")
        self.assertEqual(rss_opts.frequency, "daily")
        self.assertTrue(rss_opts.constrain_rss_img)

    def test_campaign_ab_split_options(self):
        """Test CampaignABSplitOptions model"""
        ab_split = CampaignABSplitOptions.objects.create(
            campaign=self.campaign,
            split_test="subject",
            pick_winner="opens",
            wait_units="hours",
            wait_time=24,
            split_size=0.5,
            from_name_a="Company A",
            from_name_b="Company B",
            reply_email_a="a@example.com",
            reply_email_b="b@example.com",
            subject_a="Subject A",
            subject_b="Subject B",
            send_time_a="2024-01-01T10:00:00Z",
            send_time_b="2024-01-01T14:00:00Z",
            send_time_winner="2024-01-01T12:00:00Z"
        )
        
        self.assertEqual(ab_split.campaign, self.campaign)
        self.assertEqual(ab_split.split_test, "subject")
        self.assertEqual(ab_split.split_size, 0.5)
        self.assertEqual(ab_split.from_name_a, "Company A")

    def test_campaign_social_card(self):
        """Test CampaignSocialCard model"""
        social_card = CampaignSocialCard.objects.create(
            campaign=self.campaign,
            image_url="https://example.com/social.jpg",
            description="Social media description",
            title="Social Card Title"
        )
        
        self.assertEqual(social_card.campaign, self.campaign)
        self.assertEqual(social_card.image_url, "https://example.com/social.jpg")
        self.assertEqual(social_card.title, "Social Card Title")

    def test_campaign_report_summary(self):
        """Test CampaignReportSummary model"""
        report_summary = CampaignReportSummary.objects.create(
            campaign=self.campaign,
            opens=1000,
            unique_opens=800,
            open_rate=0.8,
            clicks=100,
            subscriber_clicks=80,
            click_rate=0.1,
            ecommerce={"orders": 10, "revenue": 500.0}
        )
        
        self.assertEqual(report_summary.campaign, self.campaign)
        self.assertEqual(report_summary.opens, 1000)
        self.assertEqual(report_summary.open_rate, 0.8)
        self.assertEqual(report_summary.ecommerce["orders"], 10)

    def test_campaign_delivery_status(self):
        """Test CampaignDeliveryStatus model"""
        delivery_status = CampaignDeliveryStatus.objects.create(
            campaign=self.campaign,
            enabled=True,
            can_cancel=False,
            status="delivered",
            emails_sent=1000,
            emails_canceled=0
        )
        
        self.assertEqual(delivery_status.campaign, self.campaign)
        self.assertTrue(delivery_status.enabled)
        self.assertFalse(delivery_status.can_cancel)
        self.assertEqual(delivery_status.status, "delivered")

    def test_campaign_resend_shortcut_eligibility(self):
        """Test CampaignResendShortcutEligibility model"""
        eligibility = CampaignResendShortcutEligibility.objects.create(
            campaign=self.campaign,
            to_non_openers={"enabled": True, "hours": 24},
            to_new_subscribers={"enabled": True, "hours": 48},
            to_non_clickers={"enabled": False},
            to_non_purchasers={"enabled": True, "hours": 72}
        )
        
        self.assertEqual(eligibility.campaign, self.campaign)
        self.assertTrue(eligibility.to_non_openers["enabled"])
        self.assertFalse(eligibility.to_non_clickers["enabled"])

    def test_campaign_resend_shortcut_usage(self):
        """Test CampaignResendShortcutUsage model"""
        usage = CampaignResendShortcutUsage.objects.create(
            campaign=self.campaign,
            shortcut_campaigns=[{"id": "shortcut1", "type": "non_openers"}],
            original_campaign={"id": "original1", "sent_at": "2024-01-01T10:00:00Z"}
        )
        
        self.assertEqual(usage.campaign, self.campaign)
        self.assertEqual(len(usage.shortcut_campaigns), 1)
        self.assertEqual(usage.original_campaign["id"], "original1")


class CampaignEcommerceSummaryModelTests(TestCase):
    """Test CampaignEcommerceSummary model"""

    def test_create_ecommerce_summary(self):
        """Test creating ecommerce summary"""
        ecommerce = CampaignEcommerceSummary.objects.create(
            total_orders=100,
            total_spent=5000.0,
            total_revenue=10000.0
        )
        
        self.assertEqual(ecommerce.total_orders, 100)
        self.assertEqual(ecommerce.total_spent, 5000.0)
        self.assertEqual(ecommerce.total_revenue, 10000.0)