from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from ..models import TikTokCreative
from ..tasks import scan_tiktok_creative_for_virus

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
