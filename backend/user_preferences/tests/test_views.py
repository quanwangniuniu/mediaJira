from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from user_preferences.models import UserPreferences, SlackIntegration

User = get_user_model()

class UserPreferencesViewTest(TestCase):
    """
    Test cases for UserPreferencesView API endpoints
    """
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        # Create preferences for the main user
        self.preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-cn'
        )
        
        self.url = reverse('user_preferences:user-preferences')
    
    def test_get_user_preferences_success(self):
        """Test authenticated user can retrieve their preferences"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['timezone'], 'Asia/Shanghai')
        self.assertEqual(response.data['language'], 'zh-cn')
    
    def test_get_user_preferences_unauthenticated(self):
        """Test unauthenticated user cannot access preferences"""
        response = self.client.get(self.url)
        print(response.status_code)
        
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_patch_user_preferences_success(self):
        """Test authenticated user can update their preferences"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'timezone': 'UTC',
            'language': 'en'
        }
        
        response = self.client.patch(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['timezone'], 'UTC')
        self.assertEqual(response.data['language'], 'en')
        
        # Verify database was updated
        self.preferences.refresh_from_db()
        self.assertEqual(self.preferences.timezone, 'UTC')
        self.assertEqual(self.preferences.language, 'en')
    
    def test_patch_user_preferences_partial_update(self):
        """Test user can update single field (partial update)"""
        self.client.force_authenticate(user=self.user)
        
        data = {'timezone': 'Europe/London'}
        
        response = self.client.patch(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['timezone'], 'Europe/London')
        self.assertEqual(response.data['language'], 'zh-cn')  # Should remain unchanged
    
    def test_patch_user_preferences_unauthenticated(self):
        """Test unauthenticated user cannot update preferences"""
        data = {'timezone': 'UTC'}
        
        response = self.client.patch(self.url, data, format='json')
        print(response.status_code)
        
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_patch_user_preferences_invalid_data(self):
        """Test updating preferences with invalid data returns validation errors"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'timezone': 'Invalid/Timezone',
            'language': 'invalid-lang'
        }
        
        response = self.client.patch(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('timezone', response.data)
        self.assertIn('language', response.data)

class SlackIntegrationViewTest(TestCase):
    """
    Test cases for SlackIntegrationView API endpoints
    Tests PROFILE-04 Slack integration functionality
    """
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='slackuser',
            email='slack@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        self.valid_webhook_url = 'https://hooks.slack.com/services/T123456/B123456/abcdefghijklmnop'
        self.url = reverse('user_preferences:slack-integration')
        
        # Create existing integration for some tests
        self.existing_integration = SlackIntegration.objects.create(
            user=self.user,
            webhook_url=self.valid_webhook_url,
            channel_name='Test Channel',
            is_active=True
        )
    
    def test_post_create_slack_integration_success(self):
        """Test creating new Slack integration"""
        self.client.force_authenticate(user=self.other_user)  # User without existing integration
        
        data = {
            'webhook_url': self.valid_webhook_url,
            'channel_name': 'Marketing Team',
            'is_active': True
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('integration', response.data)
        self.assertEqual(response.data['integration']['webhook_url'], self.valid_webhook_url)
        self.assertEqual(response.data['integration']['channel_name'], 'Marketing Team')
        
        # Verify database
        integration = SlackIntegration.objects.get(user=self.other_user)
        self.assertEqual(integration.webhook_url, self.valid_webhook_url)
        self.assertEqual(integration.channel_name, 'Marketing Team')
    
    def test_post_update_existing_slack_integration(self):
        """Test updating existing Slack integration"""
        self.client.force_authenticate(user=self.user)  # User with existing integration
        
        data = {
            'webhook_url': 'https://hooks.slack.com/services/T999999/B999999/newtoken123',
            'channel_name': 'Updated Channel',
            'is_active': False
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('updated successfully', response.data['message'])
        
        # Verify database update
        self.existing_integration.refresh_from_db()
        self.assertEqual(self.existing_integration.webhook_url, data['webhook_url'])
        self.assertEqual(self.existing_integration.channel_name, 'Updated Channel')
        self.assertFalse(self.existing_integration.is_active)
    
    def test_post_slack_integration_invalid_webhook_url(self):
        """Test creating integration with invalid webhook URL"""
        self.client.force_authenticate(user=self.other_user)
        
        data = {
            'webhook_url': 'https://invalid-url.com/not-slack',
            'channel_name': 'Test Channel'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('webhook_url', response.data)
    
    def test_post_slack_integration_unauthenticated(self):
        """Test unauthenticated user cannot create integration"""
        data = {
            'webhook_url': self.valid_webhook_url,
            'channel_name': 'Test Channel'
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_get_slack_integration_success(self):
        """Test authenticated user can retrieve their Slack integration"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['webhook_url'], self.valid_webhook_url)
        self.assertEqual(response.data['channel_name'], 'Test Channel')
        self.assertTrue(response.data['is_active'])
    
    def test_get_slack_integration_not_found(self):
        """Test getting integration when none exists"""
        self.client.force_authenticate(user=self.other_user)  # User without integration
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('message', response.data)
    
    def test_get_slack_integration_unauthenticated(self):
        """Test unauthenticated user cannot get integration"""
        response = self.client.get(self.url)
        
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_delete_slack_integration_success(self):
        """Test authenticated user can delete their Slack integration"""
        self.client.force_authenticate(user=self.user)
        
        # Verify integration exists
        self.assertTrue(SlackIntegration.objects.filter(user=self.user).exists())
        
        response = self.client.delete(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('deleted successfully', response.data['message'])
        
        # Verify integration was deleted
        self.assertFalse(SlackIntegration.objects.filter(user=self.user).exists())
    
    def test_delete_slack_integration_not_found(self):
        """Test deleting integration when none exists"""
        self.client.force_authenticate(user=self.other_user)  # User without integration
        
        response = self.client.delete(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
    
    def test_delete_slack_integration_unauthenticated(self):
        """Test unauthenticated user cannot delete integration"""
        response = self.client.delete(self.url)
        
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])
    
    def test_post_partial_update_slack_integration(self):
        """Test partial update of existing integration"""
        self.client.force_authenticate(user=self.user)
        
        # Only update channel name and active status
        data = {
            'channel_name': 'Partially Updated Channel',
            'is_active': False
        }
        
        response = self.client.post(self.url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify partial update
        self.existing_integration.refresh_from_db()
        self.assertEqual(self.existing_integration.channel_name, 'Partially Updated Channel')
        self.assertFalse(self.existing_integration.is_active)
        # webhook_url should remain unchanged
        self.assertEqual(self.existing_integration.webhook_url, self.valid_webhook_url)
    
    def test_user_isolation(self):
        """Test that users can only access their own integrations"""
        # Create integration for other_user
        other_integration = SlackIntegration.objects.create(
            user=self.other_user,
            webhook_url='https://hooks.slack.com/services/T777777/B777777/othertoken',
            channel_name='Other User Channel'
        )
        
        self.client.force_authenticate(user=self.user)
        
        # User should only see their own integration
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['channel_name'], 'Test Channel')  # Not the other user's
        
        # User should only be able to delete their own integration
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Other user's integration should still exist
        self.assertTrue(SlackIntegration.objects.filter(user=self.other_user).exists())
        # User's integration should be deleted
        self.assertFalse(SlackIntegration.objects.filter(user=self.user).exists())