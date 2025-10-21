"""
Test cases for google_ads services
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
import secrets

from google_ads.models import (
    Ad, CustomerAccount, AdImageAsset, AdTextAsset, AdVideoAsset,
    VideoResponsiveAdInfo, ResponsiveSearchAdInfo, ResponsiveDisplayAdInfo,
    AdPreview
)
from google_ads.services import (
    AdService,
    AdPreviewService
)

User = get_user_model()


# ========== Helper Functions ==========

def create_test_user(username='testuser', email='test@example.com'):
    """Helper to create test user"""
    return User.objects.create_user(
        username=username,
        email=email,
        password='testpass123'
    )


def create_test_customer_account(user, customer_id='1234567890', name='Test Customer'):
    """Helper to create test customer account"""
    return CustomerAccount.objects.create(
        customer_id=customer_id,
        descriptive_name=name,
        created_by=user
    )


def create_test_responsive_search_ad():
    """Helper to create valid ResponsiveSearchAdInfo"""
    search_ad = ResponsiveSearchAdInfo.objects.create(path1='products', path2='sale')
    
    # Create headlines (3 required)
    for i in range(1, 4):
        headline = AdTextAsset.objects.create(text=f'Headline {i}')
        search_ad.headlines.add(headline)
    
    # Create descriptions (2 required)
    for i in range(1, 3):
        description = AdTextAsset.objects.create(text=f'Description {i}')
        search_ad.descriptions.add(description)
    
    return search_ad


def create_test_responsive_display_ad():
    """Helper to create valid ResponsiveDisplayAdInfo"""
    long_headline = AdTextAsset.objects.create(text='Long Headline for Display Ad')
    headline = AdTextAsset.objects.create(text='Short Headline')
    description = AdTextAsset.objects.create(text='Description')
    
    display_ad = ResponsiveDisplayAdInfo.objects.create(
        business_name='Test Business',
        long_headline=long_headline,
        main_color='#FF5733',
        accent_color='#33FF57',
        allow_flexible_color=False
    )
    
    display_ad.headlines.add(headline)
    display_ad.descriptions.add(description)
    
    return display_ad


def create_test_video_responsive_ad():
    """Helper to create valid VideoResponsiveAdInfo"""
    video_asset = AdVideoAsset.objects.create(asset='customers/123/assets/video1')
    long_headline = AdTextAsset.objects.create(text='Long Headline for Video')
    description = AdTextAsset.objects.create(text='Description for Video')
    
    video_ad = VideoResponsiveAdInfo.objects.create(
        call_to_actions_enabled=False
    )
    
    video_ad.videos.add(video_asset)
    video_ad.long_headlines.add(long_headline)
    video_ad.descriptions.add(description)
    
    return video_ad


def create_test_ad(user, customer_account, ad_type='RESPONSIVE_SEARCH_AD', **kwargs):
    """Helper to create test ad with proper ad type info"""
    import random
    
    ad_type_map = {
        'RESPONSIVE_SEARCH_AD': create_test_responsive_search_ad(),
        'RESPONSIVE_DISPLAY_AD': create_test_responsive_display_ad(),
        'VIDEO_RESPONSIVE_AD': create_test_video_responsive_ad(),
    }
    
    ad_type_info = ad_type_map.get(ad_type)
    
    # Extract ad-specific fields
    name = kwargs.pop('name', 'Test Ad')
    status = kwargs.pop('status', 'DRAFT')
    
    # Generate unique resource_name (must be numeric for ad_id)
    unique_id = str(random.randint(1000000, 9999999))
    resource_name = kwargs.pop('resource_name', f'customers/{customer_account.customer_id}/ads/{unique_id}')
    
    # Set ad type
    if ad_type == 'RESPONSIVE_SEARCH_AD':
        kwargs['responsive_search_ad'] = ad_type_info
    elif ad_type == 'RESPONSIVE_DISPLAY_AD':
        kwargs['responsive_display_ad'] = ad_type_info
    elif ad_type == 'VIDEO_RESPONSIVE_AD':
        kwargs['video_responsive_ad'] = ad_type_info
    
    return Ad.objects.create(
        resource_name=resource_name,
        name=name,
        type=ad_type,
        status=status,
        customer_account=customer_account,
        created_by=user,
        **kwargs
    )


# ========== Service Tests ==========

class AdServiceTest(TestCase):
    """Test cases for AdService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
    
    def test_create_ad_with_assets(self):
        """Test creating an ad with assets"""
        # Note: AdService.create_ad_with_assets requires ad type to be set first
        # This test documents the expected behavior
        ad_data = {
            'resource_name': f'customers/{self.customer_account.customer_id}/ads/1234567890',
            'name': 'Test Ad',
            'type': 'RESPONSIVE_SEARCH_AD',
            'status': 'DRAFT',
            'customer_account': self.customer_account,
            'created_by': self.user
        }
        
        # Create ad type info first
        search_ad = ResponsiveSearchAdInfo.objects.create(path1='products', path2='sale')
        ad_data['responsive_search_ad'] = search_ad
        
        # Create assets
        asset_data = {
            'text_assets': [
                {'text': 'Headline 1'},
                {'text': 'Headline 2'},
                {'text': 'Headline 3'},
                {'text': 'Description 1'},
                {'text': 'Description 2'}
            ]
        }
        
        ad = AdService.create_ad_with_assets(ad_data, None, asset_data)
        
        self.assertIsNotNone(ad)
        self.assertEqual(ad.name, 'Test Ad')
        self.assertEqual(ad.type, 'RESPONSIVE_SEARCH_AD')
        self.assertEqual(ad.status, 'DRAFT')
    
    def test_create_ad_without_assets(self):
        """Test creating an ad without assets"""
        # Create ad type info first
        search_ad = ResponsiveSearchAdInfo.objects.create(path1='products', path2='sale')
        
        ad_data = {
            'resource_name': f'customers/{self.customer_account.customer_id}/ads/1234567891',
            'name': 'Test Ad Without Assets',
            'type': 'RESPONSIVE_SEARCH_AD',
            'status': 'DRAFT',
            'customer_account': self.customer_account,
            'created_by': self.user,
            'responsive_search_ad': search_ad
        }
        
        ad = AdService.create_ad_with_assets(ad_data)
        
        self.assertIsNotNone(ad)
        self.assertEqual(ad.name, 'Test Ad Without Assets')
    
    def test_create_ad_with_invalid_data(self):
        """Test creating an ad with invalid data"""
        ad_data = {
            'resource_name': 'invalid_format',
            'name': 'Test Ad',
            'type': 'RESPONSIVE_SEARCH_AD',
            'status': 'DRAFT',
            'customer_account': self.customer_account,
            'created_by': self.user
        }
        
        with self.assertRaises(ValidationError):
            AdService.create_ad_with_assets(ad_data)


