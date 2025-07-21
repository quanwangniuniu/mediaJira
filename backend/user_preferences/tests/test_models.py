from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from user_preferences.models import UserPreferences, SlackIntegration
from django.core.exceptions import ValidationError

User = get_user_model()

class UserPreferencesModelTest(TestCase):
    """
    Test cases for UserPreferences model
    
    Tests basic model functionality, relationships, and constraints
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_preferences_creation(self):
        """Test basic UserPreferences creation"""
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-cn'
        )
        
        self.assertEqual(preferences.user, self.user)
        self.assertEqual(preferences.timezone, 'Asia/Shanghai')
        self.assertEqual(preferences.language, 'zh-cn')

    
    def test_user_preferences_string_representation(self):
        """Test string representation of user preferences"""
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='UTC'
        )
        
        expected = f"{self.user.username}'s preferences"
        self.assertEqual(str(preferences), expected)
    
    def test_one_to_one_relationship(self):
        """Test OneToOne relationship with User"""
        # Create preferences
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='UTC'
        )
        
        # Test forward relationship: UserPreferences -> User
        self.assertEqual(preferences.user, self.user)

        # Test reverse relationship: User -> UserPreferences
        self.assertEqual(self.user.preferences, preferences)
        
        
    
    def test_user_preferences_uniqueness(self):
        """Test that each user can only have one preferences record"""
        # Create first preferences
        UserPreferences.objects.create(
            user=self.user,
            timezone='UTC'
        )
        
        # Try to create second preferences for same user - should fail
        with self.assertRaises(IntegrityError):
            UserPreferences.objects.create(
                user=self.user,
                timezone='Asia/Shanghai'
            )
    

class SlackIntegrationModelTest(TestCase):
    """
    Test cases for SlackIntegration model
    
    Tests Slack integration functionality, validation, and relationships
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='slackuser',
            email='slack@example.com',
            password='testpass123'
        )
        self.valid_webhook_url = 'https://hooks.slack.com/services/T123456/B123456/abcdefghijklmnop'
        self.user2 = User.objects.create_user(
            username='slackuser2',
            email='slack2@example.com',
            password='testpass123'
        )
    
    def test_slack_integration_creation(self):
        """Test basic SlackIntegration creation with required fields"""
        slack_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url,
            channel_name='Marketing Team',
            is_active=True
        )
        
        self.assertEqual(slack_integration.user, self.user)
        self.assertEqual(slack_integration.webhook_url, self.valid_webhook_url)
        self.assertEqual(slack_integration.channel_name, 'Marketing Team')
        self.assertTrue(slack_integration.is_active)
        self.assertIsNotNone(slack_integration.created_at)
        self.assertIsNotNone(slack_integration.updated_at)
    
    def test_slack_integration_default_values(self):
        """Test default values for SlackIntegration fields"""
        slack_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url
        )
        
        # Test defaults
        self.assertTrue(slack_integration.is_active)  # Default should be True
        self.assertIsNone(slack_integration.channel_name)  # Optional field
    
    def test_slack_integration_string_representation(self):
        """Test string representation of SlackIntegration"""
        # Test with channel name
        slack_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url,
            channel_name='Marketing Team'
        )
        expected = f"{self.user.username}'s Marketing Team"
        self.assertEqual(str(slack_integration), expected)
        
        # Test without channel name (should use default)
        slack_integration_no_name = SlackIntegration.objects.create(
            user=self.user2,
            webhook_url=self.valid_webhook_url
        )
        expected_no_name = f"{self.user2.username}'s Slack Integration"
        self.assertEqual(str(slack_integration_no_name), expected_no_name)
    
    def test_slack_integration_user_relationship(self):
        """Test ForeignKey relationship with User"""
        slack_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url
        )
        
        # Test forward relationship: SlackIntegration -> User
        self.assertEqual(slack_integration.user, self.user)
        
        # Test reverse relationship: User -> SlackIntegrations
        self.assertIn(slack_integration, self.user.slack_integrations.all())
    
    
    def test_valid_slack_webhook_url_formats(self):
        """Test validation accepts valid Slack webhook URLs"""
        valid_urls = [
            'https://hooks.slack.com/services/T123456/B123456/abcdefghijklmnop',
            'https://hooks.slack.com/services/TABCDEF/BGHIJKL/1234567890abcdef',
            'https://hooks.slack.com/services/T0123456789/B0123456789/AbCdEf1234567890',
        ]
        
        for i, url in enumerate(valid_urls):
            user = User.objects.create_user(
                username=f'user{i}',
                email=f'user{i}@example.com',
                password='testpass123'
            )
            slack_integration = SlackIntegration(
                user=user,
                webhook_url=url
            )
            
            # Should not raise ValidationError
            try:
                slack_integration.clean()
                slack_integration.save()
            except ValidationError:
                self.fail(f"Valid URL {url} was rejected by validation")
    
    def test_invalid_slack_webhook_url_validation(self):
        """Test validation rejects invalid Slack webhook URLs"""
        invalid_urls = [
            # Wrong domain
            'https://hooks.discord.com/services/T123456/B123456/abcdefghijklmnop',
            # Missing https
            'http://hooks.slack.com/services/T123456/B123456/abcdefghijklmnop',
            # Wrong path
            'https://hooks.slack.com/webhooks/T123456/B123456/abcdefghijklmnop',
            # Missing parts
            'https://hooks.slack.com/services/T123456/B123456',
            'https://hooks.slack.com/services/T123456',
            'https://hooks.slack.com/services/',
            # Extra parts
            'https://hooks.slack.com/services/T123456/B123456/token/extra',
            # Empty parts
            'https://hooks.slack.com/services//B123456/token',
            'https://hooks.slack.com/services/T123456//token',
            'https://hooks.slack.com/services/T123456/B123456/',
            # Completely wrong format
            'https://example.com/webhook',
            'not-a-url-at-all',
            '',
        ]
        
        for url in invalid_urls:
            slack_integration = SlackIntegration(
                user=self.user,
                webhook_url=url
            )
            
            with self.assertRaises(ValidationError, msg=f"Invalid URL {url} was accepted"):
                slack_integration.clean()
    
    def test_slack_webhook_url_required(self):
        """Test that webhook_url is required"""
        with self.assertRaises(ValidationError):
            slack_integration = SlackIntegration(
                user=self.user,
                webhook_url=None
            )
            slack_integration.clean()
    
    def test_send_mock_notification_active(self):
        """Test mock notification sending when integration is active"""
        slack_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url,
            channel_name='Test Channel',
            is_active=True
        )
        
        # Should return True for active integration
        result = slack_integration.send_mock_notification('Test message')
        self.assertTrue(result)
    
    def test_send_mock_notification_inactive(self):
        """Test mock notification sending when integration is inactive"""
        slack_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url,
            is_active=False
        )
        
        # Should return False for inactive integration
        result = slack_integration.send_mock_notification('Test message')
        self.assertFalse(result)
    
    def test_cascade_delete_on_user_deletion(self):
        """Test that SlackIntegration is deleted when User is deleted"""
        slack_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url
        )
        
        integration_id = slack_integration.id
        
        # Delete the user
        self.user.delete()
        
        # SlackIntegration should be deleted too (CASCADE)
        with self.assertRaises(SlackIntegration.DoesNotExist):
            SlackIntegration.objects.get(id=integration_id)
    
    def test_multiple_users_can_have_slack_integrations(self):
        """Test that different users can have their own SlackIntegrations"""
        slack_integration1 = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url,
            channel_name='User1 Channel'
        )
        
        slack_integration2 = SlackIntegration.objects.create(
            user=self.user2,
            webhook_url=self.valid_webhook_url,
            channel_name='User2 Channel'
        )
        
        # Both should exist and be different
        self.assertNotEqual(slack_integration1.id, slack_integration2.id)
        self.assertEqual(slack_integration1.user, self.user)
        self.assertEqual(slack_integration2.user, self.user2)
        
        # Total count should be 2
        self.assertEqual(SlackIntegration.objects.count(), 2)