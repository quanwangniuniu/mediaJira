"""
Test cases for google_ads models
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta

from google_ads.models import (
    Ad, CustomerAccount, AdImageAsset, AdTextAsset, AdVideoAsset,
    ImageAdInfo, VideoAdInfo,
    VideoResponsiveAdInfo, ResponsiveSearchAdInfo, ResponsiveDisplayAdInfo,
    FinalAppUrl, CustomParameter, UrlCollection, AdPreview,
    GoogleAdsVideoData
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
    video_data = GoogleAdsVideoData.objects.create(
        title='Test Video',
        video_id='video1',
        image_url='https://example.com/thumbnail.jpg',
        message='Test video description'
    )
    long_headline = AdTextAsset.objects.create(text='Long Headline for Video')
    description = AdTextAsset.objects.create(text='Description for Video')
    
    video_ad = VideoResponsiveAdInfo.objects.create(
        call_to_actions_enabled=False,
        companion_banner_enabled=False
    )
    
    video_ad.videos.add(video_data)
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


# ========== Model Tests ==========

class CustomerAccountModelTest(TestCase):
    """Test cases for CustomerAccount model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
    
    def test_create_customer_account(self):
        """Test creating a customer account"""
        customer = create_test_customer_account(self.user)
        
        self.assertEqual(customer.customer_id, '1234567890')
        self.assertEqual(customer.descriptive_name, 'Test Customer')
        self.assertEqual(customer.status, CustomerAccount.CustomerStatus.ENABLED)
        self.assertEqual(customer.created_by, self.user)
    
    def test_customer_id_uniqueness(self):
        """Test customer ID uniqueness"""
        create_test_customer_account(self.user, customer_id='1234567890')
        
        with self.assertRaises(IntegrityError):
            create_test_customer_account(self.user, customer_id='1234567890')
    
    def test_customer_status_choices(self):
        """Test customer status choices"""
        statuses = [
            CustomerAccount.CustomerStatus.ENABLED,
            CustomerAccount.CustomerStatus.CANCELED,
            CustomerAccount.CustomerStatus.SUSPENDED,
            CustomerAccount.CustomerStatus.CLOSED
        ]
        
        for i, status in enumerate(statuses):
            with self.subTest(status=status):
                customer = CustomerAccount.objects.create(
                    customer_id=f'123456789{i}',
                    descriptive_name=f'Customer {i}',
                    status=status,
                    created_by=self.user
                )
                self.assertEqual(customer.status, status)
    
    def test_customer_string_representation(self):
        """Test customer string representation"""
        customer = create_test_customer_account(self.user)
        expected_str = f"{customer.customer_id} - Test Customer"
        self.assertEqual(str(customer), expected_str)


