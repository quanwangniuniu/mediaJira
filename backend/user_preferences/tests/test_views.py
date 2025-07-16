from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from user_preferences.models import UserPreferences

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