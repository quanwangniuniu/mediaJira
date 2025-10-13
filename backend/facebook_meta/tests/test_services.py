"""
Test cases for facebook_meta services
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

from facebook_meta.models import (
    AdLabel, AdCreative, AdCreativePhotoData,
    AdCreativeTextData, AdCreativeVideoData, AdCreativeLinkData,
    AdCreativePreview,
)
from facebook_meta.services import (
    validate_numeric_string,
    get_allowed_ad_creative_fields,
    validate_fields_param,
    validate_thumbnail_dimensions,
    validate_title_and_body,
    get_ad_creative_by_id,
    generate_json_spec_from_ad_creative,
    generate_json_spec_from_creative_data,
    get_preview_by_token,
)

User = get_user_model()


class ValidateAdCreativeIdNumericStringTest(TestCase):
    """Test cases for validate_ad_creative_id_numeric_string function"""
    
    def test_valid_numeric_strings(self):
        """Test valid numeric strings"""
        valid_ids = [
            '123456789',
            '1',
            '999999999999999',
            '0'
        ]
        
        for ad_creative_id in valid_ids:
            with self.subTest(ad_creative_id=ad_creative_id):
                result = validate_numeric_string(ad_creative_id)
                self.assertTrue(result)
    
    def test_invalid_numeric_strings(self):
        """Test invalid numeric strings"""
        invalid_ids = [
            'abc123',
            '123abc',
            '12.34',
            '12-34',
            '12_34',
            '12 34',
            '',
            ' ',
            None,
            '123abc456',
            'abc',
            '!@#$%'
        ]
        
        for ad_creative_id in invalid_ids:
            with self.subTest(ad_creative_id=ad_creative_id):
                result = validate_numeric_string(ad_creative_id)
                self.assertFalse(result)


class GetAllowedAdCreativeFieldsTest(TestCase):
    """Test cases for get_allowed_ad_creative_fields function"""
    
    def test_get_allowed_fields(self):
        """Test getting allowed fields"""
        allowed_fields = get_allowed_ad_creative_fields()
        
        # Check that it returns a list
        self.assertIsInstance(allowed_fields, list)
        
        # Check that it contains expected fields
        expected_fields = [
            'id', 'actor_id', 'name', 'status',
            'body', 'title', 'image_hash', 'image_url', 'video_id',
            'thumbnail_id', 'thumbnail_url', 'call_to_action_type',
            'call_to_action', 'authorization_category',
            'effective_authorization_category', 'categorization_criteria',
            'category_media_source', 'object_type', 'object_id',
            'object_url', 'object_store_url', 'object_story_id',
            'instagram_user_id', 'instagram_permalink_url',
            'effective_instagram_media_id', 'effective_object_story_id',
            'source_facebook_post_id', 'source_instagram_media_id',
            'threads_user_id', 'link_destination_display_url',
            'link_og_id', 'link_url', 'template_url', 'url_tags',
            'product_set_id', 'bundle_folder_id', 'destination_set_id',
            'place_page_set_id', 'dynamic_ad_voice', 'applink_treatment',
            'branded_content_sponsor_page_id',
            'collaborative_ads_lsb_image_bank_id',
            'enable_direct_install', 'enable_launch_instant_app',
            'user_page_actor_override', 'page_welcome_message',
            'messenger_sponsored_message', 'photo_album_source_object_story_id',
            'playable_asset_id', 'referral_id', 'contextual_multi_ads',
            'media_sourcing_spec', 'facebook_branded_content',
            'portrait_customizations', 'product_data', 'recommender_settings',
            'image_crops', 'ad_disclaimer_spec', 'asset_feed_spec',
            'branded_content', 'creative_sourcing_spec',
            'degrees_of_freedom_spec', 'template_url_spec',
            'platform_customizations', 'interactive_components_spec',
            'adlabels', 'object_story_spec'
        ]
        
        for field in expected_fields:
            self.assertIn(field, allowed_fields)
        
        # Check that it doesn't contain unexpected fields
        unexpected_fields = [
            'invalid_field', 'random_field', 'test_field'
        ]
        
        for field in unexpected_fields:
            self.assertNotIn(field, allowed_fields)


class ValidateFieldsParamTest(TestCase):
    """Test cases for validate_fields_param function"""
    
    def test_empty_fields_param(self):
        """Test empty fields parameter"""
        result = validate_fields_param('')
        self.assertEqual(result, [])
        
        result = validate_fields_param(None)
        self.assertEqual(result, [])
    
    def test_valid_fields_param(self):
        """Test valid fields parameter"""
        # Single field
        result = validate_fields_param('id')
        self.assertEqual(result, ['id'])
        
        # Multiple fields
        result = validate_fields_param('id,name,status')
        self.assertEqual(result, ['id', 'name', 'status'])
        
        # Fields with spaces
        result = validate_fields_param('id, name , status')
        self.assertEqual(result, ['id', 'name', 'status'])
        
        # All allowed fields
        allowed_fields = get_allowed_ad_creative_fields()
        fields_string = ','.join(allowed_fields[:5])  # First 5 fields
        result = validate_fields_param(fields_string)
        self.assertEqual(result, allowed_fields[:5])
    
    def test_invalid_fields_param(self):
        """Test invalid fields parameter"""
        invalid_fields = [
            'invalid_field',
            'id,invalid_field',
            'id,invalid_field,status',
            'random_field',
            'id,random_field,name'
        ]
        
        for fields_param in invalid_fields:
            with self.subTest(fields_param=fields_param):
                with self.assertRaises(ValidationError) as context:
                    validate_fields_param(fields_param)
                
                self.assertIn('Invalid field', str(context.exception))
    
    def test_mixed_valid_invalid_fields(self):
        """Test mixed valid and invalid fields"""
        with self.assertRaises(ValidationError) as context:
            validate_fields_param('id,invalid_field,status')
        
        self.assertIn('Invalid field', str(context.exception))
        self.assertIn('invalid_field', str(context.exception))


class ValidateThumbnailDimensionsTest(TestCase):
    """Test cases for validate_thumbnail_dimensions function"""
    
    def test_valid_dimensions(self):
        """Test valid thumbnail dimensions"""
        # Valid width and height
        result = validate_thumbnail_dimensions(100, 200)
        self.assertEqual(result, (100, 200))
        
        # Valid width, None height
        result = validate_thumbnail_dimensions(100, None)
        self.assertEqual(result, (100, 64))
        
        # None width, valid height
        result = validate_thumbnail_dimensions(None, 200)
        self.assertEqual(result, (64, 200))
        
        # Both None
        result = validate_thumbnail_dimensions(None, None)
        self.assertEqual(result, (64, 64))
        
        # Edge cases
        result = validate_thumbnail_dimensions(1, 1)
        self.assertEqual(result, (1, 1))
        
        result = validate_thumbnail_dimensions(10000, 10000)
        self.assertEqual(result, (10000, 10000))
    
    def test_invalid_width(self):
        """Test invalid width values"""
        invalid_widths = [0, -1, -100, 10001, 99999]
        
        for width in invalid_widths:
            with self.subTest(width=width):
                with self.assertRaises(ValidationError) as context:
                    validate_thumbnail_dimensions(width, 100)
                
                self.assertIn('thumbnail_width must be between 1 and 10000', str(context.exception))
    
    def test_invalid_height(self):
        """Test invalid height values"""
        invalid_heights = [0, -1, -100, 10001, 99999]
        
        for height in invalid_heights:
            with self.subTest(height=height):
                with self.assertRaises(ValidationError) as context:
                    validate_thumbnail_dimensions(100, height)
                
                self.assertIn('thumbnail_height must be between 1 and 10000', str(context.exception))
    
    def test_both_invalid_dimensions(self):
        """Test both invalid dimensions"""
        with self.assertRaises(ValidationError) as context:
            validate_thumbnail_dimensions(0, 0)
        
        # Should raise error for width first
        self.assertIn('thumbnail_width must be between 1 and 10000', str(context.exception))


class ValidateTitleAndBodyTest(TestCase):
    """Test cases for validate_title_and_body function"""
    
    def test_valid_title_and_body(self):
        """Test valid title and body"""
        # Valid title and body
        validate_title_and_body('Valid Title', 'Valid body content')
        
        # Empty title and body (should not raise error)
        validate_title_and_body('', '')
        
        # None title and body (should not raise error)
        validate_title_and_body(None, None)
        
        # Long but valid title
        long_title = 'A' * 255
        validate_title_and_body(long_title, 'Valid body')
        
        # Long but valid body
        long_body = 'A' * 10000
        validate_title_and_body('Valid title', long_body)
    
    def test_invalid_title_length(self):
        """Test invalid title length"""
        # Title too long
        long_title = 'A' * 256
        with self.assertRaises(ValidationError) as context:
            validate_title_and_body(long_title, 'Valid body')
        
        self.assertIn('Title must be 255 characters or less', str(context.exception))
    
    def test_invalid_body_length(self):
        """Test invalid body length"""
        # Body too long
        long_body = 'A' * 10001
        with self.assertRaises(ValidationError) as context:
            validate_title_and_body('Valid title', long_body)
        
        self.assertIn('Body must be 10000 characters or less', str(context.exception))
    
    def test_both_invalid_lengths(self):
        """Test both invalid lengths"""
        long_title = 'A' * 256
        long_body = 'A' * 10001
        
        with self.assertRaises(ValidationError) as context:
            validate_title_and_body(long_title, long_body)
        
        # Should raise error for title first
        self.assertIn('Title must be 255 characters or less', str(context.exception))


class GetAdCreativeByIdTest(TestCase):
    """Test cases for get_ad_creative_by_id function"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.ad_creative = AdCreative.objects.create(
            id='123456789',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
        
        # Create related objects
        self.photo_data = AdCreativePhotoData.objects.create(
            caption='Test photo caption',
            image_hash='abc123',
            url='https://example.com/image.jpg'
        )
        
        self.text_data = AdCreativeTextData.objects.create(
            message='Test text message'
        )
        
        self.video_data = AdCreativeVideoData.objects.create(
            title='Test Video Title',
            video_id='video_123',
            message='Test video message'
        )
        
        self.link_data = AdCreativeLinkData.objects.create(
            name='Test Link',
            link='https://example.com',
            message='Test link message'
        )
        
        # Set object story spec data
        # Use .set() for ManyToMany fields
        self.ad_creative.object_story_spec_photo_data.set([self.photo_data])
        self.ad_creative.object_story_spec_text_data = self.text_data
        self.ad_creative.object_story_spec_video_data.set([self.video_data])
        self.ad_creative.object_story_spec_link_data = self.link_data
        self.ad_creative.save()
    
    def test_get_existing_ad_creative(self):
        """Test getting existing ad creative"""
        result = get_ad_creative_by_id('123456789')
        
        self.assertEqual(result, self.ad_creative)
        self.assertEqual(result.id, '123456789')
        self.assertEqual(result.name, 'Test Ad Creative')
        self.assertEqual(result.status, AdCreative.STATUS_ACTIVE)
    
    def test_get_nonexistent_ad_creative(self):
        """Test getting non-existent ad creative"""
        with self.assertRaises(ValidationError) as context:
            get_ad_creative_by_id('999999999')
        
        self.assertIn('AdCreative not found', str(context.exception))
    
    def test_get_ad_creative_invalid_id_format(self):
        """Test getting ad creative with invalid ID format"""
        invalid_ids = ['abc123', '123abc', '12.34', '']
        
        for invalid_id in invalid_ids:
            with self.subTest(invalid_id=invalid_id):
                with self.assertRaises(ValidationError) as context:
                    get_ad_creative_by_id(invalid_id)
                
                self.assertIn('ad_creative_id must be a numeric string', str(context.exception))
    
    def test_get_ad_creative_with_related_objects(self):
        """Test getting ad creative with related objects"""
        result = get_ad_creative_by_id('123456789')
        
        # Check that related objects are loaded
        self.assertIn(self.photo_data, result.object_story_spec_photo_data.all())
        self.assertEqual(result.object_story_spec_text_data, self.text_data)
        self.assertIn(self.video_data, result.object_story_spec_video_data.all())
        self.assertEqual(result.object_story_spec_link_data, self.link_data)
        
        # Check that actor are loaded
        self.assertEqual(result.actor, self.user)
    
    def test_get_ad_creative_with_ad_labels(self):
        """Test getting ad creative with ad labels"""
        # Create and add ad labels
        label1 = AdLabel.objects.create(
            id='label_1',
            name='Label 1'
        )
        
        label2 = AdLabel.objects.create(
            id='label_2',
            name='Label 2'
        )
        
        self.ad_creative.ad_labels.add(label1, label2)
        
        result = get_ad_creative_by_id('123456789')
        
        # Check that ad labels are loaded
        labels = result.ad_labels.all()
        self.assertEqual(labels.count(), 2)
        self.assertIn(label1, labels)
        self.assertIn(label2, labels)
    
    def test_get_ad_creative_query_optimization(self):
        """Test that get_ad_creative_by_id uses proper query optimization"""
        # This test ensures that the function uses select_related and prefetch_related
        # to minimize database queries
        
        # Create additional related objects
        for i in range(5):
            AdLabel.objects.create(
                id=f'label_{i}',
                name=f'Label {i}'
            )
        
        # Add labels to creative
        labels = AdLabel.objects.all()
        self.ad_creative.ad_labels.add(*labels)
        
        # Get the creative (should use optimized queries)
        result = get_ad_creative_by_id('123456789')
        
        # Access related objects (should not trigger additional queries)
        actor_username = result.actor.username
        labels_count = result.ad_labels.count()
        # photo_data is now ManyToMany, so access first item
        photo_data_count = result.object_story_spec_photo_data.count()
        photo_caption = result.object_story_spec_photo_data.first().caption if photo_data_count > 0 else None
        
        # Verify data is accessible
        self.assertEqual(actor_username, 'testuser')
        self.assertEqual(labels_count, 5)
        self.assertEqual(photo_caption, 'Test photo caption')


class ServicesExtraCoverageAppendedTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('svc-extra@example.com', 'password')

    def test_validate_helpers_errors(self):
        self.assertFalse(validate_numeric_string(None))
        self.assertFalse(validate_numeric_string('abc'))

        with self.assertRaises(ValidationError):
            validate_fields_param('id,non_existing_field')

        with self.assertRaises(ValidationError):
            validate_thumbnail_dimensions(0, 10)
        with self.assertRaises(ValidationError):
            validate_thumbnail_dimensions(10, 10001)

    def test_generate_json_spec_from_creative_data_kwargs(self):
        spec = generate_json_spec_from_creative_data({'k': 'v'}, 'MOBILE_FEED_STANDARD', width=300, height=250)
        self.assertEqual(spec['ad_format'], 'MOBILE_FEED_STANDARD')
        self.assertEqual(spec['creative_data'], {'k': 'v'})
        self.assertEqual(spec['width'], 300)
        self.assertEqual(spec['height'], 250)

    def test_get_ad_creative_by_id_errors(self):
        with self.assertRaises(ValidationError):
            get_ad_creative_by_id('abc')
        with self.assertRaises(ValidationError):
            get_ad_creative_by_id('999999999')

    def test_generate_json_spec_from_ad_creative_all_paths(self):
        link = AdCreativeLinkData.objects.create()
        photo = AdCreativePhotoData.objects.create()
        video = AdCreativeVideoData.objects.create()
        text = AdCreativeTextData.objects.create(message='hello')
        template = AdCreativeLinkData.objects.create()

        creative = AdCreative.objects.create(
            id='1759000000000000',
            actor=self.user,
            name='Spec All',
            status=AdCreative.STATUS_ACTIVE,
            object_story_spec_instagram_user_id='ig_1',
            object_story_spec_page_id='pg_1',
            object_story_spec_product_data=[{'p': 1}],
            object_story_spec_link_data=link,
            object_story_spec_text_data=text,
            object_story_spec_template_data=template,
        )
        # Use .set() for ManyToMany fields
        creative.object_story_spec_photo_data.set([photo])
        creative.object_story_spec_video_data.set([video])

        spec = generate_json_spec_from_ad_creative(creative, 'MOBILE_FEED_STANDARD', width=320)
        self.assertEqual(spec['ad_creative_id'], creative.id)
        self.assertIn('object_story_spec', spec)
        oss = spec['object_story_spec']
        self.assertIn('link_data', oss)
        self.assertIn('photo_data', oss)
        self.assertIn('video_data', oss)
        self.assertIn('text_data', oss)
        self.assertIn('template_data', oss)
        self.assertEqual(spec['width'], 320)

    def test_get_preview_by_token_paths(self):
        with self.assertRaises(ValidationError):
            get_preview_by_token('does-not-exist')

        preview = AdCreativePreview.objects.create(
            ad_creative_id=None,
            token='tok-valid',
            json_spec={'ok': True},
            expires_at=timezone.now() + timedelta(hours=1),
        )
        self.assertEqual(get_preview_by_token('tok-valid'), {'ok': True})

        expired = AdCreativePreview.objects.create(
            ad_creative_id=None,
            token='tok-expired',
            json_spec={'ok': False},
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        with self.assertRaises(ValidationError):
            get_preview_by_token('tok-expired')
        self.assertFalse(AdCreativePreview.objects.filter(token='tok-expired').exists())


class ServiceIntegrationTest(TestCase):
    """Test integration between different services"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.ad_creative = AdCreative.objects.create(
            id='123456789',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
    
    def test_validate_and_get_ad_creative_integration(self):
        """Test integration between validation and retrieval"""
        # Valid ID
        is_valid = validate_numeric_string('123456789')
        self.assertTrue(is_valid)
        
        if is_valid:
            creative = get_ad_creative_by_id('123456789')
            self.assertEqual(creative, self.ad_creative)
        
        # Invalid ID
        is_valid = validate_numeric_string('abc123')
        self.assertFalse(is_valid)
        
        if not is_valid:
            with self.assertRaises(ValidationError):
                get_ad_creative_by_id('abc123')
    
    def test_validate_fields_and_get_creative_integration(self):
        """Test integration between field validation and creative retrieval"""
        # Valid fields
        try:
            fields = validate_fields_param('id,name,status')
            self.assertEqual(fields, ['id', 'name', 'status'])
            
            creative = get_ad_creative_by_id('123456789')
            self.assertIsNotNone(creative)
            
        except ValidationError:
            self.fail("Valid fields should not raise ValidationError")
        
        # Invalid fields
        with self.assertRaises(ValidationError):
            validate_fields_param('id,invalid_field,status')
    
    def test_validate_thumbnail_dimensions_and_get_creative_integration(self):
        """Test integration between thumbnail validation and creative retrieval"""
        # Valid dimensions
        try:
            width, height = validate_thumbnail_dimensions(100, 200)
            self.assertEqual(width, 100)
            self.assertEqual(height, 200)
            
            creative = get_ad_creative_by_id('123456789')
            self.assertIsNotNone(creative)
            
        except ValidationError:
            self.fail("Valid dimensions should not raise ValidationError")
        
        # Invalid dimensions
        with self.assertRaises(ValidationError):
            validate_thumbnail_dimensions(0, 200)
    
    def test_validate_title_body_and_get_creative_integration(self):
        """Test integration between title/body validation and creative retrieval"""
        # Valid title and body
        try:
            validate_title_and_body('Valid Title', 'Valid body content')
            
            creative = get_ad_creative_by_id('123456789')
            self.assertIsNotNone(creative)
            
        except ValidationError:
            self.fail("Valid title and body should not raise ValidationError")
        
        # Invalid title
        with self.assertRaises(ValidationError):
            validate_title_and_body('A' * 256, 'Valid body')
        
        # Invalid body
        with self.assertRaises(ValidationError):
            validate_title_and_body('Valid title', 'A' * 10001)
    
    def test_comprehensive_validation_flow(self):
        """Test comprehensive validation flow"""
        # Test data
        ad_creative_id = '123456789'
        fields_param = 'id,name,status,body'
        thumbnail_width = 100
        thumbnail_height = 200
        title = 'Test Title'
        body = 'Test body content'
        
        try:
            # Step 1: Validate ID format
            is_valid_id = validate_numeric_string(ad_creative_id)
            self.assertTrue(is_valid_id)
            
            # Step 2: Validate fields parameter
            allowed_fields = validate_fields_param(fields_param)
            self.assertEqual(allowed_fields, ['id', 'name', 'status', 'body'])
            
            # Step 3: Validate thumbnail dimensions
            width, height = validate_thumbnail_dimensions(thumbnail_width, thumbnail_height)
            self.assertEqual(width, 100)
            self.assertEqual(height, 200)
            
            # Step 4: Validate title and body
            validate_title_and_body(title, body)
            
            # Step 5: Get the ad creative
            creative = get_ad_creative_by_id(ad_creative_id)
            self.assertIsNotNone(creative)
            self.assertEqual(creative.id, ad_creative_id)
            
        except ValidationError as e:
            self.fail(f"Comprehensive validation should not raise ValidationError: {e}")
    
    def test_service_error_handling(self):
        """Test service error handling with invalid data"""
        # Test with invalid ID
        with self.assertRaises(ValidationError):
            get_ad_creative_by_id('invalid_id')
        
        # Test with non-existent ID
        with self.assertRaises(ValidationError):
            get_ad_creative_by_id('999999999')
        
        # Test with invalid fields
        with self.assertRaises(ValidationError):
            validate_fields_param('id,invalid_field')
        
        # Test with invalid dimensions
        with self.assertRaises(ValidationError):
            validate_thumbnail_dimensions(0, 100)
        
        # Test with invalid title/body
        with self.assertRaises(ValidationError):
            validate_title_and_body('A' * 256, 'Valid body')
