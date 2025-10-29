from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from ..models import TikTokCreative
from ..signals import trigger_tiktok_virus_scan

User = get_user_model()


class TikTokSignalsTest(TestCase):
    """Test cases for TikTok signals."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    @patch('tiktok.signals.scan_tiktok_creative_for_virus.delay')
    def test_trigger_virus_scan_signal_on_create(self, mock_scan_task):
        """Test that virus scan signal triggers on creative creation."""
        # Create a new TikTokCreative
        creative = TikTokCreative.objects.create(
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
        
        # Check that scan task was triggered
        mock_scan_task.assert_called_once_with(creative.id)
    
    @patch('tiktok.signals.scan_tiktok_creative_for_virus.delay')
    def test_trigger_virus_scan_signal_on_update(self, mock_scan_task):
        """Test that virus scan signal is not triggered on creative updates."""
        # Create a creative
        creative = TikTokCreative.objects.create(
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
        
        # Reset the mock to clear the create call
        mock_scan_task.reset_mock()
        
        # Update the creative
        creative.name = 'Updated Video'
        creative.save()
        
        # Check that scan task was NOT triggered on update
        mock_scan_task.assert_not_called()
    
    @patch('tiktok.signals.scan_tiktok_creative_for_virus.delay')
    def test_trigger_virus_scan_signal_with_different_status(self, mock_scan_task):
        """Test that signal only triggers for INCOMING status."""
        # Create creative with READY status
        creative = TikTokCreative.objects.create(
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
            scan_status=TikTokCreative.READY,  # Not INCOMING
            uploaded_by=self.user
        )
        
        # Check that scan task was NOT triggered
        mock_scan_task.assert_not_called()
    
    @patch('tiktok.signals.scan_tiktok_creative_for_virus.delay')
    def test_trigger_virus_scan_signal_with_image_creative(self, mock_scan_task):
        """Test signal with image creative."""
        # Create an image creative
        creative = TikTokCreative.objects.create(
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
        
        # Check that scan task was triggered
        mock_scan_task.assert_called_once_with(creative.id)
    
    @patch('tiktok.signals.scan_tiktok_creative_for_virus.delay')
    def test_trigger_virus_scan_signal_multiple_creatives(self, mock_scan_task):
        """Test signal with multiple creatives."""
        # Create multiple creatives
        creative1 = TikTokCreative.objects.create(
            type='video',
            name='Video 1',
            storage_path='tiktok/videos/video1.mp4',
            original_filename='video1.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            width=1920,
            height=1080,
            duration_sec=30.0,
            md5='video1',
            preview_url='https://example.com/video1',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        creative2 = TikTokCreative.objects.create(
            type='image',
            name='Image 1',
            storage_path='tiktok/images/image1.jpg',
            original_filename='image1.jpg',
            mime_type='image/jpeg',
            size_bytes=1000,
            width=1200,
            height=628,
            md5='image1',
            preview_url='https://example.com/image1',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        # Check that scan task was called for both creatives
        self.assertEqual(mock_scan_task.call_count, 2)
        mock_scan_task.assert_any_call(creative1.id)
        mock_scan_task.assert_any_call(creative2.id)
    
    def test_signal_handler_function(self):
        """Test the signal handler function directly."""
        # Create a mock instance
        mock_instance = MagicMock()
        mock_instance.scan_status = TikTokCreative.INCOMING
        
        # Create mock parameters
        created = True
        
        with patch('tiktok.signals.scan_tiktok_creative_for_virus.delay') as mock_scan_task:
            # Call the signal handler directly
            trigger_tiktok_virus_scan(
                sender=TikTokCreative,
                instance=mock_instance,
                created=created
            )
            
            # Check that scan task was called
            mock_scan_task.assert_called_once_with(mock_instance.id)
    
    def test_signal_handler_function_not_created(self):
        """Test signal handler when created=False."""
        # Create a mock instance
        mock_instance = MagicMock()
        mock_instance.scan_status = TikTokCreative.INCOMING
        
        # Create mock parameters
        created = False
        
        with patch('tiktok.signals.scan_tiktok_creative_for_virus.delay') as mock_scan_task:
            # Call the signal handler directly
            trigger_tiktok_virus_scan(
                sender=TikTokCreative,
                instance=mock_instance,
                created=created
            )
            
            # Check that scan task was NOT called
            mock_scan_task.assert_not_called()
    
    def test_signal_handler_function_wrong_status(self):
        """Test signal handler with wrong status."""
        # Create a mock instance
        mock_instance = MagicMock()
        mock_instance.scan_status = TikTokCreative.READY  # Not INCOMING
        
        # Create mock parameters
        created = True
        
        with patch('tiktok.signals.scan_tiktok_creative_for_virus.delay') as mock_scan_task:
            # Call the signal handler directly
            trigger_tiktok_virus_scan(
                sender=TikTokCreative,
                instance=mock_instance,
                created=created
            )
            
            # Check that scan task was NOT called
            mock_scan_task.assert_not_called()
