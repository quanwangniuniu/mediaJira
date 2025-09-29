"""
Tests for facebook_meta Celery tasks
"""
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from unittest.mock import patch


from facebook_meta.models import AdCreativePreview, AdAccount
from facebook_meta.tasks import cleanup_expired_previews
from django.contrib.auth import get_user_model

User = get_user_model()


class FacebookMetaTasksTestCase(TestCase):
    """Test cases for facebook_meta Celery tasks"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.ad_account = AdAccount.objects.create(
            id='123456789',
            name='Test Account',
            status='ACTIVE'
        )

    def test_cleanup_expired_previews_task(self):
        """Test the cleanup_expired_previews Celery task"""
        
        # Create some test previews
        now = timezone.now()
        
        # Create an expired preview
        expired_preview = AdCreativePreview.objects.create(
            token='expired_token_123',
            expires_at=now - timedelta(hours=1),
            json_spec={'test': 'data'}
        )
        
        # Create a non-expired preview
        active_preview = AdCreativePreview.objects.create(
            token='active_token_456',
            expires_at=now + timedelta(hours=1),
            json_spec={'test': 'data'}
        )
        
        # Verify initial state
        self.assertEqual(AdCreativePreview.objects.count(), 2)
        
        # Run the task
        result = cleanup_expired_previews()
        
        # Check result
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['deleted_count'], 1)
        
        # Verify only expired preview was deleted
        self.assertEqual(AdCreativePreview.objects.count(), 1)
        self.assertTrue(AdCreativePreview.objects.filter(token='active_token_456').exists())
        self.assertFalse(AdCreativePreview.objects.filter(token='expired_token_123').exists())

    def test_cleanup_expired_previews_no_expired(self):
        """Test cleanup_expired_previews when no expired previews exist"""
        
        # Create only non-expired previews
        now = timezone.now()
        AdCreativePreview.objects.create(
            token='active_token_789',
            expires_at=now + timedelta(hours=1),
            json_spec={'test': 'data'}
        )
        
        # Run the task
        result = cleanup_expired_previews()
        
        # Check result
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['deleted_count'], 0)
        self.assertIn('No expired previews found', result['message'])
        
        # Verify preview still exists
        self.assertEqual(AdCreativePreview.objects.count(), 1)

    def test_cleanup_expired_previews_error_handling(self):
        """Test error handling in cleanup_expired_previews task"""
        
        # Mock the model to raise an exception
        with patch('facebook_meta.tasks.AdCreativePreview') as mock_model:
            # Create a mock queryset that raises an exception on count()
            mock_queryset = mock_model.objects.filter.return_value
            mock_queryset.count.side_effect = Exception("Database error")
            
            # Run the task
            result = cleanup_expired_previews()
            
            # Check error result
            self.assertEqual(result['status'], 'error')
            self.assertEqual(result['deleted_count'], 0)
            self.assertIn('Error cleaning up expired previews', result['message'])

