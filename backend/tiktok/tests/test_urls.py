from django.test import TestCase
from django.urls import reverse, resolve
from django.contrib.auth import get_user_model
from .. import views

User = get_user_model()


class TikTokUrlsTest(TestCase):
    """Test cases for TikTok URLs."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_video_upload_url(self):
        """Test video upload URL resolution."""
        url = reverse('tiktok-video-ad-upload')
        self.assertEqual(url, '/api/tiktok/file/video/ad/upload/')
        
        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.upload_video_ad)
    
    def test_image_upload_url(self):
        """Test image upload URL resolution."""
        url = reverse('tiktok-image-ad-upload')
        self.assertEqual(url, '/api/tiktok/file/image/ad/upload/')
        
        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.upload_image_ad)
    
    def test_material_list_url(self):
        """Test material list URL resolution."""
        url = reverse('tiktok-material-list')
        self.assertEqual(url, '/api/tiktok/material/list/')
        
        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.material_list)
    
    def test_material_info_url(self):
        """Test material info URL resolution."""
        url = reverse('tiktok-material-info', kwargs={'id': 123})
        self.assertEqual(url, '/api/tiktok/material/info/123/')
        
        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.material_info)
    
    def test_url_patterns(self):
        """Test that all URL patterns are correctly configured."""
        from ..urls import urlpatterns
        
        # Check that we have the expected number of URL patterns
        self.assertEqual(len(urlpatterns), 4)
        
        # Check that all expected patterns exist
        pattern_names = [pattern.name for pattern in urlpatterns]
        expected_names = [
            'tiktok-video-ad-upload',
            'tiktok-image-ad-upload', 
            'tiktok-material-list',
            'tiktok-material-info'
        ]
        
        for expected_name in expected_names:
            self.assertIn(expected_name, pattern_names)
    
    def test_url_pattern_paths(self):
        """Test that URL patterns have correct paths."""
        from ..urls import urlpatterns
        
        # Check video upload path
        video_pattern = next(p for p in urlpatterns if p.name == 'tiktok-video-ad-upload')
        self.assertEqual(video_pattern.pattern._route, 'file/video/ad/upload/')
        
        # Check image upload path
        image_pattern = next(p for p in urlpatterns if p.name == 'tiktok-image-ad-upload')
        self.assertEqual(image_pattern.pattern._route, 'file/image/ad/upload/')
        
        # Check material list path
        list_pattern = next(p for p in urlpatterns if p.name == 'tiktok-material-list')
        self.assertEqual(list_pattern.pattern._route, 'material/list/')
        
        # Check material info path
        info_pattern = next(p for p in urlpatterns if p.name == 'tiktok-material-info')
        self.assertEqual(info_pattern.pattern._route, 'material/info/<int:id>/')
    
    def test_url_reverse_with_kwargs(self):
        """Test URL reverse with keyword arguments."""
        # Test material info URL with different IDs
        url1 = reverse('tiktok-material-info', kwargs={'id': 1})
        self.assertEqual(url1, '/api/tiktok/material/info/1/')
        
        url2 = reverse('tiktok-material-info', kwargs={'id': 999})
        self.assertEqual(url2, '/api/tiktok/material/info/999/')
    
    def test_url_reverse_without_kwargs(self):
        """Test URL reverse without keyword arguments."""
        # Test URLs that don't require kwargs
        video_url = reverse('tiktok-video-ad-upload')
        self.assertEqual(video_url, '/api/tiktok/file/video/ad/upload/')
        
        image_url = reverse('tiktok-image-ad-upload')
        self.assertEqual(image_url, '/api/tiktok/file/image/ad/upload/')
        
        list_url = reverse('tiktok-material-list')
        self.assertEqual(list_url, '/api/tiktok/material/list/')
    
    def test_url_resolution(self):
        """Test URL resolution for different paths."""
        # Test video upload resolution
        resolved = resolve('/api/tiktok/file/video/ad/upload/')
        self.assertEqual(resolved.func, views.upload_video_ad)
        self.assertEqual(resolved.url_name, 'tiktok-video-ad-upload')
        
        # Test image upload resolution
        resolved = resolve('/api/tiktok/file/image/ad/upload/')
        self.assertEqual(resolved.func, views.upload_image_ad)
        self.assertEqual(resolved.url_name, 'tiktok-image-ad-upload')
        
        # Test material list resolution
        resolved = resolve('/api/tiktok/material/list/')
        self.assertEqual(resolved.func, views.material_list)
        self.assertEqual(resolved.url_name, 'tiktok-material-list')
        
        # Test material info resolution
        resolved = resolve('/api/tiktok/material/info/123/')
        self.assertEqual(resolved.func, views.material_info)
        self.assertEqual(resolved.url_name, 'tiktok-material-info')
        self.assertEqual(resolved.kwargs['id'], 123)
    
    def test_url_resolution_with_invalid_paths(self):
        """Test URL resolution with invalid paths."""
        # Test non-existent paths
        with self.assertRaises(Exception):  # NoReverseMatch or Resolver404
            resolve('/api/tiktok/invalid/path/')
        
        with self.assertRaises(Exception):
            resolve('/api/tiktok/material/info/')
        
        with self.assertRaises(Exception):
            resolve('/api/tiktok/material/info/abc/')  # Non-integer ID