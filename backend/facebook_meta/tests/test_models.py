"""
Test cases for facebook_meta models
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta

from facebook_meta.models import (
    AdLabel, AdCreative, AdCreativePreview,
    AdCreativePhotoData, AdCreativeTextData, AdCreativeVideoData, AdCreativeLinkData
)

User = get_user_model()

class AdLabelModelTest(TestCase):
    """Test cases for AdLabel model"""
    
    def setUp(self):
        """Set up test data"""
    
    def test_create_ad_label(self):
        """Test creating an ad label"""
        ad_label = AdLabel.objects.create(
            id='label_123',
            name='Test Label'
        )
        
        self.assertEqual(ad_label.id, 'label_123')
        self.assertEqual(ad_label.name, 'Test Label')
        self.assertIsNotNone(ad_label.created_time)
        self.assertIsNotNone(ad_label.updated_time)
    
    def test_ad_label_string_representation(self):
        """Test ad label string representation"""
        ad_label = AdLabel.objects.create(
            id='label_123',
            name='Test Label'
        )
        
        self.assertEqual(str(ad_label), 'label_123')
    
    def test_ad_label_required_fields(self):
        """Test ad label required fields"""
        # Test missing id
        with self.assertRaises(ValidationError):
            ad_label = AdLabel(
                name='Test Label'
            )
            ad_label.full_clean()
        
        # Test missing name
        with self.assertRaises(ValidationError):
            ad_label = AdLabel(
                id='label_123',
            )
            ad_label.full_clean()
    
    def test_ad_label_foreign_key_relationship(self):
        """Test ad label foreign key relationship"""
        ad_label = AdLabel.objects.create(
            id='label_123',
            name='Test Label'
        )


class AdCreativePhotoDataModelTest(TestCase):
    """Test cases for AdCreativePhotoData model"""
    
    def test_create_photo_data(self):
        """Test creating photo data"""
        photo_data = AdCreativePhotoData.objects.create(
            caption='Test photo caption',
            image_hash='abc123',
            url='https://example.com/image.jpg'
        )
        
        self.assertEqual(photo_data.caption, 'Test photo caption')
        self.assertEqual(photo_data.image_hash, 'abc123')
        self.assertEqual(photo_data.url, 'https://example.com/image.jpg')
        self.assertIsNotNone(photo_data.id)
    
    def test_photo_data_string_representation(self):
        """Test photo data string representation"""
        photo_data = AdCreativePhotoData.objects.create(
            caption='Test photo caption that is longer than 50 characters to test truncation',
            image_hash='abc123',
            url='https://example.com/image.jpg'
        )
        
        expected_str = f"PhotoData - {photo_data.caption[:50]}"
        self.assertEqual(str(photo_data), expected_str)
    
    def test_photo_data_optional_fields(self):
        """Test photo data with optional fields"""
        photo_data = AdCreativePhotoData.objects.create(
            branded_content_shared_to_sponsor_status='ACTIVE',
            branded_content_sponsor_page_id='page_123',
            branded_content_sponser_relationship='SPONSOR',
            caption='Test caption',
            image_hash='abc123',
            page_welcome_message='Welcome message',
            url='https://example.com/image.jpg'
        )
        
        self.assertEqual(photo_data.branded_content_shared_to_sponsor_status, 'ACTIVE')
        self.assertEqual(photo_data.branded_content_sponsor_page_id, 'page_123')
        self.assertEqual(photo_data.branded_content_sponser_relationship, 'SPONSOR')
        self.assertEqual(photo_data.page_welcome_message, 'Welcome message')


class AdCreativeTextDataModelTest(TestCase):
    """Test cases for AdCreativeTextData model"""
    
    def test_create_text_data(self):
        """Test creating text data"""
        text_data = AdCreativeTextData.objects.create(
            message='Test text message'
        )
        
        self.assertEqual(text_data.message, 'Test text message')
        self.assertIsNotNone(text_data.id)
    
    def test_text_data_string_representation(self):
        """Test text data string representation"""
        text_data = AdCreativeTextData.objects.create(
            message='Test text message that is longer than 50 characters to test truncation'
        )
        
        expected_str = f"TextData - {text_data.message[:50]}"
        self.assertEqual(str(text_data), expected_str)
    
    def test_text_data_required_message(self):
        """Test text data required message field"""
        with self.assertRaises(ValidationError):
            text_data = AdCreativeTextData()
            text_data.full_clean()


class AdCreativeVideoDataModelTest(TestCase):
    """Test cases for AdCreativeVideoData model"""
    
    def test_create_video_data(self):
        """Test creating video data"""
        video_data = AdCreativeVideoData.objects.create(
            title='Test Video Title',
            video_id='video_123',
            message='Test video message'
        )
        
        self.assertEqual(video_data.title, 'Test Video Title')
        self.assertEqual(video_data.video_id, 'video_123')
        self.assertEqual(video_data.message, 'Test video message')
        self.assertIsNotNone(video_data.id)
    
    def test_video_data_string_representation(self):
        """Test video data string representation"""
        video_data = AdCreativeVideoData.objects.create(
            title='Test Video Title',
            video_id='video_123',
            message='Test video message'
        )
        
        self.assertEqual(str(video_data), 'VideoData - Test Video Title')
    
    def test_video_data_optional_fields(self):
        """Test video data with optional fields"""
        video_data = AdCreativeVideoData.objects.create(
            additional_image_index=1,
            branded_content_shared_to_sponsor_status='ACTIVE',
            branded_content_sponsor_page_id='page_123',
            branded_content_sponser_relationship='SPONSOR',
            call_to_action={'type': 'LEARN_MORE'},
            caption_ids=[{'id': 'cap1'}, {'id': 'cap2'}],
            collection_thumbnails=[{'thumb1': 'url1'}],
            customization_rules_spec=[{'rule1': 'value1'}],
            image_hash='abc123',
            image_url='https://example.com/thumb.jpg',
            link_description='Link description',
            message='Test video message',
            offer_id='offer_123',
            page_welcome_message='Welcome message',
            post_click_configuration={'config': 'value'},
            retailer_item_ids=[{'item1': 'id1'}],
            targeting={'audience': 'test'},
            title='Test Video Title',
            video_id='video_123'
        )
        
        self.assertEqual(video_data.additional_image_index, 1)
        self.assertEqual(video_data.branded_content_shared_to_sponsor_status, 'ACTIVE')
        self.assertEqual(video_data.call_to_action, {'type': 'LEARN_MORE'})
        self.assertEqual(video_data.caption_ids, [{'id': 'cap1'}, {'id': 'cap2'}])
        self.assertEqual(video_data.collection_thumbnails, [{'thumb1': 'url1'}])
        self.assertEqual(video_data.customization_rules_spec, [{'rule1': 'value1'}])
        self.assertEqual(video_data.image_hash, 'abc123')
        self.assertEqual(video_data.image_url, 'https://example.com/thumb.jpg')
        self.assertEqual(video_data.link_description, 'Link description')
        self.assertEqual(video_data.offer_id, 'offer_123')
        self.assertEqual(video_data.page_welcome_message, 'Welcome message')
        self.assertEqual(video_data.post_click_configuration, {'config': 'value'})
        self.assertEqual(video_data.retailer_item_ids, [{'item1': 'id1'}])
        self.assertEqual(video_data.targeting, {'audience': 'test'})


class AdCreativeLinkDataModelTest(TestCase):
    """Test cases for AdCreativeLinkData model"""
    
    def test_create_link_data(self):
        """Test creating link data"""
        link_data = AdCreativeLinkData.objects.create(
            name='Test Link',
            link='https://example.com',
            message='Test link message'
        )
        
        self.assertEqual(link_data.name, 'Test Link')
        self.assertEqual(link_data.link, 'https://example.com')
        self.assertEqual(link_data.message, 'Test link message')
        self.assertIsNotNone(link_data.id)
    
    def test_link_data_string_representation(self):
        """Test link data string representation"""
        link_data = AdCreativeLinkData.objects.create(
            name='Test Link',
            link='https://example.com',
            message='Test link message'
        )
        
        self.assertEqual(str(link_data), 'LinkData - Test Link')
    
    def test_link_data_attachment_style_choices(self):
        """Test link data attachment style choices"""
        style_choices = AdCreativeLinkData.ATTACHMENT_STYLE_CHOICES
        
        expected_choices = [
            ('LINK', 'Link'),
            ('DEFAULT', 'Default')
        ]
        
        self.assertEqual(style_choices, expected_choices)
    
    def test_link_data_format_option_choices(self):
        """Test link data format option choices"""
        format_choices = AdCreativeLinkData.FORMAT_OPTION_CHOICES
        
        expected_choices = [
            ('carousel_ar_effects', 'Carousel AR Effects'),
            ('carousel_images_multi_items', 'Carousel Images Multi Items'),
            ('carousel_images_single_item', 'Carousel Images Single Item'),
            ('carousel_slideshows', 'Carousel Slideshows'),
            ('collection_video', 'Collection Video'),
            ('single_image', 'Single Image')
        ]
        
        self.assertEqual(format_choices, expected_choices)
    
    def test_link_data_optional_fields(self):
        """Test link data with optional fields"""
        link_data = AdCreativeLinkData.objects.create(
            ad_context='test_context',
            additional_image_index=1,
            app_link_spec={'ios': 'ios://app'},
            attachment_style=AdCreativeLinkData.ATTACHMENT_STYLE_LINK,
            boosted_product_set_id='product_set_123',
            branded_content_shared_to_sponsor_status='ACTIVE',
            branded_content_sponsor_page_id='page_123',
            branded_content_sponsor_relationship='SPONSOR',
            call_to_action={'type': 'LEARN_MORE'},
            caption='Test caption',
            child_attachments=[{'child1': 'data1'}],
            collection_thumbnails=[{'thumb1': 'url1'}],
            customization_rules_spec=[{'rule1': 'value1'}],
            description='Test description',
            event_id='event_123',
            force_single_link=True,
            format_option=AdCreativeLinkData.FORMAT_OPTION_SINGLE_IMAGE,
            image_crops={'crop1': 'data1'},
            image_hash='abc123',
            image_layer_specs=[{'layer1': 'data1'}],
            image_overlay_spec={'overlay1': 'data1'},
            link='https://example.com',
            message='Test link message',
            multi_share_end_card=False,
            multi_share_optimized=True,
            name='Test Link',
            offer_id='offer_123',
            page_welcome_message='Welcome message',
            picture='https://example.com/picture.jpg',
            post_click_configuration={'config': 'value'},
            preferred_image_tags=[{'tag1': 'data1'}],
            preferred_video_tags=[{'tag1': 'data1'}],
            retailer_item_ids=[{'item1': 'id1'}],
            show_multiple_images=True,
            sponsorship_info={'sponsor1': 'data1'},
            use_flexible_image_aspect_ratio=False
        )
        
        self.assertEqual(link_data.ad_context, 'test_context')
        self.assertEqual(link_data.additional_image_index, 1)
        self.assertEqual(link_data.app_link_spec, {'ios': 'ios://app'})
        self.assertEqual(link_data.attachment_style, AdCreativeLinkData.ATTACHMENT_STYLE_LINK)
        self.assertEqual(link_data.boosted_product_set_id, 'product_set_123')
        self.assertEqual(link_data.branded_content_shared_to_sponsor_status, 'ACTIVE')
        self.assertEqual(link_data.branded_content_sponsor_page_id, 'page_123')
        self.assertEqual(link_data.branded_content_sponsor_relationship, 'SPONSOR')
        self.assertEqual(link_data.call_to_action, {'type': 'LEARN_MORE'})
        self.assertEqual(link_data.caption, 'Test caption')
        self.assertEqual(link_data.child_attachments, [{'child1': 'data1'}])
        self.assertEqual(link_data.collection_thumbnails, [{'thumb1': 'url1'}])
        self.assertEqual(link_data.customization_rules_spec, [{'rule1': 'value1'}])
        self.assertEqual(link_data.description, 'Test description')
        self.assertEqual(link_data.event_id, 'event_123')
        self.assertTrue(link_data.force_single_link)
        self.assertEqual(link_data.format_option, AdCreativeLinkData.FORMAT_OPTION_SINGLE_IMAGE)
        self.assertEqual(link_data.image_crops, {'crop1': 'data1'})
        self.assertEqual(link_data.image_hash, 'abc123')
        self.assertEqual(link_data.image_layer_specs, [{'layer1': 'data1'}])
        self.assertEqual(link_data.image_overlay_spec, {'overlay1': 'data1'})
        self.assertEqual(link_data.link, 'https://example.com')
        self.assertEqual(link_data.message, 'Test link message')
        self.assertFalse(link_data.multi_share_end_card)
        self.assertTrue(link_data.multi_share_optimized)
        self.assertEqual(link_data.name, 'Test Link')
        self.assertEqual(link_data.offer_id, 'offer_123')
        self.assertEqual(link_data.page_welcome_message, 'Welcome message')
        self.assertEqual(link_data.picture, 'https://example.com/picture.jpg')
        self.assertEqual(link_data.post_click_configuration, {'config': 'value'})
        self.assertEqual(link_data.preferred_image_tags, [{'tag1': 'data1'}])
        self.assertEqual(link_data.preferred_video_tags, [{'tag1': 'data1'}])
        self.assertEqual(link_data.retailer_item_ids, [{'item1': 'id1'}])
        self.assertTrue(link_data.show_multiple_images)
        self.assertEqual(link_data.sponsorship_info, {'sponsor1': 'data1'})
        self.assertFalse(link_data.use_flexible_image_aspect_ratio)


class AdCreativeModelTest(TestCase):
    """Test cases for AdCreative model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.ad_label = AdLabel.objects.create(
            id='label_123',
            name='Test Label'
        )
    
    def test_create_ad_creative(self):
        """Test creating an ad creative"""
        ad_creative = AdCreative.objects.create(
            id='creative_123',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
        
        self.assertEqual(ad_creative.id, 'creative_123')
        self.assertEqual(ad_creative.actor, self.user)
        self.assertEqual(ad_creative.name, 'Test Ad Creative')
        self.assertEqual(ad_creative.status, AdCreative.STATUS_ACTIVE)
        self.assertIsNotNone(ad_creative)
    
    def test_ad_creative_string_representation(self):
        """Test ad creative string representation"""
        ad_creative = AdCreative.objects.create(
            id='creative_123',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
        
        self.assertEqual(str(ad_creative), 'creative_123 - Test Ad Creative')
    
    def test_ad_creative_status_choices(self):
        """Test ad creative status choices"""
        status_choices = AdCreative.STATUS_CHOICES
        
        expected_choices = [
            ('ACTIVE', 'Active'),
            ('IN_PROCESS', 'In Process'),
            ('WITH_ISSUES', 'With Issues'),
            ('DELETED', 'Deleted')
        ]
        
        self.assertEqual(status_choices, expected_choices)
    
    def test_ad_creative_call_to_action_choices(self):
        """Test ad creative call to action choices"""
        cta_choices = AdCreative.CALL_TO_ACTION_CHOICES
        
        # Check that some expected choices exist
        expected_choices = [
            ('OPEN_LINK', 'Open Link'),
            ('LIKE_PAGE', 'Like Page'),
            ('SHOP_NOW', 'Shop Now'),
            ('LEARN_MORE', 'Learn More')
        ]
        
        for choice in expected_choices:
            self.assertIn(choice, cta_choices)
    
    def test_ad_creative_object_type_choices(self):
        """Test ad creative object type choices"""
        object_type_choices = AdCreative.OBJECT_TYPE_CHOICES
        
        expected_choices = [
            ('APPLICATION', 'Application'),
            ('DOMAIN', 'Domain'),
            ('EVENT', 'Event'),
            ('OFFER', 'Offer'),
            ('PAGE', 'Page'),
            ('PHOTO', 'Photo'),
            ('VIDEO', 'Video')
        ]
        
        for choice in expected_choices:
            self.assertIn(choice, object_type_choices)
    
    def test_ad_creative_required_fields(self):
        """Test ad creative required fields"""
        # Test missing id
        with self.assertRaises(ValidationError):
            ad_creative = AdCreative(
                actor=self.user,
                name='Test Ad Creative',
                status=AdCreative.STATUS_ACTIVE
            )
            ad_creative.full_clean()
        
        # Test missing actor
        with self.assertRaises(ValidationError):
            ad_creative = AdCreative(
                id='creative_123',
                name='Test Ad Creative',
                status=AdCreative.STATUS_ACTIVE
            )
            ad_creative.full_clean()
        
        # Test missing name
        with self.assertRaises(ValidationError):
            ad_creative = AdCreative(
                id='creative_123',
                actor=self.user,
                status=AdCreative.STATUS_ACTIVE
            )
            ad_creative.full_clean()
        
        # Test missing status
        with self.assertRaises(ValidationError):
            ad_creative = AdCreative(
                id='creative_123',
                actor=self.user,
                name='Test Ad Creative'
            )
            ad_creative.full_clean()
    
    def test_ad_creative_foreign_key_relationships(self):
        """Test ad creative foreign key relationships"""
        ad_creative = AdCreative.objects.create(
            id='creative_123',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
        
        # Test forward relationships
        self.assertEqual(ad_creative.actor, self.user)
        
        # Test reverse relationships
        self.assertIn(ad_creative, self.user.owned_ad_creatives.all())
    
    def test_ad_creative_many_to_many_relationship(self):
        """Test ad creative many-to-many relationship with ad labels"""
        ad_creative = AdCreative.objects.create(
            id='creative_123',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
        
        # Add ad label
        ad_creative.ad_labels.add(self.ad_label)
        
        # Test relationship
        self.assertIn(self.ad_label, ad_creative.ad_labels.all())
        self.assertIn(ad_creative, self.ad_label.creatives.all())
    
    def test_ad_creative_cascade_delete_user(self):
        """Test ad creative cascade delete when user is deleted"""
        ad_creative = AdCreative.objects.create(
            id='creative_123',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
        
        ad_creative = ad_creative.id
        
        # Delete user
        self.user.delete()
        
        # Ad creative should be deleted as well
        self.assertFalse(AdCreative.objects.filter(id=ad_creative).exists())
    
    def test_ad_creative_optional_fields(self):
        """Test ad creative with optional fields"""
        ad_creative = AdCreative.objects.create(
            id='creative_123',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE,
            body='Test body content',
            call_to_action_type='LEARN_MORE',
            authorization_category=AdCreative.AUTH_NONE,
            object_type=AdCreative.OBJECT_TYPE_PAGE,
            object_id='object_123',
            object_url='https://example.com',
            image_hash='abc123',
            image_url='https://example.com/image.jpg',
            video_id='video_123',
            thumbnail_id='thumb_123',
            thumbnail_url='https://example.com/thumb.jpg',
            title='Test Title',
            call_to_action={'type': 'LEARN_MORE'},
            ad_disclaimer_spec={'disclaimer': 'test'},
            asset_feed_spec={'feed': 'test'},
            branded_content={'content': 'test'},
            contextual_multi_ads={'ads': 'test'},
            creative_sourcing_spec={'sourcing': 'test'},
            degrees_of_freedom_spec={'freedom': 'test'},
            facebook_branded_content={'fb_content': 'test'},
            image_crops={'crops': 'test'},
            media_sourcing_spec={'media': 'test'},
            portrait_customizations={'portrait': 'test'},
            product_data={'product': 'test'},
            recommender_settings={'recommender': 'test'},
            template_url_spec={'template': 'test'},
            platform_customizations={'platform': 'test'},
            interactive_components_spec={'components': 'test'}
        )
        
        self.assertEqual(ad_creative.body, 'Test body content')
        self.assertEqual(ad_creative.call_to_action_type, 'LEARN_MORE')
        self.assertEqual(ad_creative.authorization_category, AdCreative.AUTH_NONE)
        self.assertEqual(ad_creative.object_type, AdCreative.OBJECT_TYPE_PAGE)
        self.assertEqual(ad_creative.object_id, 'object_123')
        self.assertEqual(ad_creative.object_url, 'https://example.com')
        self.assertEqual(ad_creative.image_hash, 'abc123')
        self.assertEqual(ad_creative.image_url, 'https://example.com/image.jpg')
        self.assertEqual(ad_creative.video_id, 'video_123')
        self.assertEqual(ad_creative.thumbnail_id, 'thumb_123')
        self.assertEqual(ad_creative.thumbnail_url, 'https://example.com/thumb.jpg')
        self.assertEqual(ad_creative.title, 'Test Title')
        self.assertEqual(ad_creative.call_to_action, {'type': 'LEARN_MORE'})
        self.assertEqual(ad_creative.ad_disclaimer_spec, {'disclaimer': 'test'})
        self.assertEqual(ad_creative.asset_feed_spec, {'feed': 'test'})
        self.assertEqual(ad_creative.branded_content, {'content': 'test'})
        self.assertEqual(ad_creative.contextual_multi_ads, {'ads': 'test'})
        self.assertEqual(ad_creative.creative_sourcing_spec, {'sourcing': 'test'})
        self.assertEqual(ad_creative.degrees_of_freedom_spec, {'freedom': 'test'})
        self.assertEqual(ad_creative.facebook_branded_content, {'fb_content': 'test'})
        self.assertEqual(ad_creative.image_crops, {'crops': 'test'})
        self.assertEqual(ad_creative.media_sourcing_spec, {'media': 'test'})
        self.assertEqual(ad_creative.portrait_customizations, {'portrait': 'test'})
        self.assertEqual(ad_creative.product_data, {'product': 'test'})
        self.assertEqual(ad_creative.recommender_settings, {'recommender': 'test'})
        self.assertEqual(ad_creative.template_url_spec, {'template': 'test'})
        self.assertEqual(ad_creative.platform_customizations, {'platform': 'test'})
        self.assertEqual(ad_creative.interactive_components_spec, {'components': 'test'})


class AdCreativePreviewModelTest(TestCase):
    """Test cases for AdCreativePreview model"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.ad_creative = AdCreative.objects.create(
            id='creative_123',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
    
    def test_create_ad_creative_preview(self):
        """Test creating an ad creative preview"""
        preview = AdCreativePreview.objects.create(
            link='https://example.com/preview',
            ad_creative=self.ad_creative,
            token='preview_token_123',
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        self.assertEqual(preview.link, 'https://example.com/preview')
        self.assertEqual(preview.ad_creative, self.ad_creative)
        self.assertEqual(preview.token, 'preview_token_123')
        self.assertIsNotNone(preview.id)
    
    def test_preview_required_fields(self):
        """Test preview required fields"""
        # Test missing link
        with self.assertRaises(ValidationError):
            preview = AdCreativePreview(
                ad_creative=self.ad_creative,
                token='preview_token_123'
            )
            preview.full_clean()
        
        # Test missing ad_creative
        with self.assertRaises(ValidationError):
            preview = AdCreativePreview(
                link='https://example.com/preview',
                token='preview_token_123'
            )
            preview.full_clean()
        
        # Test missing token
        with self.assertRaises(ValidationError):
            preview = AdCreativePreview(
                link='https://example.com/preview',
                ad_creative=self.ad_creative
            )
            preview.full_clean()
    
    def test_preview_foreign_key_relationship(self):
        """Test preview foreign key relationship"""
        preview = AdCreativePreview.objects.create(
            link='https://example.com/preview',
            ad_creative=self.ad_creative,
            token='preview_token_123',
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        # Test forward relationship
        self.assertEqual(preview.ad_creative, self.ad_creative)
        
        # Test reverse relationship
        self.assertIn(preview, self.ad_creative.owned_previews.all())
    
    def test_preview_cascade_delete_creative(self):
        """Test preview cascade delete when creative is deleted"""
        preview = AdCreativePreview.objects.create(
            link='https://example.com/preview',
            ad_creative=self.ad_creative,
            token='preview_token_123',
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        preview_id = preview.id
        
        # Delete ad creative
        self.ad_creative.delete()
        
        # Preview should be deleted as well
        self.assertFalse(AdCreativePreview.objects.filter(id=preview_id).exists())
    
    def test_preview_unique_token(self):
        """Test preview unique token constraint"""
        AdCreativePreview.objects.create(
            link='https://example.com/preview1',
            ad_creative=self.ad_creative,
            token='unique_token_123',
            expires_at=timezone.now() + timedelta(hours=24)
        )
        
        # Try to create another with same token
        with self.assertRaises(IntegrityError):
            AdCreativePreview.objects.create(
                link='https://example.com/preview2',
                ad_creative=self.ad_creative,
                token='unique_token_123',
                expires_at=timezone.now() + timedelta(hours=24)
            )
    
    def test_preview_days_active_field(self):
        """Test preview days_active field with choices"""
        # Test with 7 days
        preview_7 = AdCreativePreview.objects.create(
            link='https://example.com/preview7',
            ad_creative=self.ad_creative,
            token='token_7',
            expires_at=timezone.now() + timedelta(days=7),
            days_active=7
        )
        
        self.assertEqual(preview_7.days_active, 7)

        preview_7.delete()
        
        # Test with 14 days
        preview_14 = AdCreativePreview.objects.create(
            link='https://example.com/preview14',
            ad_creative=self.ad_creative,
            token='token_14',
            expires_at=timezone.now() + timedelta(days=14),
            days_active=14
        )
        
        self.assertEqual(preview_14.days_active, 14)

        preview_14.delete()
        
        # Test with 30 days (default)
        preview_30 = AdCreativePreview.objects.create(
            link='https://example.com/preview30',
            ad_creative=self.ad_creative,
            token='token_30',
            expires_at=timezone.now() + timedelta(days=30),
            days_active=30
        )
        
        self.assertEqual(preview_30.days_active, 30)

        preview_30.delete()

        # Test default value
        preview_default = AdCreativePreview.objects.create(
            link='https://example.com/preview_default',
            ad_creative=self.ad_creative,
            token='token_default',
            expires_at=timezone.now() + timedelta(days=30)
        )
        
        self.assertEqual(preview_default.days_active, 30)  # Default value
    
    def test_preview_unique_constraint_per_ad_creative(self):
        """Test unique constraint for one preview per ad creative"""
        # Create first preview
        AdCreativePreview.objects.create(
            link='https://example.com/preview1',
            ad_creative=self.ad_creative,
            token='token_1',
            expires_at=timezone.now() + timedelta(days=30),
            days_active=30
        )
        
        # Try to create second preview for same ad creative
        with self.assertRaises(IntegrityError):
            AdCreativePreview.objects.create(
                link='https://example.com/preview2',
                ad_creative=self.ad_creative,
                token='token_2',
                expires_at=timezone.now() + timedelta(days=30),
                days_active=30
            )
    
    def test_preview_string_representation(self):
        """Test preview string representation"""
        preview = AdCreativePreview.objects.create(
            link='https://example.com/preview',
            ad_creative=self.ad_creative,
            token='token_123',
            expires_at=timezone.now() + timedelta(days=30),
            days_active=30
        )
        
        expected_str = f"Preview for {self.ad_creative.name} - Active"
        self.assertEqual(str(preview), expected_str)
        
        # Test with no ad_creative
        preview_no_creative = AdCreativePreview.objects.create(
            link='https://example.com/preview_no_creative',
            ad_creative=None,
            token='token_no_creative',
            expires_at=timezone.now() + timedelta(days=30),
            days_active=30
        )
        
        expected_str_no_creative = "Preview for Unknown - Active"
        self.assertEqual(str(preview_no_creative), expected_str_no_creative)


class ModelRelationshipsTest(TestCase):
    """Test model relationships and queries"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.ad_label = AdLabel.objects.create(
            id='label_123',
            name='Test Label'
        )
        
        self.ad_creative = AdCreative.objects.create(
            id='creative_123',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
        
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
    
    def test_ad_creative_ad_labels_relationship(self):
        """Test ad creative-ad labels relationship"""
        # Create multiple labels
        labels = []
        for i in range(3):
            label = AdLabel.objects.create(
                id=f'label_{i}',
                name=f'Test Label {i}'
            )
            labels.append(label)
        
        # Add labels to creative
        self.ad_creative.ad_labels.add(*labels)
        
        # Test relationship
        creative_labels = self.ad_creative.ad_labels.all()
        self.assertEqual(creative_labels.count(), 3)
        
        for label in labels:
            self.assertIn(label, creative_labels)
            self.assertIn(self.ad_creative, label.creatives.all())
    
    def test_ad_creative_object_story_spec_relationships(self):
        """Test ad creative object story spec relationships"""
        # Set object story spec data
        self.ad_creative.object_story_spec_instagram_user_id = 'instagram_123'
        self.ad_creative.object_story_spec_page_id = 'page_123'
        # Use .set() for ManyToMany fields
        self.ad_creative.object_story_spec_photo_data.set([self.photo_data])
        self.ad_creative.object_story_spec_text_data = self.text_data
        self.ad_creative.object_story_spec_video_data.set([self.video_data])
        self.ad_creative.object_story_spec_link_data = self.link_data
        self.ad_creative.object_story_spec_template_data = self.link_data
        self.ad_creative.object_story_spec_product_data = [{'product': 'test'}]
        self.ad_creative.save()
        
        # Test relationships
        self.assertEqual(self.ad_creative.object_story_spec_instagram_user_id, 'instagram_123')
        self.assertEqual(self.ad_creative.object_story_spec_page_id, 'page_123')
        self.assertIn(self.photo_data, self.ad_creative.object_story_spec_photo_data.all())
        self.assertEqual(self.ad_creative.object_story_spec_text_data, self.text_data)
        self.assertIn(self.video_data, self.ad_creative.object_story_spec_video_data.all())
        self.assertEqual(self.ad_creative.object_story_spec_link_data, self.link_data)
        self.assertEqual(self.ad_creative.object_story_spec_template_data, self.link_data)
        self.assertEqual(self.ad_creative.object_story_spec_product_data, [{'product': 'test'}])
        
        # Test reverse relationships
        self.assertIn(self.ad_creative, self.photo_data.photo_data_ad_creatives.all())
        self.assertIn(self.ad_creative, self.text_data.text_data_ad_creatives.all())
        self.assertIn(self.ad_creative, self.video_data.video_data_ad_creatives.all())
        self.assertIn(self.ad_creative, self.link_data.link_data_ad_creatives.all())
    
    def test_ad_creative_previews_relationship(self):
        """Test ad creative-previews relationship"""
        # Create separate ad creatives for each preview (unique constraint)
        previews = []
        for i in range(3):
            ad_creative = AdCreative.objects.create(
                id=f'preview_creative_{i}',
                actor=self.user,
                name=f'Preview Creative {i}',
                status=AdCreative.STATUS_ACTIVE
            )
            preview = AdCreativePreview.objects.create(
                link=f'https://example.com/preview{i}',
                ad_creative=ad_creative,
                token=f'preview_token_{i}',
                expires_at=timezone.now() + timedelta(hours=24)
            )
            previews.append(preview)
        
        # Test that each creative has one preview
        for i, preview in enumerate(previews):
            ad_creative = AdCreative.objects.get(id=f'preview_creative_{i}')
            creative_previews = ad_creative.owned_previews.all()
            self.assertEqual(creative_previews.count(), 1)
            self.assertIn(preview, creative_previews)
    
    def test_complex_relationships_query(self):
        """Test complex relationship queries"""
        # Create additional data
        for i in range(5):
            AdCreative.objects.create(
                id=f'creative_{i}',
                actor=self.user,
                name=f'Test Ad Creative {i}',
                status=AdCreative.STATUS_ACTIVE
            )
        
        # Create labels and associate with creatives
        for i in range(3):
            label = AdLabel.objects.create(
                id=f'label_{i}',
                name=f'Test Label {i}'
            )
            # Associate with some creatives
            creatives = AdCreative.objects.filter(id__in=[f'creative_{j}' for j in range(i, i+2)])
            for creative in creatives:
                creative.ad_labels.add(label)
        
        # Test complex query
        creatives_with_labels = AdCreative.objects.filter(
            ad_labels__isnull=False
        ).distinct()
        
        self.assertGreaterEqual(creatives_with_labels.count(), 1)
