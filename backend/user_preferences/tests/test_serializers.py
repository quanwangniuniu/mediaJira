from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIRequestFactory
from user_preferences.models import UserPreferences, SlackIntegration
from user_preferences.serializers import UserPreferencesSerializer, SlackIntegrationSerializer

User = get_user_model()

class UserPreferencesSerializerTest(TestCase):
    """
    Test cases for UserPreferencesSerializer
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-cn'
        )
    
    def test_serializer_contains_expected_fields(self):
        """Test that serializer contains timezone and language fields"""
        serializer = UserPreferencesSerializer(instance=self.preferences)
        data = serializer.data
        
        self.assertIn('timezone', data)
        self.assertIn('language', data)
        self.assertEqual(data['timezone'], 'Asia/Shanghai')
        self.assertEqual(data['language'], 'zh-cn')
    
    def test_serializer_with_valid_data(self):
        """Test serializer with valid input data"""
        valid_data = {
            'timezone': 'UTC',
            'language': 'en'
        }
        
        serializer = UserPreferencesSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['timezone'], 'UTC')
        self.assertEqual(serializer.validated_data['language'], 'en')
    
    def test_serializer_with_valid_timezone(self):
        """Test that serializer accepts valid timezones"""
        valid_timezones = ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London']
        
        for timezone in valid_timezones:
            with self.subTest(timezone=timezone):
                data = {'timezone': timezone}
                serializer = UserPreferencesSerializer(data=data)
                self.assertTrue(serializer.is_valid(), 
                              f"Timezone {timezone} should be valid")
    
    def test_serializer_with_invalid_timezone(self):
        """Test that serializer rejects invalid timezones"""
        invalid_timezones = ['Invalid/Timezone', 'Bad/Zone', 'NotReal/Place']
        
        for timezone in invalid_timezones:
            with self.subTest(timezone=timezone):
                data = {'timezone': timezone}
                serializer = UserPreferencesSerializer(data=data)
                self.assertFalse(serializer.is_valid())
                self.assertIn('timezone', serializer.errors)
                self.assertIn('Invalid timezone', str(serializer.errors['timezone']))
    
    def test_serializer_with_valid_language(self):
        """Test that serializer accepts valid languages"""
        # Note: These should match your Django settings.LANGUAGES
        valid_languages = ['en', 'ja', 'zh-hant']
        
        for language in valid_languages:
            with self.subTest(language=language):
                data = {'language': language}
                serializer = UserPreferencesSerializer(data=data)
                self.assertTrue(serializer.is_valid(), 
                              f"Language {language} should be valid")
    
    def test_serializer_with_invalid_language(self):
        """Test that serializer rejects invalid languages"""
        invalid_languages = ['invalid-lang', 'xyz', 'not-a-language']
        
        for language in invalid_languages:
            with self.subTest(language=language):
                data = {'language': language}
                serializer = UserPreferencesSerializer(data=data)
                self.assertFalse(serializer.is_valid())
                self.assertIn('language', serializer.errors)
                self.assertIn('Invalid language', str(serializer.errors['language']))
    
    def test_serializer_with_empty_values(self):
        """Test that serializer handles empty/null values"""
        data = {
            'timezone': None,
            'language': None
        }
        
        serializer = UserPreferencesSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertIsNone(serializer.validated_data['timezone'])
        self.assertIsNone(serializer.validated_data['language'])
    
    def test_serializer_with_empty_strings(self):
        """Test that serializer handles empty strings"""
        data = {
            'timezone': '',
            'language': ''
        }
        
        serializer = UserPreferencesSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        # Empty strings should pass validation (because of 'if value' check)
    
    def test_serializer_partial_update(self):
        """Test that serializer supports partial updates (PATCH)"""
        # Test updating only timezone
        data = {'timezone': 'Europe/London'}
        serializer = UserPreferencesSerializer(
            instance=self.preferences,
            data=data,
            partial=True
        )
        
        self.assertTrue(serializer.is_valid())
        updated_preferences = serializer.save()
        self.assertEqual(updated_preferences.timezone, 'Europe/London')
        self.assertEqual(updated_preferences.language, 'zh-cn')  # Should remain unchanged
    
    def test_serializer_multiple_validation_errors(self):
        """Test that serializer can return multiple validation errors"""
        invalid_data = {
            'timezone': 'Invalid/Timezone',
            'language': 'invalid-lang'
        }
        
        serializer = UserPreferencesSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        
        # Should have errors for both fields
        self.assertIn('timezone', serializer.errors)
        self.assertIn('language', serializer.errors)
        self.assertEqual(len(serializer.errors), 2)


class SlackIntegrationSerializerTest(TestCase):
    """
    Test cases for SlackIntegrationSerializer
    
    Tests serializer functionality while relying on model clean() for detailed validation
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='slackuser',
            email='slack@example.com',
            password='testpass123'
        )
        self.valid_webhook_url = 'https://hooks.slack.com/services/T123456/B123456/abcdefghijklmnop'
        
        self.slack_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url,
            channel_name='Test Channel',
            is_active=True
        )
    
    def test_serializer_contains_expected_fields(self):
        """Test that serializer contains all expected fields"""
        serializer = SlackIntegrationSerializer(instance=self.slack_integration)
        data = serializer.data
        
        expected_fields = ['webhook_url', 'channel_name', 'is_active', 'created_at', 'updated_at']
        
        for field in expected_fields:
            self.assertIn(field, data)
        
        # Verify field values
        self.assertEqual(data['webhook_url'], self.valid_webhook_url)
        self.assertEqual(data['channel_name'], 'Test Channel')
        self.assertTrue(data['is_active'])
        self.assertIsNotNone(data['created_at'])
        self.assertIsNotNone(data['updated_at'])
    
    def test_serializer_with_valid_data(self):
        """Test serializer with valid Slack integration data"""
        valid_data = {
            'webhook_url': self.valid_webhook_url,
            'channel_name': 'Marketing Team',
            'is_active': True
        }
        
        serializer = SlackIntegrationSerializer(data=valid_data)
        self.assertTrue(serializer.is_valid(), f"Serializer errors: {serializer.errors}")
        self.assertEqual(serializer.validated_data['webhook_url'], self.valid_webhook_url)
        self.assertEqual(serializer.validated_data['channel_name'], 'Marketing Team')
        self.assertTrue(serializer.validated_data['is_active'])
    
    def test_serializer_with_minimal_valid_data(self):
        """Test serializer with minimal required data"""
        minimal_data = {
            'webhook_url': self.valid_webhook_url
        }
        
        serializer = SlackIntegrationSerializer(data=minimal_data)
        self.assertTrue(serializer.is_valid(), f"Serializer errors: {serializer.errors}")
        self.assertEqual(serializer.validated_data['webhook_url'], self.valid_webhook_url)
        # Optional fields should use defaults
        self.assertNotIn('channel_name', serializer.validated_data)
        self.assertNotIn('is_active', serializer.validated_data)  # Will use model default
    
    def test_serializer_calls_model_validation(self):
        """Test that serializer calls model clean() method for validation"""
        # Test with invalid webhook URL - should be caught by model validation
        invalid_data = {
            'webhook_url': 'https://invalid-webhook-url.com/not-slack'
        }
        
        serializer = SlackIntegrationSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        # The error should come from model validation (clean method)
        self.assertIn('webhook_url', serializer.errors)
    
    def test_serializer_validation_with_empty_webhook_url(self):
        """Test validation with empty webhook URL"""
        invalid_data = {
            'webhook_url': ''
        }
        
        serializer = SlackIntegrationSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('webhook_url', serializer.errors)
    
    def test_serializer_validation_with_none_webhook_url(self):
        """Test validation with None webhook URL"""
        invalid_data = {
            'webhook_url': None
        }
        
        serializer = SlackIntegrationSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())
        # This should fail at the URLField level before reaching model validation
        self.assertIn('webhook_url', serializer.errors)
    
    def test_serializer_partial_update(self):
        """Test serializer partial update functionality"""
        update_data = {
            'channel_name': 'Updated Channel Name',
            'is_active': False
        }
        
        serializer = SlackIntegrationSerializer(
            instance=self.slack_integration,
            data=update_data,
            partial=True
        )
        
        self.assertTrue(serializer.is_valid(), f"Serializer errors: {serializer.errors}")
        updated_integration = serializer.save()
        
        # Check that specified fields were updated
        self.assertEqual(updated_integration.channel_name, 'Updated Channel Name')
        self.assertFalse(updated_integration.is_active)
        # Check that unspecified fields remained unchanged
        self.assertEqual(updated_integration.webhook_url, self.valid_webhook_url)
    
    def test_serializer_full_update(self):
        """Test serializer full update functionality"""
        new_webhook_url = 'https://hooks.slack.com/services/T999999/B999999/newtoken123456'
        update_data = {
            'webhook_url': new_webhook_url,
            'channel_name': 'Completely New Channel',
            'is_active': True
        }
        
        serializer = SlackIntegrationSerializer(
            instance=self.slack_integration,
            data=update_data
        )
        
        self.assertTrue(serializer.is_valid(), f"Serializer errors: {serializer.errors}")
        updated_integration = serializer.save()
        
        self.assertEqual(updated_integration.webhook_url, new_webhook_url)
        self.assertEqual(updated_integration.channel_name, 'Completely New Channel')
        self.assertTrue(updated_integration.is_active)
    
    def test_read_only_fields(self):
        """Test that read-only fields are not included in validation"""
        data = {
            'webhook_url': self.valid_webhook_url,
            'channel_name': 'Test Channel',
            'created_at': '2023-01-01T00:00:00Z',  # Should be ignored
            'updated_at': '2023-01-01T00:00:00Z',  # Should be ignored
        }
        
        serializer = SlackIntegrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # Read-only fields should not be in validated_data
        self.assertNotIn('created_at', serializer.validated_data)
        self.assertNotIn('updated_at', serializer.validated_data)
        
        # But they should appear in the serialized output
        integration = serializer.save(user=self.user)
        output_serializer = SlackIntegrationSerializer(instance=integration)
        output_data = output_serializer.data
        self.assertIn('created_at', output_data)
        self.assertIn('updated_at', output_data)
    
    def test_serializer_with_optional_channel_name(self):
        """Test serializer with None and empty string channel names"""
        test_cases = [
            {'channel_name': None},
            {'channel_name': ''},
            {}  # No channel_name provided
        ]
        
        for case in test_cases:
            with self.subTest(case=case):
                data = {
                    'webhook_url': self.valid_webhook_url,
                    **case
                }
                
                serializer = SlackIntegrationSerializer(data=data)
                self.assertTrue(serializer.is_valid(), 
                              f"Case {case} failed: {serializer.errors}")
    
    def test_serializer_model_validation_integration(self):
        """Test that model validation errors are properly converted to serializer errors"""
        # Use various invalid webhook URLs that should be caught by model validation
        invalid_cases = [
            'https://hooks.discord.com/services/T123456/B123456/token',  # Wrong domain
            'https://hooks.slack.com/services/T123456/B123456',  # Missing token
            'https://hooks.slack.com/services//B123456/token',  # Empty team ID
        ]
        
        for invalid_url in invalid_cases:
            with self.subTest(url=invalid_url):
                data = {'webhook_url': invalid_url}
                serializer = SlackIntegrationSerializer(data=data)
                
                self.assertFalse(serializer.is_valid())
                self.assertIn('webhook_url', serializer.errors)
                # Error message should come from model validation
                error_message = str(serializer.errors['webhook_url'][0])
                self.assertIn('Slack webhook', error_message)
    
    def test_serializer_save_creates_instance(self):
        """Test that serializer save creates a valid instance"""
        data = {
            'webhook_url': self.valid_webhook_url,
            'channel_name': 'New Integration',
            'is_active': True
        }
        
        serializer = SlackIntegrationSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # Save requires user to be provided since it's not in the serializer
        integration = serializer.save(user=self.user)
        
        self.assertIsInstance(integration, SlackIntegration)
        self.assertEqual(integration.user, self.user)
        self.assertEqual(integration.webhook_url, self.valid_webhook_url)
        self.assertEqual(integration.channel_name, 'New Integration')
        self.assertTrue(integration.is_active)
        
        # Verify it was actually saved to database
        self.assertTrue(SlackIntegration.objects.filter(id=integration.id).exists())