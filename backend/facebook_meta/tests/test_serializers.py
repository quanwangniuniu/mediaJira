"""
Test cases for facebook_meta serializers
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework import serializers

from facebook_meta.models import (
    AdLabel, AdCreative, AdCreativePhotoData,
    AdCreativeTextData, AdCreativeVideoData, AdCreativeLinkData, AdCreativePreview
)
from facebook_meta.serializers import (
    AdLabelSerializer, AdCreativePhotoDataSerializer,
    AdCreativeTextDataSerializer, AdCreativeVideoDataSerializer,
    AdCreativeLinkDataSerializer, AdCreativeObjectStorySpecSerializer,
    AdCreativeDetailSerializer, ErrorResponseSerializer,
    UpdateAndDeleteAdCreativeSerializer, CreateAdCreativeSerializer
)

User = get_user_model()

class AdLabelSerializerTest(TestCase):
    """Test cases for AdLabelSerializer"""
    
    def setUp(self):
        """Set up test data"""
    
    def test_serialize_ad_label(self):
        """Test serializing an ad label"""
        ad_label = AdLabel.objects.create(
            id='label_123',
            name='Test Label'
        )
        
        serializer = AdLabelSerializer(ad_label)
        data = serializer.data
        
        self.assertEqual(data['id'], 'label_123')
        self.assertEqual(data['name'], 'Test Label')
        self.assertIsNotNone(data['created_time'])
        self.assertIsNotNone(data['updated_time'])
    
    def test_deserialize_ad_label(self):
        """Test deserializing ad label data"""
        data = {
            'id': 'label_123',
            'name': 'Test Label'
        }
        
        serializer = AdLabelSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        ad_label = serializer.save()
        self.assertEqual(ad_label.id, 'label_123')
        self.assertEqual(ad_label.name, 'Test Label')


class AdCreativePhotoDataSerializerTest(TestCase):
    """Test cases for AdCreativePhotoDataSerializer"""
    
    def test_serialize_photo_data(self):
        """Test serializing photo data"""
        photo_data = AdCreativePhotoData.objects.create(
            caption='Test photo caption',
            image_hash='abc123',
            url='https://example.com/image.jpg',
            branded_content_shared_to_sponsor_status='ACTIVE',
            branded_content_sponsor_page_id='page_123',
            branded_content_sponser_relationship='SPONSOR',
            page_welcome_message='Welcome message'
        )
        
        serializer = AdCreativePhotoDataSerializer(photo_data)
        data = serializer.data
        
        self.assertEqual(data['caption'], 'Test photo caption')
        self.assertEqual(data['image_hash'], 'abc123')
        self.assertEqual(data['url'], 'https://example.com/image.jpg')
        self.assertEqual(data['branded_content_shared_to_sponsor_status'], 'ACTIVE')
        self.assertEqual(data['branded_content_sponsor_page_id'], 'page_123')
        self.assertEqual(data['branded_content_sponser_relationship'], 'SPONSOR')
        self.assertEqual(data['page_welcome_message'], 'Welcome message')
    
    def test_deserialize_photo_data(self):
        """Test deserializing photo data"""
        data = {
            'caption': 'Test photo caption',
            'image_hash': 'abc123',
            'url': 'https://example.com/image.jpg',
            'branded_content_shared_to_sponsor_status': 'ACTIVE',
            'branded_content_sponsor_page_id': 'page_123',
            'branded_content_sponser_relationship': 'SPONSOR',
            'page_welcome_message': 'Welcome message'
        }
        
        serializer = AdCreativePhotoDataSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        photo_data = serializer.save()
        self.assertEqual(photo_data.caption, 'Test photo caption')
        self.assertEqual(photo_data.image_hash, 'abc123')
        self.assertEqual(photo_data.url, 'https://example.com/image.jpg')


class AdCreativeTextDataSerializerTest(TestCase):
    """Test cases for AdCreativeTextDataSerializer"""
    
    def test_serialize_text_data(self):
        """Test serializing text data"""
        text_data = AdCreativeTextData.objects.create(
            message='Test text message'
        )
        
        serializer = AdCreativeTextDataSerializer(text_data)
        data = serializer.data
        
        self.assertEqual(data['message'], 'Test text message')
    
    def test_deserialize_text_data(self):
        """Test deserializing text data"""
        data = {
            'message': 'Test text message'
        }
        
        serializer = AdCreativeTextDataSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        text_data = serializer.save()
        self.assertEqual(text_data.message, 'Test text message')


class AdCreativeVideoDataSerializerTest(TestCase):
    """Test cases for AdCreativeVideoDataSerializer"""
    
    def test_serialize_video_data(self):
        """Test serializing video data"""
        video_data = AdCreativeVideoData.objects.create(
            title='Test Video Title',
            video_id='video_123',
            message='Test video message',
            additional_image_index=1,
            call_to_action={'type': 'LEARN_MORE'},
            caption_ids=[{'id': 'cap1'}, {'id': 'cap2'}],
            image_hash='abc123',
            image_url='https://example.com/thumb.jpg'
        )
        
        serializer = AdCreativeVideoDataSerializer(video_data)
        data = serializer.data
        
        self.assertEqual(data['title'], 'Test Video Title')
        self.assertEqual(data['video_id'], 'video_123')
        self.assertEqual(data['message'], 'Test video message')
        self.assertEqual(data['additional_image_index'], 1)
        self.assertEqual(data['call_to_action'], {'type': 'LEARN_MORE'})
        self.assertEqual(data['caption_ids'], [{'id': 'cap1'}, {'id': 'cap2'}])
        self.assertEqual(data['image_hash'], 'abc123')
        self.assertEqual(data['image_url'], 'https://example.com/thumb.jpg')
    
    def test_deserialize_video_data(self):
        """Test deserializing video data"""
        data = {
            'title': 'Test Video Title',
            'video_id': 'video_123',
            'message': 'Test video message',
            'additional_image_index': 1,
            'call_to_action': {'type': 'LEARN_MORE'},
            'caption_ids': [{'id': 'cap1'}, {'id': 'cap2'}],
            'image_hash': 'abc123',
            'image_url': 'https://example.com/thumb.jpg'
        }
        
        serializer = AdCreativeVideoDataSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        video_data = serializer.save()
        self.assertEqual(video_data.title, 'Test Video Title')
        self.assertEqual(video_data.video_id, 'video_123')
        self.assertEqual(video_data.message, 'Test video message')


class AdCreativeLinkDataSerializerTest(TestCase):
    """Test cases for AdCreativeLinkDataSerializer"""
    
    def test_serialize_link_data(self):
        """Test serializing link data"""
        link_data = AdCreativeLinkData.objects.create(
            name='Test Link',
            link='https://example.com',
            message='Test link message',
            attachment_style=AdCreativeLinkData.ATTACHMENT_STYLE_LINK,
            format_option=AdCreativeLinkData.FORMAT_OPTION_SINGLE_IMAGE,
            call_to_action={'type': 'LEARN_MORE'},
            child_attachments=[{'child1': 'data1'}],
            description='Test description',
            force_single_link=True,
            image_hash='abc123',
            multi_share_end_card=False,
            multi_share_optimized=True
        )
        
        serializer = AdCreativeLinkDataSerializer(link_data)
        data = serializer.data
        
        self.assertEqual(data['name'], 'Test Link')
        self.assertEqual(data['link'], 'https://example.com')
        self.assertEqual(data['message'], 'Test link message')
        self.assertEqual(data['attachment_style'], 'LINK')
        self.assertEqual(data['format_option'], 'single_image')
        self.assertEqual(data['call_to_action'], {'type': 'LEARN_MORE'})
        self.assertEqual(data['child_attachments'], [{'child1': 'data1'}])
        self.assertEqual(data['description'], 'Test description')
        self.assertTrue(data['force_single_link'])
        self.assertEqual(data['image_hash'], 'abc123')
        self.assertFalse(data['multi_share_end_card'])
        self.assertTrue(data['multi_share_optimized'])
    
    def test_deserialize_link_data(self):
        """Test deserializing link data"""
        data = {
            'name': 'Test Link',
            'link': 'https://example.com',
            'message': 'Test link message',
            'attachment_style': 'LINK',
            'format_option': 'single_image',
            'call_to_action': {'type': 'LEARN_MORE'},
            'child_attachments': [{'child1': 'data1'}],
            'description': 'Test description',
            'force_single_link': True,
            'image_hash': 'abc123',
            'multi_share_end_card': False,
            'multi_share_optimized': True
        }
        
        serializer = AdCreativeLinkDataSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        link_data = serializer.save()
        self.assertEqual(link_data.name, 'Test Link')
        self.assertEqual(link_data.link, 'https://example.com')
        self.assertEqual(link_data.message, 'Test link message')


class AdCreativeObjectStorySpecSerializerTest(TestCase):
    """Test cases for AdCreativeObjectStorySpecSerializer"""
    
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
            status=AdCreative.STATUS_ACTIVE,
            object_story_spec_instagram_user_id='instagram_123',
            object_story_spec_page_id='page_123',
            object_story_spec_product_data=[{'product': 'test'}]
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
        
        # Set object story spec data
        # Use .set() for ManyToMany fields
        self.ad_creative.object_story_spec_photo_data.set([self.photo_data])
        self.ad_creative.object_story_spec_text_data = self.text_data
        self.ad_creative.object_story_spec_video_data.set([self.video_data])
        self.ad_creative.object_story_spec_link_data = self.link_data
        self.ad_creative.object_story_spec_template_data = self.link_data
        self.ad_creative.save()
    
    def test_serialize_object_story_spec(self):
        """Test serializing object story spec"""
        serializer = AdCreativeObjectStorySpecSerializer(self.ad_creative)
        data = serializer.data
        
        self.assertEqual(data['instagram_user_id'], 'instagram_123')
        self.assertEqual(data['page_id'], 'page_123')
        self.assertEqual(data['product_data'], [{'product': 'test'}])
        
        # Check nested serializers (photo_data and video_data are now lists due to ManyToMany)
        self.assertIn('photo_data', data)
        self.assertIsInstance(data['photo_data'], list)
        self.assertEqual(len(data['photo_data']), 1)
        self.assertEqual(data['photo_data'][0]['caption'], 'Test photo caption')
        self.assertEqual(data['photo_data'][0]['image_hash'], 'abc123')
        
        self.assertIn('text_data', data)
        self.assertEqual(data['text_data']['message'], 'Test text message')
        
        self.assertIn('video_data', data)
        self.assertIsInstance(data['video_data'], list)
        self.assertEqual(len(data['video_data']), 1)
        self.assertEqual(data['video_data'][0]['title'], 'Test Video Title')
        self.assertEqual(data['video_data'][0]['video_id'], 'video_123')
        
        self.assertIn('link_data', data)
        self.assertEqual(data['link_data']['name'], 'Test Link')
        self.assertEqual(data['link_data']['link'], 'https://example.com')
        
        self.assertIn('template_data', data)
        self.assertEqual(data['template_data']['name'], 'Test Link')
        self.assertEqual(data['template_data']['link'], 'https://example.com')
    
    def test_serialize_object_story_spec_partial_data(self):
        """Test serializing object story spec with partial data"""
        # Create ad creative with only some object story spec data
        ad_creative_partial = AdCreative.objects.create(
            id='987654321',
            actor=self.user,
            name='Partial Ad Creative',
            status=AdCreative.STATUS_ACTIVE,
            object_story_spec_instagram_user_id='instagram_456'
        )
        
        serializer = AdCreativeObjectStorySpecSerializer(ad_creative_partial)
        data = serializer.data
        
        self.assertEqual(data['instagram_user_id'], 'instagram_456')
        self.assertNotIn('page_id', data)
        self.assertNotIn('photo_data', data)
        self.assertNotIn('text_data', data)
        self.assertNotIn('video_data', data)
        self.assertNotIn('link_data', data)
        self.assertNotIn('template_data', data)
        self.assertNotIn('product_data', data)


class AdCreativeDetailSerializerTest(TestCase):
    """Test cases for AdCreativeDetailSerializer"""
    
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
            id='123456789',
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE,
            body='Test body content',
            title='Test Title',
            call_to_action_type='LEARN_MORE',
            authorization_category=AdCreative.AUTH_NONE,
            object_type=AdCreative.OBJECT_TYPE_PAGE,
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
        
        # Add ad label
        self.ad_creative.ad_labels.add(self.ad_label)
        
        # Create object story spec data
        self.photo_data = AdCreativePhotoData.objects.create(
            caption='Test photo caption',
            image_hash='abc123',
            url='https://example.com/image.jpg'
        )
        
        self.text_data = AdCreativeTextData.objects.create(
            message='Test text message'
        )
        
        # Use .set() for ManyToMany fields
        self.ad_creative.object_story_spec_photo_data.set([self.photo_data])
        self.ad_creative.object_story_spec_text_data = self.text_data
        self.ad_creative.save()
    
    def test_serialize_ad_creative_detail(self):
        """Test serializing ad creative detail"""
        serializer = AdCreativeDetailSerializer(self.ad_creative)
        data = serializer.data
        
        # Check core fields
        self.assertEqual(data['id'], '123456789')
        self.assertEqual(data['actor_id'], str(self.user.id))
        self.assertEqual(data['name'], 'Test Ad Creative')
        self.assertEqual(data['status'], 'ACTIVE')
        
        # Check content fields
        self.assertEqual(data['body'], 'Test body content')
        self.assertEqual(data['title'], 'Test Title')
        
        # Check call to action
        self.assertEqual(data['call_to_action_type'], 'LEARN_MORE')
        self.assertEqual(data['call_to_action'], {'type': 'LEARN_MORE'})
        
        # Check authorization and categorization
        self.assertEqual(data['authorization_category'], 'NONE')
        
        # Check object information
        self.assertEqual(data['object_type'], 'PAGE')
        
        # Check JSON fields
        self.assertEqual(data['ad_disclaimer_spec'], {'disclaimer': 'test'})
        self.assertEqual(data['asset_feed_spec'], {'feed': 'test'})
        self.assertEqual(data['branded_content'], {'content': 'test'})
        self.assertEqual(data['contextual_multi_ads'], {'ads': 'test'})
        self.assertEqual(data['creative_sourcing_spec'], {'sourcing': 'test'})
        self.assertEqual(data['degrees_of_freedom_spec'], {'freedom': 'test'})
        self.assertEqual(data['facebook_branded_content'], {'fb_content': 'test'})
        self.assertEqual(data['image_crops'], {'crops': 'test'})
        self.assertEqual(data['media_sourcing_spec'], {'media': 'test'})
        self.assertEqual(data['portrait_customizations'], {'portrait': 'test'})
        self.assertEqual(data['product_data'], {'product': 'test'})
        self.assertEqual(data['recommender_settings'], {'recommender': 'test'})
        self.assertEqual(data['template_url_spec'], {'template': 'test'})
        self.assertEqual(data['platform_customizations'], {'platform': 'test'})
        self.assertEqual(data['interactive_components_spec'], {'components': 'test'})
        
        # Check nested objects
        self.assertIn('adlabels', data)
        self.assertEqual(len(data['adlabels']), 1)
        self.assertEqual(data['adlabels'][0]['id'], 'label_123')
        self.assertEqual(data['adlabels'][0]['name'], 'Test Label')
        
        self.assertIn('object_story_spec', data)
        self.assertIn('photo_data', data['object_story_spec'])
        # photo_data is now a list due to ManyToMany
        self.assertIsInstance(data['object_story_spec']['photo_data'], list)
        self.assertEqual(len(data['object_story_spec']['photo_data']), 1)
        self.assertEqual(data['object_story_spec']['photo_data'][0]['caption'], 'Test photo caption')
        self.assertIn('text_data', data['object_story_spec'])
        self.assertEqual(data['object_story_spec']['text_data']['message'], 'Test text message')
    
    def test_serialize_ad_creative_detail_cleaned_data(self):
        """Test that serializer removes None values"""
        # Create ad creative with minimal data
        minimal_creative = AdCreative.objects.create(
            id='987654321',
            actor=self.user,
            name='Minimal Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
        
        serializer = AdCreativeDetailSerializer(minimal_creative)
        data = serializer.data
        
        # Check that None values are removed
        self.assertNotIn('body', data)
        self.assertNotIn('title', data)
        self.assertNotIn('call_to_action_type', data)
        self.assertNotIn('authorization_category', data)
        self.assertNotIn('object_type', data)
        
        # Check that required fields are present
        self.assertEqual(data['id'], '987654321')
        self.assertEqual(data['name'], 'Minimal Ad Creative')
        self.assertEqual(data['status'], 'ACTIVE')


class UpdateAndDeleteAdCreativeSerializerTest(TestCase):
    """Test cases for UpdateAndDeleteAdCreativeSerializer"""
    
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
    
    def test_validate_adlabels_valid(self):
        """Test valid adlabels validation"""
        serializer = UpdateAndDeleteAdCreativeSerializer()
        
        # Valid adlabels
        valid_adlabels = ['label1', 'label2', 'label3']
        result = serializer.validate_ad_labels(valid_adlabels)
        self.assertEqual(result, valid_adlabels)
        
        # None adlabels
        result = serializer.validate_ad_labels(None)
        self.assertIsNone(result)
    
    def test_validate_adlabels_invalid(self):
        """Test invalid adlabels validation"""
        serializer = UpdateAndDeleteAdCreativeSerializer()
        
        # Non-list adlabels
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_ad_labels('not_a_list')
        self.assertIn('ad_labels must be an array', str(context.exception))
        
        # Non-string items
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_ad_labels(['label1', 123, 'label3'])
        self.assertIn('All ad_labels must be strings', str(context.exception))
        
        # Empty strings
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_ad_labels(['label1', '', 'label3'])
        self.assertIn('Ad_labels cannot be empty strings', str(context.exception))
        
        # Whitespace-only strings
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_ad_labels(['label1', '   ', 'label3'])
        self.assertIn('Ad_labels cannot be empty strings', str(context.exception))
    
    def test_validate_status_valid(self):
        """Test valid status validation"""
        serializer = UpdateAndDeleteAdCreativeSerializer()
        
        valid_statuses = ['ACTIVE', 'IN_PROCESS', 'WITH_ISSUES', 'DELETED']
        
        for status in valid_statuses:
            with self.subTest(status=status):
                result = serializer.validate_status(status)
                self.assertEqual(result, status)
        
        # None status
        result = serializer.validate_status(None)
        self.assertIsNone(result)
    
    def test_validate_status_invalid(self):
        """Test invalid status validation"""
        serializer = UpdateAndDeleteAdCreativeSerializer()
        
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_status('INVALID_STATUS')
        self.assertIn('Status must be one of', str(context.exception))
    
    def test_validate_name_valid(self):
        """Test valid name validation"""
        serializer = UpdateAndDeleteAdCreativeSerializer()
        
        # Valid names
        valid_names = ['Valid Name', 'A', 'A' * 100]
        
        for name in valid_names:
            with self.subTest(name=name):
                result = serializer.validate_name(name)
                self.assertEqual(result, name)
        
        # None name
        result = serializer.validate_name(None)
        self.assertIsNone(result)
    
    def test_validate_name_invalid(self):
        """Test invalid name validation"""
        serializer = UpdateAndDeleteAdCreativeSerializer()
        
        # Non-string name
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_name(123)
        self.assertIn('Name must be a string', str(context.exception))
        
        # Empty name
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_name('')
        self.assertIn('Name cannot be empty', str(context.exception))
        
        # Whitespace-only name
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_name('   ')
        self.assertIn('Name cannot be empty', str(context.exception))
        
        # Too long name
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_name('A' * 101)
        self.assertIn('Name cannot exceed 100 characters', str(context.exception))


class CreateAdCreativeSerializerTest(TestCase):
    """Test cases for CreateAdCreativeSerializer"""
    
    def test_validate_name_valid(self):
        """Test valid name validation"""
        serializer = CreateAdCreativeSerializer()
        
        # Valid names
        valid_names = ['Valid Name', 'A', 'A' * 100]
        
        for name in valid_names:
            with self.subTest(name=name):
                result = serializer.validate_name(name)
                self.assertEqual(result, name)
    
    def test_validate_name_invalid(self):
        """Test invalid name validation"""
        serializer = CreateAdCreativeSerializer()
        
        # Non-string name
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_name(123)
        self.assertIn('Name must be a string', str(context.exception))
        
        # Empty name
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_name('')
        self.assertIn('Name cannot be empty', str(context.exception))
        
        # Whitespace-only name
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_name('   ')
        self.assertIn('Name cannot be empty', str(context.exception))
        
        # Too long name
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_name('A' * 101)
        self.assertIn('Name cannot exceed 100 characters', str(context.exception))
    
    def test_validate_object_story_id_valid(self):
        """Test valid object_story_id validation"""
        serializer = CreateAdCreativeSerializer()
        
        # Valid object_story_id
        result = serializer.validate_object_story_id('123_456')
        self.assertEqual(result, '123_456')
        
        # None object_story_id
        result = serializer.validate_object_story_id(None)
        self.assertIsNone(result)
    
    def test_validate_object_story_id_invalid(self):
        """Test invalid object_story_id validation"""
        serializer = CreateAdCreativeSerializer()
        
        # Non-string object_story_id
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_object_story_id(123456)
        self.assertIn('object_story_id must be a string', str(context.exception))
        
        # Invalid format
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_object_story_id('123abc')
        self.assertIn('object_story_id must match pattern', str(context.exception))
        
        # Missing underscore
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_object_story_id('123456')
        self.assertIn('object_story_id must match pattern', str(context.exception))
    
    def test_validate_authorization_category_valid(self):
        """Test valid authorization_category validation"""
        serializer = CreateAdCreativeSerializer()
        
        valid_categories = ['NONE', 'POLITICAL', 'POLITICAL_WITH_DIGITALLY_CREATED_MEDIA']
        
        for category in valid_categories:
            with self.subTest(category=category):
                result = serializer.validate_authorization_category(category)
                self.assertEqual(result, category)
        
        # None authorization_category
        result = serializer.validate_authorization_category(None)
        self.assertIsNone(result)
    
    def test_validate_authorization_category_invalid(self):
        """Test invalid authorization_category validation"""
        serializer = CreateAdCreativeSerializer()
        
        with self.assertRaises(serializers.ValidationError) as context:
            serializer.validate_authorization_category('INVALID_CATEGORY')
        self.assertIn('authorization_category must be one of', str(context.exception))

class ErrorResponseSerializerTest(TestCase):
    """Test cases for ErrorResponseSerializer"""
    
    def test_serialize_error_response(self):
        """Test serializing error response"""
        data = {
            'error': 'Test error message',
            'code': 'TEST_ERROR'
        }
        
        serializer = ErrorResponseSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        validated_data = serializer.validated_data
        self.assertEqual(validated_data['error'], 'Test error message')
        self.assertEqual(validated_data['code'], 'TEST_ERROR')
    
    def test_serialize_error_response_missing_fields(self):
        """Test serializing error response with missing fields"""
        # Missing error field
        serializer = ErrorResponseSerializer(data={'code': 'TEST_ERROR'})
        with self.assertRaises(serializers.ValidationError):
            serializer.is_valid(raise_exception=True)
        
        # Missing code field
        serializer = ErrorResponseSerializer(data={'error': 'Test error message'})
        with self.assertRaises(serializers.ValidationError):
            serializer.is_valid(raise_exception=True)
