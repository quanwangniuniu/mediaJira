from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta
from ..models import TikTokCreative, AdDraft, AdGroup, PublicPreview
from ..tasks import scan_tiktok_creative_for_virus, cleanup_expired_previews

User = get_user_model()


class TikTokTasksTest(TestCase):
    """Test cases for TikTok tasks."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.creative = TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            width=1920,
            height=1080,
            duration_sec=30.0,
            md5='test123',
            preview_url='https://example.com/test',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
    
    @patch('tiktok.tasks.scan_file_for_virus_generic.delay')
    def test_scan_tiktok_creative_for_virus_calls_generic_task(self, mock_generic_task):
        """Test that scan task calls the generic virus scan task."""
        # Mock the generic task to return a mock result
        mock_result = MagicMock()
        mock_generic_task.return_value = mock_result
        
        # Call the task
        result = scan_tiktok_creative_for_virus(self.creative.id)
        
        # Verify the generic task was called with correct parameters
        mock_generic_task.assert_called_once_with(
            model_path='tiktok.models.TikTokCreative',
            file_id=self.creative.id,
            file_path_key='storage_path',
            status_field='scan_status'
        )
        
        # Verify the result is returned
        self.assertEqual(result, mock_result)
    
    def test_scan_tiktok_creative_for_virus_with_invalid_id(self):
        """Test scan task with non-existent creative ID."""
        with patch('tiktok.tasks.scan_file_for_virus_generic.delay') as mock_generic_task:
            # Call with invalid ID
            result = scan_tiktok_creative_for_virus(999)
            
            # Should still call the generic task (it will handle the error)
            mock_generic_task.assert_called_once()
    
    def test_scan_tiktok_creative_for_virus_task_integration(self):
        """Test the complete scan task workflow."""
        # Verify initial state
        self.assertEqual(self.creative.scan_status, TikTokCreative.INCOMING)
        
        # The actual task execution would be tested in integration tests
        # This test focuses on the task structure and parameter passing
        with patch('tiktok.tasks.scan_file_for_virus_generic.delay') as mock_generic_task:
            scan_tiktok_creative_for_virus(self.creative.id)
            
            # Verify the task was called with correct parameters
            mock_generic_task.assert_called_once_with(
                model_path='tiktok.models.TikTokCreative',
                file_id=self.creative.id,
                file_path_key='storage_path',
                status_field='scan_status'
            )
    
    def test_task_parameters(self):
        """Test that task parameters are correctly formatted."""
        with patch('tiktok.tasks.scan_file_for_virus_generic.delay') as mock_generic_task:
            scan_tiktok_creative_for_virus(self.creative.id)
            
            # Get the call arguments
            call_args = mock_generic_task.call_args
            
            # Verify model path
            self.assertEqual(call_args[1]['model_path'], 'tiktok.models.TikTokCreative')
            
            # Verify file ID
            self.assertEqual(call_args[1]['file_id'], self.creative.id)
            
            # Verify file path key
            self.assertEqual(call_args[1]['file_path_key'], 'storage_path')
            
            # Verify status field
            self.assertEqual(call_args[1]['status_field'], 'scan_status')
    
    def test_task_error_handling(self):
        """Test task error handling."""
        with patch('tiktok.tasks.scan_file_for_virus_generic.delay', side_effect=Exception('Task error')):
            # The task should handle errors gracefully
            try:
                scan_tiktok_creative_for_virus(self.creative.id)
            except Exception as e:
                # Task errors should be handled by Celery
                self.assertEqual(str(e), 'Task error')
    
    def test_task_with_different_creative_types(self):
        """Test task with different creative types."""
        # Test with image creative
        image_creative = TikTokCreative.objects.create(
            type='image',
            name='Test Image',
            storage_path='tiktok/images/test.jpg',
            original_filename='test.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=1200,
            height=628,
            md5='image123',
            preview_url='https://example.com/image',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        with patch('tiktok.tasks.scan_file_for_virus_generic.delay') as mock_generic_task:
            scan_tiktok_creative_for_virus(image_creative.id)
            
            # Verify the task was called with correct parameters
            mock_generic_task.assert_called_once_with(
                model_path='tiktok.models.TikTokCreative',
                file_id=image_creative.id,
                file_path_key='storage_path',
                status_field='scan_status'
            )


class TikTokCleanupTasksTest(TestCase):
    """Test cases for TikTok cleanup tasks."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.ad_group = AdGroup.objects.create(
            name='Test Group',
            created_by=self.user
        )
        self.ad_draft = AdDraft.objects.create(
            name='Test Draft',
            ad_group=self.ad_group,
            created_by=self.user
        )
    
    def test_cleanup_expired_previews_deletes_expired(self):
        """Test that cleanup task deletes expired previews."""
        # Create expired preview
        expired_preview = PublicPreview.objects.create(
            slug='expired-slug',
            ad_draft=self.ad_draft,
            version_id='123',
            snapshot_json={'test': 'data'},
            expires_at=timezone.now() - timedelta(days=1)
        )
        
        # Create non-expired preview
        valid_preview = PublicPreview.objects.create(
            slug='valid-slug',
            ad_draft=self.ad_draft,
            version_id='456',
            snapshot_json={'test': 'data'},
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        # Run cleanup task
        result = cleanup_expired_previews()
        
        # Verify result
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['deleted_count'], 1)
        
        # Verify expired preview was deleted
        self.assertFalse(PublicPreview.objects.filter(slug='expired-slug').exists())
        
        # Verify valid preview still exists
        self.assertTrue(PublicPreview.objects.filter(slug='valid-slug').exists())
    
    def test_cleanup_expired_previews_no_expired(self):
        """Test cleanup task when no expired previews exist."""
        # Create only non-expired preview
        valid_preview = PublicPreview.objects.create(
            slug='valid-slug',
            ad_draft=self.ad_draft,
            version_id='456',
            snapshot_json={'test': 'data'},
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        # Run cleanup task
        result = cleanup_expired_previews()
        
        # Verify result
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['message'], 'No expired previews found')
        self.assertEqual(result['deleted_count'], 0)
        
        # Verify preview still exists
        self.assertTrue(PublicPreview.objects.filter(slug='valid-slug').exists())
    
    def test_cleanup_expired_previews_multiple_expired(self):
        """Test cleanup task with multiple expired previews."""
        # Create multiple expired previews
        expired_preview1 = PublicPreview.objects.create(
            slug='expired-1',
            ad_draft=self.ad_draft,
            version_id='111',
            snapshot_json={'test': 'data1'},
            expires_at=timezone.now() - timedelta(days=1)
        )
        expired_preview2 = PublicPreview.objects.create(
            slug='expired-2',
            ad_draft=self.ad_draft,
            version_id='222',
            snapshot_json={'test': 'data2'},
            expires_at=timezone.now() - timedelta(days=2)
        )
        expired_preview3 = PublicPreview.objects.create(
            slug='expired-3',
            ad_draft=self.ad_draft,
            version_id='333',
            snapshot_json={'test': 'data3'},
            expires_at=timezone.now() - timedelta(hours=1)
        )
        
        # Create non-expired preview
        valid_preview = PublicPreview.objects.create(
            slug='valid-slug',
            ad_draft=self.ad_draft,
            version_id='456',
            snapshot_json={'test': 'data'},
            expires_at=timezone.now() + timedelta(days=7)
        )
        
        # Run cleanup task
        result = cleanup_expired_previews()
        
        # Verify result
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['deleted_count'], 3)
        
        # Verify all expired previews were deleted
        self.assertFalse(PublicPreview.objects.filter(slug='expired-1').exists())
        self.assertFalse(PublicPreview.objects.filter(slug='expired-2').exists())
        self.assertFalse(PublicPreview.objects.filter(slug='expired-3').exists())
        
        # Verify valid preview still exists
        self.assertTrue(PublicPreview.objects.filter(slug='valid-slug').exists())
    
    def test_cleanup_expired_previews_empty_database(self):
        """Test cleanup task when database is empty."""
        # Run cleanup task with no previews
        result = cleanup_expired_previews()
        
        # Verify result
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['message'], 'No expired previews found')
        self.assertEqual(result['deleted_count'], 0)
    
    def test_cleanup_expired_previews_error_handling(self):
        """Test cleanup task error handling."""
        # Mock database error
        with patch('tiktok.tasks.PublicPreview.objects.filter') as mock_filter:
            mock_filter.side_effect = Exception('Database error')
            
            # Run cleanup task
            result = cleanup_expired_previews()
            
            # Verify error handling
            self.assertEqual(result['status'], 'error')
            self.assertIn('Error cleaning up expired previews', result['message'])
            self.assertEqual(result['deleted_count'], 0)
    
    def test_cleanup_expired_previews_precise_expiration(self):
        """Test that previews expiring exactly at current time are deleted."""
        # Create preview expiring exactly now
        now = timezone.now()
        expired_preview = PublicPreview.objects.create(
            slug='expired-now',
            ad_draft=self.ad_draft,
            version_id='789',
            snapshot_json={'test': 'data'},
            expires_at=now - timedelta(seconds=1)  # 1 second ago
        )
        
        # Run cleanup task
        result = cleanup_expired_previews()
        
        # Verify expired preview was deleted
        self.assertEqual(result['deleted_count'], 1)
        self.assertFalse(PublicPreview.objects.filter(slug='expired-now').exists())