class AdModelTest(TestCase):
    """Test cases for Ad model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
    
    def test_create_ad(self):
        """Test creating an ad"""
        ad = create_test_ad(self.user, self.customer_account)
        
        self.assertEqual(ad.name, 'Test Ad')
        self.assertEqual(ad.type, 'RESPONSIVE_SEARCH_AD')
        self.assertEqual(ad.customer_account, self.customer_account)
        self.assertEqual(ad.created_by, self.user)
        self.assertEqual(ad.status, 'DRAFT')
    
    def test_resource_name_validation(self):
        """Test resource name validation"""
        # Valid resource name
        ad = create_test_ad(self.user, self.customer_account)
        ad.clean()
        
        # Invalid resource name
        ad.resource_name = 'invalid_format'
        with self.assertRaises(ValidationError):
            ad.clean()
    
    def test_union_field_validation(self):
        """Test Union Field validation"""
        # Must have exactly one ad type
        ad = create_test_ad(self.user, self.customer_account)
        ad.clean()
        
        # Cannot have multiple ad types
        display_ad = create_test_responsive_display_ad()
        ad.responsive_display_ad = display_ad
        
        with self.assertRaises(ValidationError) as context:
            ad.clean()
        
        self.assertIn('Only one ad type can be set', str(context.exception))
    
    def test_ad_string_representation(self):
        """Test ad string representation"""
        ad = create_test_ad(self.user, self.customer_account, name='My Ad')
        expected_str = f"Ad: My Ad - {self.customer_account.customer_id}"
        self.assertEqual(str(ad), expected_str)


class ResponsiveSearchAdInfoModelTest(TestCase):
    """Test cases for ResponsiveSearchAdInfo model"""
    
    def test_path_validation(self):
        """Test path validation"""
        # Test path2 requires path1
        search_ad = ResponsiveSearchAdInfo(path2='sale')
        
        with self.assertRaises(ValidationError):
            search_ad.clean()
        
        # Test path1 length exceeds 15 chars
        search_ad = ResponsiveSearchAdInfo(path1='This is a very long path that exceeds fifteen characters')
        
        with self.assertRaises(ValidationError) as context:
            search_ad.clean()
        
        self.assertIn('path1', context.exception.message_dict)
        self.assertIn('Value too long', str(context.exception.message_dict['path1'][0]))
    
    def test_headlines_validation(self):
        """Test headlines validation"""
        search_ad = ResponsiveSearchAdInfo.objects.create()
        
        # Test headlines less than 3
        headline1 = AdTextAsset.objects.create(text='Headline 1')
        headline2 = AdTextAsset.objects.create(text='Headline 2')
        search_ad.headlines.add(headline1, headline2)
        
        with self.assertRaises(ValidationError) as context:
            search_ad.clean()
        
        self.assertIn('headlines', context.exception.message_dict)
        self.assertIn('At least 3 headlines are required', str(context.exception.message_dict['headlines'][0]))
        
        # Test headlines more than 15
        search_ad.headlines.clear()
        for i in range(16):
            headline = AdTextAsset.objects.create(text=f'Headline {i}')
            search_ad.headlines.add(headline)
        
        with self.assertRaises(ValidationError) as context:
            search_ad.clean()
        
        self.assertIn('Maximum 15 headlines allowed', str(context.exception.message_dict['headlines'][0]))
        
        # Test headline exceeds 30 characters
        search_ad.headlines.clear()
        headline3 = AdTextAsset.objects.create(text='Headline 3')
        long_headline = AdTextAsset.objects.create(text='This is a very long headline that exceeds thirty characters')
        search_ad.headlines.add(headline1, headline2, long_headline)
        
        with self.assertRaises(ValidationError) as context:
            search_ad.clean()
        
        self.assertIn('Value too long', str(context.exception.message_dict['headlines'][0]))
    
    def test_descriptions_validation(self):
        """Test descriptions validation"""
        search_ad = ResponsiveSearchAdInfo.objects.create()
        headline1 = AdTextAsset.objects.create(text='Headline 1')
        headline2 = AdTextAsset.objects.create(text='Headline 2')
        headline3 = AdTextAsset.objects.create(text='Headline 3')
        description1 = AdTextAsset.objects.create(text='Description 1')
        search_ad.headlines.add(headline1, headline2, headline3)
        search_ad.descriptions.add(description1)
        
        # Test descriptions less than 2
        with self.assertRaises(ValidationError) as context:
            search_ad.clean()
        
        self.assertIn('descriptions', context.exception.message_dict)
        self.assertIn('At least 2 descriptions are required', str(context.exception.message_dict['descriptions'][0]))
        
        # Test descriptions more than 4
        search_ad.descriptions.clear()
        for i in range(5):
            description = AdTextAsset.objects.create(text=f'Description {i}')
            search_ad.descriptions.add(description)
        
        with self.assertRaises(ValidationError) as context:
            search_ad.clean()
        
        self.assertIn('Maximum 4 descriptions allowed', str(context.exception.message_dict['descriptions'][0]))
        
        # Test description exceeds 90 characters
        search_ad.descriptions.clear()
        description2 = AdTextAsset.objects.create(text='Description 2')
        long_description = AdTextAsset.objects.create(
            text='This is a very long description that exceeds ninety characters and should trigger a validation error when processed by the system'
        )
        search_ad.descriptions.add(description1, long_description)
        
        with self.assertRaises(ValidationError) as context:
            search_ad.clean()
        
        self.assertIn('Value too long', str(context.exception.message_dict['descriptions'][0]))
    
    def test_valid_responsive_search_ad(self):
        """Test valid ResponsiveSearchAdInfo"""
        search_ad = create_test_responsive_search_ad()
        
        try:
            search_ad.clean()
        except ValidationError:
            self.fail("Valid ResponsiveSearchAdInfo should not raise ValidationError")


class ResponsiveDisplayAdInfoModelTest(TestCase):
    """Test cases for ResponsiveDisplayAdInfo model"""
    
    def test_required_fields_validation(self):
        """Test required fields validation"""
        # Test missing business_name
        display_ad = ResponsiveDisplayAdInfo.objects.create()
        
        with self.assertRaises(ValidationError) as context:
            display_ad.clean()
        
        self.assertIn('business_name', context.exception.message_dict)
        
        # Test missing headlines
        long_headline = AdTextAsset.objects.create(text='Long Headline')
        display_ad = ResponsiveDisplayAdInfo.objects.create(
            business_name='Test Business',
            long_headline=long_headline
        )
        
        with self.assertRaises(ValidationError) as context:
            display_ad.clean()
        
        self.assertIn('headlines', context.exception.message_dict)
    
    def test_color_validation(self):
        """Test color validation"""
        long_headline = AdTextAsset.objects.create(text='Long Headline')
        headline = AdTextAsset.objects.create(text='Headline')
        description = AdTextAsset.objects.create(text='Description')
        
        # Test main_color and accent_color must be set together
        display_ad = ResponsiveDisplayAdInfo.objects.create(
            business_name='Test Business',
            long_headline=long_headline,
            main_color='#FF0000',
            accent_color='',
            allow_flexible_color=True
        )
        display_ad.headlines.add(headline)
        display_ad.descriptions.add(description)
        
        with self.assertRaises(ValidationError):
            display_ad.clean()
        
        # Test when colors are not set, allow_flexible_color must be True
        display_ad2 = ResponsiveDisplayAdInfo.objects.create(
            business_name='Test Business',
            long_headline=long_headline,
            main_color='',
            accent_color='',
            allow_flexible_color=False
        )
        display_ad2.headlines.add(headline)
        display_ad2.descriptions.add(description)
        
        with self.assertRaises(ValidationError):
            display_ad2.clean()
    
    def test_valid_responsive_display_ad(self):
        """Test valid ResponsiveDisplayAdInfo"""
        display_ad = create_test_responsive_display_ad()
        
        try:
            display_ad.clean()
        except ValidationError:
            self.fail("Valid ResponsiveDisplayAdInfo should not raise ValidationError")


class VideoResponsiveAdInfoModelTest(TestCase):
    """Test cases for VideoResponsiveAdInfo model"""
    
    def test_video_count_validation(self):
        """Test video count validation"""
        # Test no video
        video_ad = VideoResponsiveAdInfo.objects.create()
        long_headline = AdTextAsset.objects.create(text='Long Headline')
        description = AdTextAsset.objects.create(text='Description')
        video_ad.long_headlines.add(long_headline)
        video_ad.descriptions.add(description)
        
        with self.assertRaises(ValidationError) as context:
            video_ad.clean()
        
        self.assertIn('videos', context.exception.message_dict)
        self.assertIn('Select a video for your ad', str(context.exception.message_dict['videos'][0]))
        
        # Test more than 5 videos
        video_ad.videos.clear()
        for i in range(6):
            video = GoogleAdsVideoData.objects.create(
                title=f'Test Video {i}',
                video_id=f'video{i}',
                image_url=f'https://example.com/thumbnail{i}.jpg',
                message=f'Test video description {i}'
            )
            video_ad.videos.add(video)
        
        with self.assertRaises(ValidationError) as context:
            video_ad.clean()
        
        self.assertIn('Maximum 5 videos allowed', str(context.exception.message_dict['videos'][0]))
    
    def test_duplicate_video_validation(self):
        """Test duplicate video validation"""
        video_ad = VideoResponsiveAdInfo.objects.create()
        long_headline = AdTextAsset.objects.create(text='Long Headline')
        description = AdTextAsset.objects.create(text='Description')
        video_ad.long_headlines.add(long_headline)
        video_ad.descriptions.add(description)
        
        # Create two videos with same video_id value
        video1 = GoogleAdsVideoData.objects.create(
            title='Test Video 1',
            video_id='video1',
            image_url='https://example.com/thumbnail1.jpg',
            message='Test video description 1'
        )
        video2 = GoogleAdsVideoData.objects.create(
            title='Test Video 2',
            video_id='video1',  # Same video_id value
            image_url='https://example.com/thumbnail2.jpg',
            message='Test video description 2'
        )
        video_ad.videos.add(video1, video2)
        
        with self.assertRaises(ValidationError) as context:
            video_ad.clean()
        
        self.assertIn('Duplicate videos are not allowed', str(context.exception.message_dict['videos'][0]))
    
    def test_required_fields_validation(self):
        """Test required fields validation"""
        video_ad = VideoResponsiveAdInfo.objects.create()
        video = GoogleAdsVideoData.objects.create(
            title='Test Video',
            video_id='video1',
            image_url='https://example.com/thumbnail.jpg',
            message='Test video description'
        )
        video_ad.videos.add(video)
        
        # Test missing long_headlines
        with self.assertRaises(ValidationError) as context:
            video_ad.clean()
        
        self.assertIn('long_headlines', context.exception.message_dict)
    
    def test_valid_video_responsive_ad(self):
        """Test valid VideoResponsiveAdInfo"""
        video_ad = create_test_video_responsive_ad()
        
        try:
            video_ad.clean()
        except ValidationError:
            self.fail("Valid VideoResponsiveAdInfo should not raise ValidationError")


class UrlCollectionModelTest(TestCase):
    """Test cases for UrlCollection model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.ad = create_test_ad(self.user, self.customer_account)
    
    def test_url_validation(self):
        """Test URL validation"""
        # Test at least one URL field required
        url_collection = UrlCollection(
            ad=self.ad,
            url_collection_id='collection1'
        )
        
        with self.assertRaises(ValidationError) as context:
            url_collection.clean()
        
        self.assertIn('final_urls', context.exception.message_dict)
    
    def test_valid_url_collection(self):
        """Test valid UrlCollection"""
        url_collection = UrlCollection.objects.create(
            ad=self.ad,
            url_collection_id='collection1',
            final_urls=['https://example.com']
        )
        
        try:
            url_collection.clean()
        except ValidationError:
            self.fail("Valid UrlCollection should not raise ValidationError")


