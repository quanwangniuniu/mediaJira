from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from user_preferences.models import UserPreferences

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