class AdPreviewServiceTest(TestCase):
    """Test cases for AdPreviewService"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.ad = create_test_ad(self.user, self.customer_account)
    
    def test_generate_preview_from_ad(self):
        """Test generating preview from ad"""
        preview = AdPreviewService.generate_preview_from_ad(self.ad, 'DESKTOP')
        
        self.assertIsNotNone(preview)
        self.assertEqual(preview.ad, self.ad)
        self.assertEqual(preview.device_type, 'DESKTOP')
        self.assertIsNotNone(preview.token)
        self.assertEqual(len(preview.token), 43)  # token_urlsafe(32) produces 43 chars
        self.assertIsNotNone(preview.preview_data)
        self.assertIsNotNone(preview.expiration_date_time)
    
    def test_generate_preview_with_mobile_device(self):
        """Test generating preview with mobile device"""
        preview = AdPreviewService.generate_preview_from_ad(self.ad, 'MOBILE')
        
        self.assertEqual(preview.device_type, 'MOBILE')
    
    def test_generate_preview_with_tablet_device(self):
        """Test generating preview with tablet device"""
        preview = AdPreviewService.generate_preview_from_ad(self.ad, 'TABLET')
        
        self.assertEqual(preview.device_type, 'TABLET')
    
    def test_preview_contains_ad_data(self):
        """Test that preview contains ad data"""
        preview = AdPreviewService.generate_preview_from_ad(self.ad, 'DESKTOP')
        
        # Preview data is flattened, not nested
        self.assertIn('ad_name', preview.preview_data)
        self.assertIn('ad_type', preview.preview_data)
        self.assertIn('device_type', preview.preview_data)
        self.assertEqual(preview.preview_data['ad_name'], self.ad.name)
        self.assertEqual(preview.preview_data['ad_type'], self.ad.type)
    
    def test_preview_expiration_time(self):
        """Test that preview has correct expiration time"""
        preview = AdPreviewService.generate_preview_from_ad(self.ad, 'DESKTOP')
        
        expected_expiration = timezone.now() + timedelta(days=7)
        # Allow 1 second difference for test execution time
        self.assertAlmostEqual(
            preview.expiration_date_time.timestamp(),
            expected_expiration.timestamp(),
            delta=1
        )
    
    def test_get_preview_by_token(self):
        """Test getting preview by token"""
        preview = AdPreviewService.generate_preview_from_ad(self.ad, 'DESKTOP')
        token = preview.token
        
        retrieved_preview = AdPreviewService.get_preview_by_token(token)
        
        self.assertIsNotNone(retrieved_preview)
        # get_preview_by_token returns a dict with preview data, not the model instance
        self.assertIsInstance(retrieved_preview, dict)
        # The dict contains preview data, not token
        self.assertIn('ad_name', retrieved_preview)
        self.assertEqual(retrieved_preview['ad_name'], self.ad.name)
    
    def test_get_preview_by_invalid_token(self):
        """Test getting preview with invalid token"""
        with self.assertRaises(ValidationError):
            AdPreviewService.get_preview_by_token('invalid_token')
    
    def test_get_preview_by_expired_token(self):
        """Test getting preview with expired token"""
        # Create a preview with past expiration time
        token = secrets.token_urlsafe(32)
        expired_time = timezone.now() - timedelta(days=1)
        
        preview = AdPreview.objects.create(
            token=token,
            ad=self.ad,
            device_type='DESKTOP',
            preview_data={'test': 'data'},
            created_by=self.user,
            expiration_date_time=expired_time
        )
        
        with self.assertRaises(ValidationError):
            AdPreviewService.get_preview_by_token(token)
    
    def test_preview_token_uniqueness(self):
        """Test that preview tokens are unique"""
        preview1 = AdPreviewService.generate_preview_from_ad(self.ad, 'DESKTOP')
        preview2 = AdPreviewService.generate_preview_from_ad(self.ad, 'MOBILE')
        
        self.assertNotEqual(preview1.token, preview2.token)
    
    def test_preview_data_structure(self):
        """Test that preview data has correct structure"""
        preview = AdPreviewService.generate_preview_from_ad(self.ad, 'DESKTOP')
        
        # Preview data is flattened
        self.assertIn('ad_name', preview.preview_data)
        self.assertIn('ad_type', preview.preview_data)
        self.assertIn('status', preview.preview_data)
        self.assertIn('resource_name', preview.preview_data)
        self.assertIn('device_type', preview.preview_data)
    
    def test_preview_data_includes_ad_type_info(self):
        """Test that preview data includes ad type information"""
        preview = AdPreviewService.generate_preview_from_ad(self.ad, 'DESKTOP')
        
        # Check if ad type data is present
        self.assertIn('ad_type_data', preview.preview_data)
        ad_type_data = preview.preview_data['ad_type_data']
        # For ResponsiveSearchAd, should have responsive_search_ad
        self.assertIn('responsive_search_ad', ad_type_data)
        search_ad_data = ad_type_data['responsive_search_ad']
        self.assertIn('path1', search_ad_data)
        self.assertIn('path2', search_ad_data)


class AdPreviewServiceDataExtractionTest(TestCase):
    """Test cases for AdPreviewService data extraction methods"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
    
    def test_extract_responsive_search_ad_data(self):
        """Test extracting data from ResponsiveSearchAd"""
        ad = create_test_ad(self.user, self.customer_account, 'RESPONSIVE_SEARCH_AD')
        preview = AdPreviewService.generate_preview_from_ad(ad, 'DESKTOP')
        
        # Preview data is flattened
        self.assertIn('ad_type_data', preview.preview_data)
        ad_type_data = preview.preview_data['ad_type_data']
        self.assertIn('responsive_search_ad', ad_type_data)
        search_ad_data = ad_type_data['responsive_search_ad']
        self.assertIn('path1', search_ad_data)
        self.assertIn('path2', search_ad_data)
        self.assertIn('headlines', search_ad_data)
        self.assertIn('descriptions', search_ad_data)
    
    def test_extract_responsive_display_ad_data(self):
        """Test extracting data from ResponsiveDisplayAd"""
        ad = create_test_ad(self.user, self.customer_account, 'RESPONSIVE_DISPLAY_AD')
        preview = AdPreviewService.generate_preview_from_ad(ad, 'DESKTOP')
        
        # Preview data is flattened
        self.assertIn('ad_type_data', preview.preview_data)
        ad_type_data = preview.preview_data['ad_type_data']
        self.assertIn('responsive_display_ad', ad_type_data)
        display_ad_data = ad_type_data['responsive_display_ad']
        self.assertIn('business_name', display_ad_data)
        self.assertIn('main_color', display_ad_data)
        self.assertIn('accent_color', display_ad_data)
        self.assertIn('headlines', display_ad_data)
        self.assertIn('descriptions', display_ad_data)
    
    def test_extract_video_responsive_ad_data(self):
        """Test extracting data from VideoResponsiveAd"""
        ad = create_test_ad(self.user, self.customer_account, 'VIDEO_RESPONSIVE_AD')
        preview = AdPreviewService.generate_preview_from_ad(ad, 'DESKTOP')
        
        # Preview data is flattened
        self.assertIn('ad_type_data', preview.preview_data)
        ad_type_data = preview.preview_data['ad_type_data']
        self.assertIn('video_responsive_ad', ad_type_data)
        video_ad_data = ad_type_data['video_responsive_ad']
        self.assertIn('videos', video_ad_data)
        self.assertIn('long_headlines', video_ad_data)
        self.assertIn('descriptions', video_ad_data)
        # Note: call_to_actions_enabled is not included in the preview data extraction
        # This is expected behavior based on the service implementation