class AdPreviewModelTest(TestCase):
    """Test cases for AdPreview model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = create_test_user()
        self.customer_account = create_test_customer_account(self.user)
        self.ad = create_test_ad(self.user, self.customer_account)
    
    def test_create_preview(self):
        """Test creating a preview"""
        import secrets
        
        expiration_time = timezone.now() + timedelta(days=7)
        token = secrets.token_urlsafe(32)
        
        preview = AdPreview.objects.create(
            token=token,
            ad=self.ad,
            device_type='DESKTOP',
            preview_data={'test': 'data'},
            created_by=self.user,
            expiration_date_time=expiration_time
        )
        
        self.assertEqual(preview.ad, self.ad)
        self.assertEqual(preview.device_type, 'DESKTOP')
        self.assertEqual(preview.preview_data, {'test': 'data'})
        self.assertEqual(preview.created_by, self.user)
        self.assertEqual(preview.token, token)
        self.assertEqual(len(preview.token), 43)  # token_urlsafe(32) produces 43 chars
    
    def test_preview_string_representation(self):
        """Test preview string representation"""
        import secrets
        
        expiration_time = timezone.now() + timedelta(days=7)
        token = secrets.token_urlsafe(32)
        
        preview = AdPreview.objects.create(
            token=token,
            ad=self.ad,
            device_type='DESKTOP',
            preview_data={'test': 'data'},
            created_by=self.user,
            expiration_date_time=expiration_time
        )
        
        expected_str = f"Preview: Ad {self.ad.id} (DESKTOP)"
        self.assertEqual(str(preview), expected_str)


class AdTextAssetModelTest(TestCase):
    """Test cases for AdTextAsset model"""
    
    def test_create_text_asset(self):
        """Test creating a text asset"""
        text_asset = AdTextAsset.objects.create(text='Test Text')
        
        self.assertEqual(text_asset.text, 'Test Text')
        self.assertIsNotNone(text_asset.id)
    
    def test_text_asset_string_representation(self):
        """Test text asset string representation"""
        text_asset = AdTextAsset.objects.create(text='Test Text')
        # String representation includes ellipsis for long text
        expected_str = 'AdTextAsset: Test Text...'
        self.assertEqual(str(text_asset), expected_str)


class AdImageAssetModelTest(TestCase):
    """Test cases for AdImageAsset model"""
    
    def test_create_image_asset(self):
        """Test creating an image asset"""
        image_asset = AdImageAsset.objects.create(
            asset='customers/123/assets/image1',
            pixel_width=100,
            pixel_height=200,
            file_size_bytes=50000
        )
        
        self.assertEqual(image_asset.asset, 'customers/123/assets/image1')
        self.assertEqual(image_asset.pixel_width, 100)
        self.assertEqual(image_asset.pixel_height, 200)
        self.assertEqual(image_asset.file_size_bytes, 50000)
    
    def test_image_asset_string_representation(self):
        """Test image asset string representation"""
        image_asset = AdImageAsset.objects.create(
            asset='customers/123/assets/image1'
        )
        expected_str = 'AdImageAsset: customers/123/assets/image1'
        self.assertEqual(str(image_asset), expected_str)


class AdVideoAssetModelTest(TestCase):
    """Test cases for AdVideoAsset model"""
    
    def test_create_video_asset(self):
        """Test creating a video asset"""
        video_asset = AdVideoAsset.objects.create(
            asset='customers/123/assets/video1'
        )
        
        self.assertEqual(video_asset.asset, 'customers/123/assets/video1')
        self.assertIsNotNone(video_asset.id)
    
    def test_video_asset_string_representation(self):
        """Test video asset string representation"""
        video_asset = AdVideoAsset.objects.create(
            asset='customers/123/assets/video1'
        )
        expected_str = 'AdVideoAsset: customers/123/assets/video1'
        self.assertEqual(str(video_asset), expected_str)

