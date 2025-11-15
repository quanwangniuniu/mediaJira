from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import date
from unittest.mock import patch
import uuid

from stripe_meta.models import UsageDaily
from stripe_meta.tasks import reset_daily_usage
from core.models import Organization

User = get_user_model()


class StripeTasksTest(TestCase):
    """Test cases for Stripe Celery tasks"""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        self.user1 = User.objects.create_user(
            username=f"user1_{uuid.uuid4().hex[:8]}",
            email="user1@example.com",
            password="testpass123",
            organization=self.organization
        )
        
        self.user2 = User.objects.create_user(
            username=f"user2_{uuid.uuid4().hex[:8]}",
            email="user2@example.com",
            password="testpass123",
            organization=self.organization
        )
        
        # Create usage records for different dates
        self.usage1 = UsageDaily.objects.create(
            user=self.user1,
            date=date.today(),
            previews_used=5,
            tasks_used=3
        )
        
        self.usage2 = UsageDaily.objects.create(
            user=self.user2,
            date=date.today(),
            previews_used=10,
            tasks_used=7
        )
        
        self.usage3 = UsageDaily.objects.create(
            user=self.user1,
            date=date.today() - timezone.timedelta(days=1),
            previews_used=2,
            tasks_used=1
        )
    
    def test_reset_daily_usage_task(self):
        """Test reset_daily_usage task"""
        # Verify usage records exist before task
        self.assertEqual(UsageDaily.objects.count(), 3)
        self.assertEqual(UsageDaily.objects.filter(user=self.user1).count(), 2)
        self.assertEqual(UsageDaily.objects.filter(user=self.user2).count(), 1)
        
        # Run the task
        result = reset_daily_usage()
        
        # Verify task completed successfully
        self.assertEqual(result['status'], 'success')
        self.assertGreaterEqual(result['deleted_records'], 0)
        
        # Verify all usage records are deleted
        self.assertEqual(UsageDaily.objects.count(), 0)
    
    def test_reset_daily_usage_task_no_records(self):
        """Test reset_daily_usage task when no records exist"""
        # Delete all usage records
        UsageDaily.objects.all().delete()
        
        # Verify no records exist
        self.assertEqual(UsageDaily.objects.count(), 0)
        
        # Run the task
        result = reset_daily_usage()
        
        # Verify task completed successfully even with no records
        self.assertEqual(result['status'], 'success')
        self.assertGreaterEqual(result['deleted_records'], 0)
        
        # Verify still no records exist
        self.assertEqual(UsageDaily.objects.count(), 0)
    
    def test_reset_daily_usage_task_multiple_users(self):
        """Test reset_daily_usage task with multiple users"""
        # Create additional usage records
        user3 = User.objects.create_user(
            username="user3",
            email="user3@example.com",
            password="testpass123",
            organization=self.organization
        )
        
        UsageDaily.objects.create(
            user=user3,
            date=date.today(),
            previews_used=15,
            tasks_used=8
        )
        
        # Verify multiple usage records exist
        self.assertEqual(UsageDaily.objects.count(), 4)
        
        # Run the task
        result = reset_daily_usage()
        
        # Verify task completed successfully
        self.assertEqual(result['status'], 'success')
        self.assertGreaterEqual(result['deleted_records'], 0)
        
        # Verify all usage records are deleted
        self.assertEqual(UsageDaily.objects.count(), 0)
    
    def test_reset_daily_usage_task_different_dates(self):
        """Test reset_daily_usage task with records from different dates"""
        # Create usage records for different dates
        UsageDaily.objects.create(
            user=self.user1,
            date=date.today() + timezone.timedelta(days=1),
            previews_used=1,
            tasks_used=1
        )
        
        UsageDaily.objects.create(
            user=self.user2,
            date=date.today() - timezone.timedelta(days=2),
            previews_used=3,
            tasks_used=2
        )
        
        # Verify usage records exist for different dates
        self.assertEqual(UsageDaily.objects.count(), 5)
        
        # Run the task
        result = reset_daily_usage()
        
        # Verify task completed successfully
        self.assertEqual(result['status'], 'success')
        self.assertGreaterEqual(result['deleted_records'], 0)
        
        # Verify all usage records are deleted regardless of date
        self.assertEqual(UsageDaily.objects.count(), 0)
    
    def test_reset_daily_usage_task_with_high_usage(self):
        """Test reset_daily_usage task with high usage values"""
        # Update usage records with high values
        self.usage1.previews_used = 1000
        self.usage1.tasks_used = 500
        self.usage1.save()
        
        self.usage2.previews_used = 2000
        self.usage2.tasks_used = 1000
        self.usage2.save()
        
        # Verify high usage values
        self.assertEqual(self.usage1.previews_used, 1000)
        self.assertEqual(self.usage1.tasks_used, 500)
        self.assertEqual(self.usage2.previews_used, 2000)
        self.assertEqual(self.usage2.tasks_used, 1000)
        
        # Run the task
        result = reset_daily_usage()
        
        # Verify task completed successfully
        self.assertEqual(result['status'], 'success')
        self.assertGreaterEqual(result['deleted_records'], 0)
        
        # Verify all usage records are deleted
        self.assertEqual(UsageDaily.objects.count(), 0)
    
    @patch('stripe_meta.tasks.logger')
    def test_reset_daily_usage_task_logging(self, mock_logger):
        """Test reset_daily_usage task logging"""
        # Run the task
        result = reset_daily_usage()
        
        # Verify task completed successfully
        self.assertEqual(result['status'], 'success')
        self.assertGreaterEqual(result['deleted_records'], 0)
        
        # Verify logging was called
        mock_logger.info.assert_called()
    
    def test_reset_daily_usage_task_return_value(self):
        """Test reset_daily_usage task return value"""
        result = reset_daily_usage()
        
        # Verify return value
        self.assertIsInstance(result, dict)
        self.assertIn('status', result)
        self.assertEqual(result['status'], 'success')
        self.assertGreaterEqual(result['deleted_records'], 0)
    
    def test_reset_daily_usage_task_idempotent(self):
        """Test reset_daily_usage task is idempotent"""
        # Run the task first time
        result1 = reset_daily_usage()
        self.assertEqual(result1['status'], 'success')
        self.assertEqual(UsageDaily.objects.count(), 0)
        
        # Run the task second time (should still succeed)
        result2 = reset_daily_usage()
        self.assertEqual(result2['status'], 'success')
        self.assertEqual(UsageDaily.objects.count(), 0)
    
    def test_reset_daily_usage_task_performance(self):
        """Test reset_daily_usage task performance with many records"""
        # Create many usage records
        for i in range(100):
            unique_id = uuid.uuid4().hex[:8]
            user = User.objects.create_user(
                username=f"user{i}_{unique_id}",
                email=f"user{i}_{unique_id}@example.com",
                password="testpass123",
                organization=self.organization
            )
            
            UsageDaily.objects.create(
                user=user,
                date=date.today(),
                previews_used=i,
                tasks_used=i
            )
        
        # Verify many records exist
        self.assertEqual(UsageDaily.objects.count(), 103)  # 3 original + 100 new
        
        # Run the task
        result = reset_daily_usage()
        
        # Verify task completed successfully
        self.assertEqual(result['status'], 'success')
        self.assertGreaterEqual(result['deleted_records'], 0)
        
        # Verify all usage records are deleted
        self.assertEqual(UsageDaily.objects.count(), 0)
