from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from ..models import TikTokCreative

User = get_user_model()


class TikTokCreativeModelTest(TestCase):
    """Test cases for TikTokCreative model."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_create_tiktok_creative(self):
        """Test creating a TikTok creative instance."""
        creative = TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=1024000,
            width=1920,
            height=1080,
            duration_sec=30.5,
            md5='abc123def456',
            preview_url='https://example.com/preview.mp4',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        self.assertEqual(creative.type, 'video')
        self.assertEqual(creative.name, 'Test Video')
        self.assertEqual(creative.uploaded_by, self.user)
        self.assertEqual(creative.scan_status, TikTokCreative.INCOMING)
        self.assertIsNotNone(creative.created_at)
        self.assertIsNotNone(creative.updated_at)
    
    def test_create_image_creative(self):
        """Test creating an image creative."""
        creative = TikTokCreative.objects.create(
            type='image',
            name='Test Image',
            storage_path='tiktok/images/test.jpg',
            original_filename='test.jpg',
            mime_type='image/jpeg',
            size_bytes=512000,
            width=1200,
            height=628,
            duration_sec=None,  # Images don't have duration
            md5='def456ghi789',
            preview_url='https://example.com/preview.jpg',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        self.assertEqual(creative.type, 'image')
        self.assertIsNone(creative.duration_sec)
    
    def test_creative_type_choices(self):
        """Test creative type choices."""
        # Valid types
        for creative_type in ['image', 'video', 'music']:
            creative = TikTokCreative.objects.create(
                type=creative_type,
                name=f'Test {creative_type}',
                storage_path=f'tiktok/{creative_type}s/test',
                original_filename=f'test.{creative_type}',
                mime_type=f'{creative_type}/test',
                size_bytes=1000,
                md5=f'test{creative_type}123',
                preview_url='https://example.com/test',
                scan_status=TikTokCreative.INCOMING,
                uploaded_by=self.user
            )
            self.assertEqual(creative.type, creative_type)
    
    def test_scan_status_choices(self):
        """Test scan status choices."""
        creative = TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            md5='test123',
            preview_url='https://example.com/test',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        # Test status transitions
        creative.start_scan()
        self.assertEqual(creative.scan_status, TikTokCreative.SCANNING)
        
        creative.mark_clean()
        self.assertEqual(creative.scan_status, TikTokCreative.READY)
    
    def test_md5_uniqueness(self):
        """Test that MD5 hash must be unique."""
        # Create first creative
        TikTokCreative.objects.create(
            type='video',
            name='First Video',
            storage_path='tiktok/videos/first.mp4',
            original_filename='first.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            md5='unique123',
            preview_url='https://example.com/first',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        # Try to create second creative with same MD5
        with self.assertRaises(Exception):  # IntegrityError or ValidationError
            TikTokCreative.objects.create(
                type='video',
                name='Second Video',
                storage_path='tiktok/videos/second.mp4',
                original_filename='second.mp4',
                mime_type='video/mp4',
                size_bytes=2000,
                md5='unique123',  # Same MD5
                preview_url='https://example.com/second',
                scan_status=TikTokCreative.INCOMING,
                uploaded_by=self.user
            )
    
    def test_string_representation(self):
        """Test string representation of the model."""
        creative = TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            md5='test123',
            preview_url='https://example.com/test',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        expected = "Test Video (video)"
        self.assertEqual(str(creative), expected)
    
    def test_model_meta(self):
        """Test model meta options."""
        self.assertEqual(TikTokCreative._meta.db_table, 'tiktok_creative')
        self.assertEqual(TikTokCreative._meta.verbose_name, 'TikTok Creative')
        self.assertEqual(TikTokCreative._meta.verbose_name_plural, 'TikTok Creatives')
    
    def test_ordering(self):
        """Test default ordering (newest first)."""
        # Create creatives with different timestamps
        creative1 = TikTokCreative.objects.create(
            type='video',
            name='First Video',
            storage_path='tiktok/videos/first.mp4',
            original_filename='first.mp4',
            mime_type='video/mp4',
            size_bytes=1000,
            md5='first123',
            preview_url='https://example.com/first',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        creative2 = TikTokCreative.objects.create(
            type='video',
            name='Second Video',
            storage_path='tiktok/videos/second.mp4',
            original_filename='second.mp4',
            mime_type='video/mp4',
            size_bytes=2000,
            md5='second123',
            preview_url='https://example.com/second',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        # Get all creatives (should be ordered by -created_at)
        creatives = list(TikTokCreative.objects.all())
        self.assertEqual(creatives[0], creative2)  # Newest first
        self.assertEqual(creatives[1], creative1)