class AdPreviewServiceEdgeCasesTest(TestCase):
    """Test cases for AdPreviewService edge cases"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
    
    def test_preview_without_ad_type(self):
        """Test preview for ad without ad type"""
        # Create ad without ad type (should fail validation)
        with self.assertRaises(ValidationError):
            ad = Ad.objects.create(
                resource_name=f'customers/{self.customer_account.customer_id}/ads/1234567890',
                name='Test Ad',
                type='RESPONSIVE_SEARCH_AD',
                status='DRAFT',
                customer_account=self.customer_account,
                created_by=self.user
            )
    
    def test_preview_with_multiple_devices(self):
        """Test generating previews for multiple devices"""
        ad = create_test_ad(self.user, self.customer_account)
        
        desktop_preview = AdPreviewService.generate_preview_from_ad(ad, 'DESKTOP')
        mobile_preview = AdPreviewService.generate_preview_from_ad(ad, 'MOBILE')
        tablet_preview = AdPreviewService.generate_preview_from_ad(ad, 'TABLET')
        
        self.assertEqual(desktop_preview.device_type, 'DESKTOP')
        self.assertEqual(mobile_preview.device_type, 'MOBILE')
        self.assertEqual(tablet_preview.device_type, 'TABLET')
        
        # All should have same ad
        self.assertEqual(desktop_preview.ad, ad)
        self.assertEqual(mobile_preview.ad, ad)
        self.assertEqual(tablet_preview.ad, ad)
    
    def test_preview_data_consistency(self):
        """Test that preview data is consistent across multiple generations"""
        ad = create_test_ad(self.user, self.customer_account)
        
        preview1 = AdPreviewService.generate_preview_from_ad(ad, 'DESKTOP')
        preview2 = AdPreviewService.generate_preview_from_ad(ad, 'DESKTOP')
        
        # Ad data should be the same (preview data is flattened)
        self.assertEqual(preview1.preview_data['ad_name'], preview2.preview_data['ad_name'])
        self.assertEqual(preview1.preview_data['ad_type'], preview2.preview_data['ad_type'])
        
        # But tokens should be different
        self.assertNotEqual(preview1.token, preview2.token)
    
    def test_preview_with_empty_ad_name(self):
        """Test preview for ad with empty name"""
        ad = create_test_ad(self.user, self.customer_account, name='')
        preview = AdPreviewService.generate_preview_from_ad(ad, 'DESKTOP')
        
        # Preview data is flattened
        self.assertEqual(preview.preview_data['ad_name'], '')

