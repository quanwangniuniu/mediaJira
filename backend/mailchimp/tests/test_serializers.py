from django.test import TestCase
from django.contrib.auth import get_user_model
from ..serializers import (
    CampaignSerializer, CampaignSettingsSerializer, TemplateSerializer,
    TemplateDefaultContentSerializer, CampaignRecipientsSerializer,
    CampaignVariateSettingsSerializer, CampaignTrackingSerializer,
    CampaignRSSOptionsSerializer, CampaignABSplitOptionsSerializer,
    CampaignSocialCardSerializer, CampaignReportSummarySerializer,
    CampaignDeliveryStatusSerializer, CampaignResendShortcutEligibilitySerializer,
    CampaignResendShortcutUsageSerializer
)
from ..models import (
    Campaign, CampaignSettings, Template, TemplateDefaultContent,
    CampaignRecipients, CampaignVariateSettings, CampaignTracking,
    CampaignRSSOptions, CampaignABSplitOptions, CampaignSocialCard,
    CampaignReportSummary, CampaignDeliveryStatus, CampaignResendShortcutEligibility,
    CampaignResendShortcutUsage
)

User = get_user_model()


class TemplateSerializerTests(TestCase):
    """Test Template serializers"""

    def setUp(self):
        self.template = Template.objects.create(
            name="Test Template",
            type="custom",
            content_type="template",
            drag_and_drop=True,
            responsive=True
        )
        self.default_content = TemplateDefaultContent.objects.create(
            template=self.template,
            sections={"header": "<h1>Test</h1>"},
            links={"css": "https://example.com/style.css"}
        )

    def test_template_default_content_serializer(self):
        """Test TemplateDefaultContentSerializer"""
        serializer = TemplateDefaultContentSerializer(self.default_content)
        data = serializer.data
        
        self.assertIn("sections", data)
        self.assertIn("links", data)
        self.assertEqual(data["sections"]["header"], "<h1>Test</h1>")
        self.assertEqual(data["links"]["css"], "https://example.com/style.css")

    def test_template_serializer(self):
        """Test TemplateSerializer"""
        serializer = TemplateSerializer(self.template)
        data = serializer.data
        
        self.assertEqual(data["name"], "Test Template")
        self.assertEqual(data["type"], "custom")
        self.assertTrue(data["drag_and_drop"])
        self.assertTrue(data["responsive"])
        self.assertIn("default_content", data)
        self.assertEqual(data["default_content"]["sections"]["header"], "<h1>Test</h1>")


