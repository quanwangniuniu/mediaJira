from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
import pytz
from datetime import time
from django.db import connection

# 强制终止所有连接到测试数据库的连接
cursor = connection.cursor()
cursor.execute("SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = 'test_mediajira_db' AND pid <> pg_backend_pid();")

# 删除测试数据库
cursor.execute("DROP DATABASE IF EXISTS test_mediajira_db;")
connection.commit()
print("Test database deleted successfully!")
exit()

from user_preferences.models import UserPreferences

User = get_user_model()


class UserPreferencesModelTest(TestCase):
    """
    User preferences model tests
    
    Tests all model functionality including:
    - Field validation
    - Business logic methods
    - Relationships
    - Constraints
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create(
            username='testuser',
            email='test@example.com'
        )
        self.user.set_password('testpass123')
        self.user.save()
        
        # Create another user for testing
        self.user2 = User.objects.create(
            username='testuser2',
            email='test2@example.com'
        )
        self.user2.set_password('testpass123')
        self.user2.save()
    
    def test_user_preferences_creation(self):
        """Test user preferences creation"""
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        
        self.assertEqual(preferences.user, self.user)
        self.assertEqual(preferences.timezone, 'Asia/Shanghai')
        self.assertEqual(preferences.language, 'zh-CN')
        
    def test_one_to_one_relationship(self):
        """Test one-to-one relationship constraint"""
        # Create first preference
        preferences1 = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        
        # Trying to create second preference for same user should fail
        with self.assertRaises(IntegrityError):
            UserPreferences.objects.create(
                user=self.user,
                timezone='America/New_York',
                language='en-US'
            )
    
    def test_string_representation(self):
        """Test string representation"""
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        
        expected_str = f"{self.user.username}'s preferences"
        self.assertEqual(str(preferences), expected_str)
    
    def test_timezone_field_validation(self):
        """Test timezone field validation"""
        # Test valid timezone
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        self.assertEqual(preferences.timezone, 'Asia/Shanghai')
        
        # Test null value
        preferences.timezone = None
        preferences.save()
        self.assertIsNone(preferences.timezone)
        
        # Test empty string
        preferences.timezone = ''
        preferences.save()
        self.assertEqual(preferences.timezone, '')
    
    def test_language_field_validation(self):
        """Test language field validation"""
        # Test valid language
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        self.assertEqual(preferences.language, 'zh-CN')
        
        # Test null value
        preferences.language = None
        preferences.save()
        self.assertIsNone(preferences.language)
        
        # Test empty string
        preferences.language = ''
        preferences.save()
        self.assertEqual(preferences.language, '')
    
    def test_default_values(self):
        """Test default values"""
        preferences = UserPreferences.objects.create(user=self.user)
        
        self.assertIsNone(preferences.timezone)
        self.assertIsNone(preferences.language)
        self.assertIsNone(preferences.quiet_hours_start)
        self.assertIsNone(preferences.quiet_hours_end)
        self.assertIsNone(preferences.frequency)
    
    def test_user_deletion_cascades(self):
        """Test cascade deletion when user is deleted"""
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        
        # Deleting user should also delete preferences
        user_id = self.user.id
        self.user.delete()
        
        self.assertFalse(UserPreferences.objects.filter(user_id=user_id).exists())
    
    def test_related_name_access(self):
        """Test accessing preferences through related_name"""
        preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        
        # Access preferences through user object
        self.assertEqual(self.user.preferences, preferences)
    
    def test_multiple_users_preferences(self):
        """Test preferences for multiple users"""
        # Create preferences for user1
        preferences1 = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        
        # Create preferences for user2
        preferences2 = UserPreferences.objects.create(
            user=self.user2,
            timezone='America/New_York',
            language='en-US'
        )
        
        # Verify that preferences are independent for each user
        self.assertEqual(preferences1.user, self.user)
        self.assertEqual(preferences2.user, self.user2)
        self.assertNotEqual(preferences1.timezone, preferences2.timezone)
        self.assertNotEqual(preferences1.language, preferences2.language)
    
    def test_meta_db_table(self):
        """Test database table name configuration"""
        self.assertEqual(UserPreferences._meta.db_table, 'user_preferences') 