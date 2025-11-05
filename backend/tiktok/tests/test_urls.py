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
        self.assertEqual(len(urlpatterns), 12)  # 4 material + 6 creation + 2 preview

        # Check that all expected patterns exist
        pattern_names = [pattern.name for pattern in urlpatterns]
        expected_names = [
            'tiktok-video-ad-upload',
            'tiktok-image-ad-upload',
            'tiktok-material-list',
            'tiktok-material-info',
            'tiktok-brief-info-list',
            'tiktok-creation-detail',
            'tiktok-ad-draft-save',
            'tiktok-ad-draft-delete',
            'tiktok-ad-group-save',
            'tiktok-ad-group-delete',
            'tiktok-share-ad-draft',
            'tiktok-public-preview',
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

        # Check share and public preview paths
        share_pattern = next(p for p in urlpatterns if p.name == 'tiktok-share-ad-draft')
        self.assertEqual(share_pattern.pattern._route, 'ad-drafts/<uuid:id>/share/')
        pub_pattern = next(p for p in urlpatterns if p.name == 'tiktok-public-preview')
        self.assertEqual(pub_pattern.pattern._route, 'public-previews/<slug:slug>/')
    
    def test_url_reverse_with_kwargs(self):
        """Test URL reverse with keyword arguments."""
        # Test material info URL with different IDs
        url1 = reverse('tiktok-material-info', kwargs={'id': 1})
        self.assertEqual(url1, '/api/tiktok/material/info/1/')
        
        url2 = reverse('tiktok-material-info', kwargs={'id': 999})
        self.assertEqual(url2, '/api/tiktok/material/info/999/')

        # Share draft reverse
        import uuid as _uuid
        did = _uuid.uuid4()
        share_url = reverse('tiktok-share-ad-draft', kwargs={'id': did})
        self.assertEqual(share_url, f'/api/tiktok/ad-drafts/{did}/share/')

        # Public preview reverse
        slug = 'abc123'
        pub_url = reverse('tiktok-public-preview', kwargs={'slug': slug})
        self.assertEqual(pub_url, f'/api/tiktok/public-previews/{slug}/')
    
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

        # Test share
        # Note: path converter enforces uuid
        resolved = resolve('/api/tiktok/ad-drafts/123e4567-e89b-12d3-a456-426614174000/share/')
        self.assertEqual(resolved.func, views.share_ad_draft)
        self.assertEqual(resolved.url_name, 'tiktok-share-ad-draft')

        # Test public preview
        resolved = resolve('/api/tiktok/public-previews/some-slug/')
        self.assertEqual(resolved.func, views.get_public_preview)
        self.assertEqual(resolved.url_name, 'tiktok-public-preview')
    
    def test_url_resolution_with_invalid_paths(self):
        """Test URL resolution with invalid paths."""
        # Test non-existent paths
        with self.assertRaises(Exception):  # NoReverseMatch or Resolver404
            resolve('/api/tiktok/invalid/path/')
        
        with self.assertRaises(Exception):
            resolve('/api/tiktok/material/info/')
        
        with self.assertRaises(Exception):
            resolve('/api/tiktok/material/info/abc/')  # Non-integer ID


class TikTokCreationUrlsTest(TestCase):
    """Test cases for TikTok Creation API URLs."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_brief_info_list_url(self):
        """Test brief info list URL resolution."""
        url = reverse('tiktok-brief-info-list')
        self.assertEqual(url, '/api/tiktok/creation/sidebar/brief_info_list/')

        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.brief_info_list)

    def test_creation_detail_url(self):
        """Test creation detail URL resolution."""
        url = reverse('tiktok-creation-detail')
        self.assertEqual(url, '/api/tiktok/creation/detail/')

        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.creation_detail)

    def test_ad_draft_save_url(self):
        """Test ad draft save URL resolution."""
        url = reverse('tiktok-ad-draft-save')
        self.assertEqual(url, '/api/tiktok/creation/ad-drafts/save/')

        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.ad_draft_save)

    def test_ad_draft_delete_url(self):
        """Test ad draft delete URL resolution."""
        url = reverse('tiktok-ad-draft-delete')
        self.assertEqual(url, '/api/tiktok/creation/ad-drafts/delete/')

        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.ad_draft_delete)

    def test_ad_group_save_url(self):
        """Test ad group save URL resolution."""
        url = reverse('tiktok-ad-group-save')
        self.assertEqual(url, '/api/tiktok/creation/ad-group/save/')

        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.ad_group_save)

    def test_ad_group_delete_url(self):
        """Test ad group delete URL resolution."""
        url = reverse('tiktok-ad-group-delete')
        self.assertEqual(url, '/api/tiktok/creation/ad-group/delete/')

        # Test that URL resolves to correct view
        resolved = resolve(url)
        self.assertEqual(resolved.func, views.ad_group_delete)

    def test_creation_url_resolution(self):
        """Test URL resolution for creation API paths."""
        # Test brief info list resolution
        resolved = resolve('/api/tiktok/creation/sidebar/brief_info_list/')
        self.assertEqual(resolved.func, views.brief_info_list)
        self.assertEqual(resolved.url_name, 'tiktok-brief-info-list')

        # Test creation detail resolution
        resolved = resolve('/api/tiktok/creation/detail/')
        self.assertEqual(resolved.func, views.creation_detail)
        self.assertEqual(resolved.url_name, 'tiktok-creation-detail')

        # Test ad draft save resolution
        resolved = resolve('/api/tiktok/creation/ad-drafts/save/')
        self.assertEqual(resolved.func, views.ad_draft_save)
        self.assertEqual(resolved.url_name, 'tiktok-ad-draft-save')

        # Test ad draft delete resolution
        resolved = resolve('/api/tiktok/creation/ad-drafts/delete/')
        self.assertEqual(resolved.func, views.ad_draft_delete)
        self.assertEqual(resolved.url_name, 'tiktok-ad-draft-delete')

        # Test ad group save resolution
        resolved = resolve('/api/tiktok/creation/ad-group/save/')
        self.assertEqual(resolved.func, views.ad_group_save)
        self.assertEqual(resolved.url_name, 'tiktok-ad-group-save')

        # Test ad group delete resolution
        resolved = resolve('/api/tiktok/creation/ad-group/delete/')
        self.assertEqual(resolved.func, views.ad_group_delete)
        self.assertEqual(resolved.url_name, 'tiktok-ad-group-delete')

    def test_creation_url_patterns(self):
        """Test that creation URL patterns are correctly configured."""
        from ..urls import urlpatterns

        # Check creation API patterns exist
        creation_pattern_names = [
            'tiktok-brief-info-list',
            'tiktok-creation-detail',
            'tiktok-ad-draft-save',
            'tiktok-ad-draft-delete',
            'tiktok-ad-group-save',
            'tiktok-ad-group-delete'
        ]

        pattern_names = [pattern.name for pattern in urlpatterns]

        for expected_name in creation_pattern_names:
            self.assertIn(expected_name, pattern_names)

    def test_creation_url_pattern_paths(self):
        """Test that creation URL patterns have correct paths."""
        from ..urls import urlpatterns

        # Check brief info list path
        pattern = next(p for p in urlpatterns if p.name == 'tiktok-brief-info-list')
        self.assertEqual(pattern.pattern._route, 'creation/sidebar/brief_info_list/')

        # Check creation detail path
        pattern = next(p for p in urlpatterns if p.name == 'tiktok-creation-detail')
        self.assertEqual(pattern.pattern._route, 'creation/detail/')

        # Check ad draft save path
        pattern = next(p for p in urlpatterns if p.name == 'tiktok-ad-draft-save')
        self.assertEqual(pattern.pattern._route, 'creation/ad-drafts/save/')

        # Check ad draft delete path
        pattern = next(p for p in urlpatterns if p.name == 'tiktok-ad-draft-delete')
        self.assertEqual(pattern.pattern._route, 'creation/ad-drafts/delete/')

        # Check ad group save path
        pattern = next(p for p in urlpatterns if p.name == 'tiktok-ad-group-save')
        self.assertEqual(pattern.pattern._route, 'creation/ad-group/save/')

        # Check ad group delete path
        pattern = next(p for p in urlpatterns if p.name == 'tiktok-ad-group-delete')
        self.assertEqual(pattern.pattern._route, 'creation/ad-group/delete/')

    def test_creation_url_reverse(self):
        """Test URL reverse for creation APIs."""
        # Test brief info list URL
        url = reverse('tiktok-brief-info-list')
        self.assertEqual(url, '/api/tiktok/creation/sidebar/brief_info_list/')

        # Test creation detail URL
        url = reverse('tiktok-creation-detail')
        self.assertEqual(url, '/api/tiktok/creation/detail/')

        # Test ad draft save URL
        url = reverse('tiktok-ad-draft-save')
        self.assertEqual(url, '/api/tiktok/creation/ad-drafts/save/')

        # Test ad draft delete URL
        url = reverse('tiktok-ad-draft-delete')
        self.assertEqual(url, '/api/tiktok/creation/ad-drafts/delete/')

        # Test ad group save URL
        url = reverse('tiktok-ad-group-save')
        self.assertEqual(url, '/api/tiktok/creation/ad-group/save/')

        # Test ad group delete URL
        url = reverse('tiktok-ad-group-delete')
        self.assertEqual(url, '/api/tiktok/creation/ad-group/delete/')