class CampaignSettingsSerializerTests(TestCase):
    """Test CampaignSettingsSerializer"""

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

    def test_campaign_settings_serializer_with_template_id(self):
        """Test CampaignSettingsSerializer with template_id"""
        data = {
            "campaign": self.campaign.id,
            "subject_line": "Test Subject",
            "from_name": "Test Company",
            "reply_to": "test@example.com",
            "template_id": self.template.id
        }
        
        serializer = CampaignSettingsSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        settings = serializer.save()
        
        self.assertEqual(settings.campaign, self.campaign)
        self.assertNotEqual(settings.template, self.template)
        self.assertEqual(settings.template.name, "Test Subject")
        self.assertEqual(settings.subject_line, "Test Subject")

    def test_campaign_settings_serializer_with_template_data(self):
        """Test CampaignSettingsSerializer with template_data"""
        template_data = {
            "template": {
                "name": "New Template",
                "type": "custom",
                "content_type": "template"
            },
            "default_content": {
                "sections": {"header": "<h1>New Header</h1>"},
                "links": {"css": "https://example.com/new.css"}
            }
        }
        
        data = {
            "campaign": self.campaign.id,
            "subject_line": "Test Subject",
            "template_data": template_data
        }
        
        serializer = CampaignSettingsSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        settings = serializer.save()
        
        self.assertEqual(settings.campaign, self.campaign)
        self.assertEqual(settings.template.name, "Test Subject")
        self.assertEqual(settings.template.default_content.sections["header"], "<h1>New Header</h1>")

    def test_campaign_settings_serializer_update_with_new_template(self):
        """Test updating CampaignSettings with new template_data"""
        # Create initial settings
        settings = CampaignSettings.objects.create(
            campaign=self.campaign,
            subject_line="Original Subject",
            template=self.template
        )
        
        # Update with new template data
        template_data = {
            "template": {
                "name": "Updated Template",
                "type": "custom",
                "content_type": "template"
            },
            "default_content": {
                "sections": {"body": "<p>Updated content</p>"}
            }
        }
        
        data = {
            "subject_line": "Updated Subject",
            "template_data": template_data
        }
        
        serializer = CampaignSettingsSerializer(instance=settings, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_settings = serializer.save()
        
        self.assertEqual(updated_settings.subject_line, "Updated Subject")
        self.assertEqual(updated_settings.template.id, self.template.id)
        self.assertEqual(updated_settings.template.name, "Updated Subject")

    def test_template_creation_with_missing_fields(self):
        """Test template creation with missing required fields"""
        template_data = {
            "template": {
                "name": "",  # Empty name
                "type": "",  # Empty type
            },
            "default_content": {
                "sections": {"header": "<h1>Test</h1>"}
            }
        }
        
        data = {
            "campaign": self.campaign.id,
            "subject_line": "Test Subject",
            "template_data": template_data
        }
        
        serializer = CampaignSettingsSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        settings = serializer.save()
        
        # Should have default values
        self.assertEqual(settings.template.name, "Test Subject")
        self.assertEqual(settings.template.type, "custom")
        self.assertEqual(settings.template.content_type, "template")


class CampaignSerializerTests(TestCase):
    """Test CampaignSerializer"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )

    def test_campaign_serializer_create_with_minimal_data(self):
        """Test creating campaign with minimal required data"""
        data = {
            "type": "regular",
            "status": "draft",
            "settings": {
                "subject_line": "Test Subject",
                "from_name": "Test Company"
            }
        }
        
        serializer = CampaignSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        campaign = serializer.save(user=self.user)
        
        self.assertEqual(campaign.user, self.user)
        self.assertEqual(campaign.type, "regular")
        self.assertEqual(campaign.status, "draft")
        self.assertTrue(hasattr(campaign, "settings"))
        self.assertEqual(campaign.settings.subject_line, "Test Subject")

    def test_campaign_serializer_create_with_all_related_objects(self):
        """Test creating campaign with all related objects"""
        template_data = {
            "template": {
                "name": "Test Template",
                "type": "custom",
                "content_type": "template"
            },
            "default_content": {
                "sections": {"header": "<h1>Test</h1>"},
                "links": {"css": "https://example.com/style.css"}
            }
        }
        
        data = {
            "type": "regular",
            "status": "draft",
            "settings": {
                "subject_line": "Test Subject",
                "from_name": "Test Company",
                "reply_to": "test@example.com",
                "template_data": template_data
            },
            "recipients": {
                "list_id": "list123",
                "list_name": "Test List",
                "list_is_active": True
            },
            "tracking": {
                "opens": True,
                "html_clicks": True,
                "text_clicks": False,
                "google_analytics": "GA-123456789"
            },
            "social_card": {
                "title": "Social Card Title",
                "description": "Social card description",
                "image_url": "https://example.com/image.jpg"
            }
        }
        
        serializer = CampaignSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        campaign = serializer.save(user=self.user)
        
        # Check main campaign
        self.assertEqual(campaign.user, self.user)
        self.assertEqual(campaign.type, "regular")
        
        # Check settings and template
        self.assertTrue(hasattr(campaign, "settings"))
        self.assertEqual(campaign.settings.subject_line, "Test Subject")
        self.assertTrue(hasattr(campaign.settings, "template"))
        self.assertEqual(campaign.settings.template.name, "Test Subject")
        
        # Check recipients
        self.assertTrue(hasattr(campaign, "recipients"))
        self.assertEqual(campaign.recipients.list_id, "list123")
        
        # Check tracking
        self.assertTrue(hasattr(campaign, "tracking"))
        self.assertTrue(campaign.tracking.opens)
        self.assertFalse(campaign.tracking.text_clicks)
        
        # Check social card
        self.assertTrue(hasattr(campaign, "social_card"))
        self.assertEqual(campaign.social_card.title, "Social Card Title")

    def test_campaign_serializer_update(self):
        """Test updating campaign"""
        # Create initial campaign
        campaign = Campaign.objects.create(
            user=self.user,
            type="regular",
            status="draft"
        )
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Original Subject",
            from_name="Original Company"
        )
        
        # Update data
        data = {
            "type": "automation",
            "status": "sent",
            "settings": {
                "subject_line": "Updated Subject",
                "from_name": "Updated Company"
            }
        }
        
        serializer = CampaignSerializer(instance=campaign, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_campaign = serializer.save()
        
        self.assertEqual(updated_campaign.type, "automation")
        self.assertEqual(updated_campaign.status, "sent")
        self.assertEqual(updated_campaign.settings.subject_line, "Updated Subject")
        self.assertEqual(updated_campaign.settings.from_name, "Updated Company")

    def test_campaign_serializer_update_related_objects(self):
        """Test updating campaign with new related objects"""
        # Create initial campaign
        campaign = Campaign.objects.create(
            user=self.user,
            type="regular",
            status="draft"
        )
        CampaignSettings.objects.create(
            campaign=campaign,
            subject_line="Original Subject"
        )
        
        # Update with new related objects
        data = {
            "recipients": {
                "list_id": "newlist123",
                "list_name": "New List"
            },
            "tracking": {
                "opens": False,
                "html_clicks": True
            }
        }
        
        serializer = CampaignSerializer(instance=campaign, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        updated_campaign = serializer.save()
        
        # Check new related objects
        self.assertTrue(hasattr(updated_campaign, "recipients"))
        self.assertEqual(updated_campaign.recipients.list_id, "newlist123")
        
        self.assertTrue(hasattr(updated_campaign, "tracking"))
        self.assertFalse(updated_campaign.tracking.opens)
        self.assertTrue(updated_campaign.tracking.html_clicks)


class PlaceholderValidationTests(TestCase):
    """Test placeholder validation logic"""

    def setUp(self):
        self.user = User.objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345"
        )

    def test_valid_subject_and_preview(self):
        """Test valid subject and preview text without placeholders"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        serializer = CampaignSettingsSerializer(data={
            "campaign": campaign.id,
            "subject_line": "Welcome to our newsletter!",
            "preview_text": "Check out our latest updates."
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_unreplaced_placeholder_in_subject(self):
        """Test validation fails with unreplaced placeholder in subject"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        serializer = CampaignSettingsSerializer(data={
            "campaign": campaign.id,
            "subject_line": "Hello *|NAME|*, welcome!",
            "preview_text": "Preview text is clean."
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("placeholders", serializer.errors)

    def test_unreplaced_placeholder_in_preview(self):
        """Test validation fails with unreplaced placeholder in preview"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        serializer = CampaignSettingsSerializer(data={
            "campaign": campaign.id,
            "subject_line": "Hello there!",
            "preview_text": "Hi *|EMAIL|*, check this out!"
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("placeholders", serializer.errors)

    def test_multiple_placeholders_in_subject(self):
        """Test validation fails with multiple placeholders in subject"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        serializer = CampaignSettingsSerializer(data={
            "campaign": campaign.id,
            "subject_line": "Hello *|NAME|*, your order *|ORDER_ID|* is ready!",
            "preview_text": "Clean preview text."
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("placeholders", serializer.errors)

    def test_placeholders_in_both_subject_and_preview(self):
        """Test validation fails with placeholders in both fields"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        serializer = CampaignSettingsSerializer(data={
            "campaign": campaign.id,
            "subject_line": "Hello *|NAME|*!",
            "preview_text": "Your *|POINTS|* points are waiting!"
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn("placeholders", serializer.errors)

    def test_various_placeholder_formats(self):
        """Test different placeholder formats"""
        test_cases = [
            "*|NAME|*",
            "*|EMAIL|*",
            "*|ORDER_ID|*",
            "*|POINTS|*",
            "*|UNSUBSCRIBE|*",
            "*|UPDATE_PROFILE|*"
        ]
        
        campaign = Campaign.objects.create(user=self.user, type="regular")
        for placeholder in test_cases:
            with self.subTest(placeholder=placeholder):
                serializer = CampaignSettingsSerializer(data={
                    "campaign": campaign.id,
                    "subject_line": f"Hello {placeholder}!",
                    "preview_text": "Clean preview."
                })
                self.assertFalse(serializer.is_valid(), f"Should fail for {placeholder}")
                self.assertIn("placeholders", serializer.errors)

    def test_valid_with_replaced_placeholders(self):
        """Test validation passes when placeholders are replaced"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        serializer = CampaignSettingsSerializer(data={
            "campaign": campaign.id,
            "subject_line": "Hello John, welcome!",
            "preview_text": "Check out our latest updates for john@example.com."
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_empty_strings(self):
        """Test validation with empty strings"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        serializer = CampaignSettingsSerializer(data={
            "campaign": campaign.id,
            "subject_line": "",
            "preview_text": ""
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_none_values(self):
        """Test validation with None values"""
        campaign = Campaign.objects.create(user=self.user, type="regular")
        serializer = CampaignSettingsSerializer(data={
            "campaign": campaign.id,
            "subject_line": None,
            "preview_text": None
        })
        self.assertTrue(serializer.is_valid(), serializer.errors)


class RelatedObjectSerializerTests(TestCase):
    """Test serializers for related objects"""

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

    def test_campaign_recipients_serializer(self):
        """Test CampaignRecipientsSerializer"""
        recipients = CampaignRecipients.objects.create(
            campaign=self.campaign,
            list_id="list123",
            list_name="Test List",
            list_is_active=True,
            segment_text="Active users",
            segment_opts={"status": "active"}
        )
        
        serializer = CampaignRecipientsSerializer(recipients)
        data = serializer.data
        
        self.assertEqual(data["list_id"], "list123")
        self.assertEqual(data["list_name"], "Test List")
        self.assertTrue(data["list_is_active"])
        self.assertEqual(data["segment_text"], "Active users")

    def test_campaign_variate_settings_serializer(self):
        """Test CampaignVariateSettingsSerializer"""
        variate_settings = CampaignVariateSettings.objects.create(
            campaign=self.campaign,
            winner_criteria="opens",
            wait_time=24,
            test_size=1000,
            subject_lines=["Subject A", "Subject B"],
            combinations=[{"id": "combo1", "subject": 0}]
        )
        
        serializer = CampaignVariateSettingsSerializer(variate_settings)
        data = serializer.data
        
        self.assertEqual(data["winner_criteria"], "opens")
        self.assertEqual(data["wait_time"], 24)
        self.assertEqual(len(data["subject_lines"]), 2)

    def test_campaign_tracking_serializer(self):
        """Test CampaignTrackingSerializer"""
        tracking = CampaignTracking.objects.create(
            campaign=self.campaign,
            opens=True,
            html_clicks=True,
            text_clicks=False,
            google_analytics="GA-123456789",
            salesforce={"account": "sf_account"}
        )
        
        serializer = CampaignTrackingSerializer(tracking)
        data = serializer.data
        
        self.assertTrue(data["opens"])
        self.assertTrue(data["html_clicks"])
        self.assertFalse(data["text_clicks"])
        self.assertEqual(data["google_analytics"], "GA-123456789")

    def test_campaign_rss_options_serializer(self):
        """Test CampaignRSSOptionsSerializer"""
        rss_opts = CampaignRSSOptions.objects.create(
            campaign=self.campaign,
            feed_url="https://example.com/rss",
            frequency="daily",
            schedule={"time": "10:00", "days": ["monday"]},
            constrain_rss_img=True
        )
        
        serializer = CampaignRSSOptionsSerializer(rss_opts)
        data = serializer.data
        
        self.assertEqual(data["feed_url"], "https://example.com/rss")
        self.assertEqual(data["frequency"], "daily")
        self.assertTrue(data["constrain_rss_img"])

    def test_campaign_ab_split_options_serializer(self):
        """Test CampaignABSplitOptionsSerializer"""
        ab_split = CampaignABSplitOptions.objects.create(
            campaign=self.campaign,
            split_test="subject",
            pick_winner="opens",
            wait_time=24,
            split_size=0.5,
            from_name_a="Company A",
            subject_a="Subject A"
        )
        
        serializer = CampaignABSplitOptionsSerializer(ab_split)
        data = serializer.data
        
        self.assertEqual(data["split_test"], "subject")
        self.assertEqual(data["pick_winner"], "opens")
        self.assertEqual(data["split_size"], 0.5)
        self.assertEqual(data["from_name_a"], "Company A")

    def test_campaign_social_card_serializer(self):
        """Test CampaignSocialCardSerializer"""
        social_card = CampaignSocialCard.objects.create(
            campaign=self.campaign,
            title="Social Card Title",
            description="Social card description",
            image_url="https://example.com/image.jpg"
        )
        
        serializer = CampaignSocialCardSerializer(social_card)
        data = serializer.data
        
        self.assertEqual(data["title"], "Social Card Title")
        self.assertEqual(data["description"], "Social card description")
        self.assertEqual(data["image_url"], "https://example.com/image.jpg")

    def test_campaign_report_summary_serializer(self):
        """Test CampaignReportSummarySerializer"""
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
        
        serializer = CampaignReportSummarySerializer(report_summary)
        data = serializer.data
        
        self.assertEqual(data["opens"], 1000)
        self.assertEqual(data["open_rate"], 0.8)
        self.assertEqual(data["ecommerce"]["orders"], 10)

    def test_campaign_delivery_status_serializer(self):
        """Test CampaignDeliveryStatusSerializer"""
        delivery_status = CampaignDeliveryStatus.objects.create(
            campaign=self.campaign,
            enabled=True,
            can_cancel=False,
            status="delivered",
            emails_sent=1000,
            emails_canceled=0
        )
        
        serializer = CampaignDeliveryStatusSerializer(delivery_status)
        data = serializer.data
        
        self.assertTrue(data["enabled"])
        self.assertFalse(data["can_cancel"])
        self.assertEqual(data["status"], "delivered")
        self.assertEqual(data["emails_sent"], 1000)

    def test_campaign_resend_shortcut_eligibility_serializer(self):
        """Test CampaignResendShortcutEligibilitySerializer"""
        eligibility = CampaignResendShortcutEligibility.objects.create(
            campaign=self.campaign,
            to_non_openers={"enabled": True, "hours": 24},
            to_new_subscribers={"enabled": True, "hours": 48},
            to_non_clickers={"enabled": False}
        )
        
        serializer = CampaignResendShortcutEligibilitySerializer(eligibility)
        data = serializer.data
        
        self.assertTrue(data["to_non_openers"]["enabled"])
        self.assertTrue(data["to_new_subscribers"]["enabled"])
        self.assertFalse(data["to_non_clickers"]["enabled"])

    def test_campaign_resend_shortcut_usage_serializer(self):
        """Test CampaignResendShortcutUsageSerializer"""
        usage = CampaignResendShortcutUsage.objects.create(
            campaign=self.campaign,
            shortcut_campaigns=[{"id": "shortcut1", "type": "non_openers"}],
            original_campaign={"id": "original1", "sent_at": "2024-01-01T10:00:00Z"}
        )
        
        serializer = CampaignResendShortcutUsageSerializer(usage)
        data = serializer.data
        
        self.assertEqual(len(data["shortcut_campaigns"]), 1)
        self.assertEqual(data["original_campaign"]["id"], "original1")