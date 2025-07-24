from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APIRequestFactory
from unittest.mock import patch
from user_preferences.models import UserPreferences, SlackIntegration, NotificationSettings
from user_preferences.serializers import UserPreferencesSerializer, SlackIntegrationSerializer, NotificationSettingsSerializer
from user_preferences.conf.permission_mappings import PERMISSION_MAPPINGS


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
        # Note: These should match your Django settings.LANGUAGES!!!
        valid_languages = ['en', 'ja', 'zh-hant']
        
        for language in valid_languages:
            with self.subTest(language=language):
                data = {'language': language}
                serializer = UserPreferencesSerializer(data=data)
                self.assertTrue(serializer.is_valid(), 
                              f"Language {language} should be valid")
    
    def test_serializer_with_invalid_language(self):
        """Test that serializer rejects invalid languages"""
        # Note: Languages that are not in settings.LANGUAGES are also invalid!!!
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

class NotificationSettingsSerializerTest(TestCase):
    """
    Test NotificationSettingsSerializer permission filtering logic
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser', email='test@example.com', password='pass'
        )
        self.factory = APIRequestFactory()

        # Create a setting that requires CAMPAIGN:VIEW
        self.campaign_setting = NotificationSettings.objects.create(
            user=self.user,
            channel_id=1, channel_name='email', enabled=True,
            setting_key='campaign_failure', module_scope='campaigns'
        )

        # Create a setting that requires no permission (None)
        self.general_setting = NotificationSettings.objects.create(
            user=self.user,
            channel_id=1, channel_name='email', enabled=True,
            setting_key='task_due', module_scope='general'
        )

    def _get_request(self):
        request = self.factory.get('/')
        request.user = self.user
        return request

    @patch('user_preferences.services.permission_service.PermissionService.get_user_permissions')
    def test_returns_data_when_user_has_permission(self, mock_get_perms):
        """Should return data when user has required permission"""
        mock_get_perms.return_value = ['CAMPAIGN:VIEW']

        serializer = NotificationSettingsSerializer(
            self.campaign_setting,
            context={'request': self._get_request()}
        )
        result = serializer.to_representation(self.campaign_setting)

        self.assertIsNotNone(result)
        self.assertEqual(result['setting_key'], 'campaign_failure')

    @patch('user_preferences.services.permission_service.PermissionService.get_user_permissions')
    def test_returns_none_when_user_lacks_permission(self, mock_get_perms):
        """Should return None when user lacks required permission"""
        mock_get_perms.return_value = []  # No permission

        serializer = NotificationSettingsSerializer(
            self.campaign_setting,
            context={'request': self._get_request()}
        )
        result = serializer.to_representation(self.campaign_setting)

        self.assertIsNone(result)

    @patch('user_preferences.services.permission_service.PermissionService.get_user_permissions')
    def test_returns_data_when_no_permission_required(self, mock_get_perms):
        """Should return data when permission requirement is None"""
        mock_get_perms.return_value = []  # user has no permissions

        serializer = NotificationSettingsSerializer(
            self.general_setting,
            context={'request': self._get_request()}
        )
        result = serializer.to_representation(self.general_setting)

        self.assertIsNotNone(result)
        self.assertEqual(result['setting_key'], 'task_due')
        