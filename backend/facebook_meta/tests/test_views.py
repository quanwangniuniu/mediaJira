"""
Test cases for facebook_meta API views
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from facebook_meta.models import (
    AdAccount, AdLabel, AdCreative, AdCreativePhotoData,
    AdCreativeTextData, AdCreativePreview
)
from facebook_meta.services import create_preview_from_creative_data
import json

User = get_user_model()


class GetAdCreativeViewTest(TestCase):
    """Test cases for get_ad_creative API view"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad_account = AdAccount.objects.create(
            id='123456789',
            name='Test Ad Account',
            status=AdAccount.AdAccountStatus.ACTIVE
        )
        
        self.ad_creative = AdCreative.objects.create(
            id='123456789',
            account=self.ad_account,
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE,
            body='Test body content',
            title='Test Title'
        )
    
    def test_get_ad_creative_success(self):
        """Test successful ad creative retrieval"""
        response = self.client.get('/facebook_meta/123456789/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], '123456789')
        self.assertEqual(response.data['name'], 'Test Ad Creative')
        self.assertEqual(response.data['status'], 'ACTIVE')
        self.assertEqual(response.data['body'], 'Test body content')
        self.assertEqual(response.data['title'], 'Test Title')
    
    def test_get_ad_creative_invalid_id_format(self):
        """Test ad creative retrieval with invalid ID format"""
        response = self.client.get('/facebook_meta/abc123/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('ad_creative_id must be a numeric string', response.data['error'])
        self.assertEqual(response.data['code'], 'INVALID_ID_FORMAT')
    
    def test_get_ad_creative_not_found(self):
        """Test ad creative retrieval when not found"""
        response = self.client.get('/facebook_meta/999999999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        self.assertIn('AdCreative not found', response.data['error'])
        self.assertEqual(response.data['code'], 'NOT_FOUND')
    
    def test_get_ad_creative_with_fields_filter(self):
        """Test ad creative retrieval with fields filter"""
        response = self.client.get('/facebook_meta/123456789/?fields=id,name,status')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertIn('id', response.data)
        self.assertIn('name', response.data)
        self.assertIn('status', response.data)
        self.assertNotIn('body', response.data)
        self.assertNotIn('title', response.data)
    
    def test_get_ad_creative_invalid_fields(self):
        """Test ad creative retrieval with invalid fields"""
        response = self.client.get('/facebook_meta/123456789/?fields=id,invalid_field,status')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('Invalid field', response.data['error'])
        self.assertEqual(response.data['code'], 'INVALID_FIELDS')
    
    def test_get_ad_creative_with_thumbnail_dimensions(self):
        """Test ad creative retrieval with thumbnail dimensions"""
        response = self.client.get('/facebook_meta/123456789/?thumbnail_width=100&thumbnail_height=200')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], '123456789')
    
    def test_get_ad_creative_invalid_thumbnail_dimensions(self):
        """Test ad creative retrieval with invalid thumbnail dimensions"""
        response = self.client.get('/facebook_meta/123456789/?thumbnail_width=0&thumbnail_height=200')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('thumbnail_width must be between 1 and 10000', response.data['error'])
        self.assertEqual(response.data['code'], 'INVALID_THUMBNAIL_DIMENSIONS')
    
    def test_get_ad_creative_authentication_required(self):
        """Test that authentication is required"""
        self.client.logout()
        
        response = self.client.get('/facebook_meta/123456789/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdCreativesByLabelsViewTest(TestCase):
    """Test cases for AdCreativesByLabelsView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad_account = AdAccount.objects.create(
            id='123456789',
            name='Test Ad Account',
            status=AdAccount.AdAccountStatus.ACTIVE
        )
        
        self.ad_label1 = AdLabel.objects.create(
            id='label_1',
            account=self.ad_account,
            name='Label 1'
        )
        
        self.ad_label2 = AdLabel.objects.create(
            id='label_2',
            account=self.ad_account,
            name='Label 2'
        )
        
        self.ad_creative1 = AdCreative.objects.create(
            id='creative_1',
            account=self.ad_account,
            actor=self.user,
            name='Creative 1',
            status=AdCreative.STATUS_ACTIVE
        )
        
        self.ad_creative2 = AdCreative.objects.create(
            id='creative_2',
            account=self.ad_account,
            actor=self.user,
            name='Creative 2',
            status=AdCreative.STATUS_ACTIVE
        )
        
        # Add labels to creatives
        self.ad_creative1.ad_labels.add(self.ad_label1)
        self.ad_creative2.ad_labels.add(self.ad_label2)
    
    def test_get_ad_creatives_by_labels_success(self):
        """Test successful ad creatives retrieval by labels"""
        response = self.client.get(f'/facebook_meta/act_123456789/adcreativesbylabels/?labels=["Label 1"]')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], 'creative_1')
        self.assertEqual(response.data['results'][0]['name'], 'Creative 1')
    
    def test_get_ad_creatives_by_multiple_labels(self):
        """Test ad creatives retrieval by multiple labels"""
        # Add both labels to creative1
        self.ad_creative1.ad_labels.add(self.ad_label2)
        
        response = self.client.get(f'/facebook_meta/act_123456789/adcreativesbylabels/?labels=["Label 1", "Label 2"]')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)  # Only creative1 has both labels
        self.assertEqual(response.data['results'][0]['id'], 'creative_1')
    
    def test_get_ad_creatives_by_labels_invalid_account_id(self):
        """Test ad creatives retrieval with invalid account ID"""
        response = self.client.get(f'/facebook_meta/act_abc123/adcreativesbylabels/?labels=["Label 1"]')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ad_account_id must be a numeric string', str(response.data))
    
    def test_get_ad_creatives_by_labels_missing_labels(self):
        """Test ad creatives retrieval without labels parameter"""
        response = self.client.get('/facebook_meta/act_123456789/adcreativesbylabels/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('labels parameter is required', str(response.data))
    
    def test_get_ad_creatives_by_labels_account_not_found(self):
        """Test ad creatives retrieval with non-existent account"""
        response = self.client.get(f'/facebook_meta/act_999999999/adcreativesbylabels/?labels=["Label 1"]')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('AdAccount not found', str(response.data))
    
    def test_get_ad_creatives_by_labels_with_fields_filter(self):
        """Test ad creatives retrieval with fields filter"""
        response = self.client.get(f'/facebook_meta/act_123456789/adcreativesbylabels/?labels=["Label 1"]&fields=id,name')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
        result = response.data['results'][0]
        self.assertEqual(len(result), 2)  # Only id and name
        self.assertIn('id', result)
        self.assertIn('name', result)
        self.assertNotIn('status', result)
    
    def test_get_ad_creatives_by_labels_authentication_required(self):
        """Test that authentication is required"""
        self.client.logout()
        
        response = self.client.get(f'/facebook_meta/act_123456789/adcreativesbylabels/?labels=["Label 1"]')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdCreativesByAccountViewTest(TestCase):
    """Test cases for AdCreativesByAccountView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad_account = AdAccount.objects.create(
            id='123456789',
            name='Test Ad Account',
            status=AdAccount.AdAccountStatus.ACTIVE
        )
        
        self.ad_creative1 = AdCreative.objects.create(
            id='creative_1',
            account=self.ad_account,
            actor=self.user,
            name='Creative 1',
            status=AdCreative.STATUS_ACTIVE
        )
        
        self.ad_creative2 = AdCreative.objects.create(
            id='creative_2',
            account=self.ad_account,
            actor=self.user,
            name='Creative 2',
            status=AdCreative.STATUS_ACTIVE
        )
    
    def test_get_ad_creatives_by_account_success(self):
        """Test successful ad creatives retrieval by account"""
        response = self.client.get('/facebook_meta/act_123456789/adcreatives/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 2)
        
        # Check that both creatives are returned
        creative_ids = [result['id'] for result in response.data['results']]
        self.assertIn('creative_1', creative_ids)
        self.assertIn('creative_2', creative_ids)
    
    def test_get_ad_creatives_by_account_invalid_account_id(self):
        """Test ad creatives retrieval with invalid account ID"""
        response = self.client.get('/facebook_meta/act_abc123/adcreatives/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ad_account_id must be a numeric string', str(response.data))
    
    def test_get_ad_creatives_by_account_not_found(self):
        """Test ad creatives retrieval with non-existent account"""
        response = self.client.get('/facebook_meta/act_999999999/adcreatives/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('AdAccount not found', str(response.data))
    
    def test_create_ad_creative_success(self):
        """Test successful ad creative creation"""
        data = {
            'name': 'New Ad Creative',
            'authorization_category': 'NONE'
        }
        
        response = self.client.post('/facebook_meta/act_123456789/adcreatives/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', response.data)
        self.assertIn('id', response.data['data'])
        
        # Verify the creative was created
        created_creative = AdCreative.objects.get(id=response.data['data']['id'])
        self.assertEqual(created_creative.name, 'New Ad Creative')
        self.assertEqual(created_creative.account, self.ad_account)
        self.assertEqual(created_creative.actor, self.user)
    
    def test_create_ad_creative_with_object_story_spec(self):
        """Test ad creative creation with object_story_spec"""
        data = {
            'name': 'New Ad Creative with Story',
            'object_story_spec': {
                'instagram_user_id': 'instagram_123',
                'page_id': 'page_123',
                'product_data': [{'product': 'test'}],
                'link_data': {
                    'name': 'Test Link',
                    'link': 'https://example.com',
                    'message': 'Test link message'
                },
                'photo_data': {
                    'caption': 'Test photo caption',
                    'image_hash': 'abc123',
                    'url': 'https://example.com/image.jpg'
                },
                'text_data': {
                    'message': 'Test text message'
                }
            }
        }
        
        response = self.client.post('/facebook_meta/act_123456789/adcreatives/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', response.data)
        self.assertIn('id', response.data['data'])
        
        # Verify the creative was created with object story spec
        created_creative = AdCreative.objects.get(id=response.data['data']['id'])
        self.assertEqual(created_creative.name, 'New Ad Creative with Story')
        self.assertEqual(created_creative.object_story_spec_instagram_user_id, 'instagram_123')
        self.assertEqual(created_creative.object_story_spec_page_id, 'page_123')
        self.assertEqual(created_creative.object_story_spec_product_data, [{'product': 'test'}])
        
        # Verify related objects were created
        self.assertIsNotNone(created_creative.object_story_spec_link_data)
        self.assertIsNotNone(created_creative.object_story_spec_photo_data)
        self.assertIsNotNone(created_creative.object_story_spec_text_data)
    
    def test_create_ad_creative_invalid_data(self):
        """Test ad creative creation with invalid data"""
        data = {
            'name': '',  # Empty name
            'authorization_category': 'INVALID_CATEGORY'
        }
        
        response = self.client.post('/facebook_meta/act_123456789/adcreatives/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['code'], 'INVALID_DATA')
    
    def test_create_ad_creative_missing_required_fields(self):
        """Test ad creative creation with missing required fields"""
        data = {
            'authorization_category': 'NONE'
            # Missing required 'name' field
        }
        
        response = self.client.post('/facebook_meta/act_123456789/adcreatives/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['code'], 'INVALID_DATA')
    
    def test_create_ad_creative_authentication_required(self):
        """Test that authentication is required for creation"""
        self.client.logout()
        
        data = {
            'name': 'New Ad Creative',
            'authorization_category': 'NONE'
        }
        
        response = self.client.post('/facebook_meta/act_123456789/adcreatives/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdCreativeUpdateViewTest(TestCase):
    """Test cases for AdCreativeUpdateView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad_account = AdAccount.objects.create(
            id='123456789',
            name='Test Ad Account',
            status=AdAccount.AdAccountStatus.ACTIVE
        )
        
        self.ad_creative = AdCreative.objects.create(
            id='123456789',
            account=self.ad_account,
            actor=self.user,
            name='Original Name',
            status=AdCreative.STATUS_ACTIVE
        )
    
    def test_update_ad_creative_success(self):
        """Test successful ad creative update"""
        data = {
            'name': 'Updated Name',
            'status': 'IN_PROCESS'
        }
        
        response = self.client.patch('/facebook_meta/123456789/update/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        
        # Verify the creative was updated
        self.ad_creative.refresh_from_db()
        self.assertEqual(self.ad_creative.name, 'Updated Name')
        self.assertEqual(self.ad_creative.status, 'IN_PROCESS')
    
    def test_update_ad_creative_invalid_id_format(self):
        """Test ad creative update with invalid ID format"""
        data = {
            'name': 'Updated Name'
        }
        
        response = self.client.patch('/facebook_meta/abc123/update/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ad_creative_id must be a numeric string', str(response.data))
    
    def test_update_ad_creative_not_found(self):
        """Test ad creative update when not found"""
        data = {
            'name': 'Updated Name'
        }
        
        response = self.client.patch('/facebook_meta/999999999/update/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        self.assertIn('AdCreative not found', response.data['error'])
        self.assertEqual(response.data['code'], 'NOT_FOUND')
    
    def test_update_ad_creative_invalid_data(self):
        """Test ad creative update with invalid data"""
        data = {
            'name': '',  # Empty name
            'status': 'INVALID_STATUS'
        }
        
        response = self.client.patch('/facebook_meta/123456789/update/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['code'], 'INVALID_DATA')
    
    def test_update_ad_creative_with_adlabels(self):
        """Test ad creative update with ad labels"""
        # Create ad labels
        ad_label1 = AdLabel.objects.create(
            id='label_1',
            account=self.ad_account,
            name='Label 1'
        )
        
        ad_label2 = AdLabel.objects.create(
            id='label_2',
            account=self.ad_account,
            name='Label 2'
        )
        
        data = {
            'name': 'Updated Name',
            'adlabels': ['Label 1', 'Label 2']
        }
        
        response = self.client.patch('/facebook_meta/123456789/update/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        
        # Verify the creative was updated
        self.ad_creative.refresh_from_db()
        self.assertEqual(self.ad_creative.name, 'Updated Name')
        
        # Verify labels were added
        labels = self.ad_creative.ad_labels.all()
        self.assertEqual(labels.count(), 2)
        label_names = [label.name for label in labels]
        self.assertIn('Label 1', label_names)
        self.assertIn('Label 2', label_names)
    
    def test_update_ad_creative_invalid_adlabels(self):
        """Test ad creative update with invalid ad labels"""
        data = {
            'name': 'Updated Name',
            'adlabels': ['Label 1', '', 'Label 2']  # Empty string in labels
        }
        
        response = self.client.patch('/facebook_meta/123456789/update/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertEqual(response.data['code'], 'INVALID_DATA')
    
    def test_update_ad_creative_authentication_required(self):
        """Test that authentication is required for update"""
        self.client.logout()
        
        data = {
            'name': 'Updated Name'
        }
        
        response = self.client.patch('/facebook_meta/123456789/update/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AdCreativeDeleteViewTest(TestCase):
    """Test cases for AdCreativeDeleteView"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad_account = AdAccount.objects.create(
            id='123456789',
            name='Test Ad Account',
            status=AdAccount.AdAccountStatus.ACTIVE
        )
        
        self.ad_creative = AdCreative.objects.create(
            id='123456789',
            account=self.ad_account,
            actor=self.user,
            name='Test Ad Creative',
            status=AdCreative.STATUS_ACTIVE
        )
    
    def test_delete_ad_creative_success(self):
        """Test successful ad creative deletion"""
        response = self.client.delete('/facebook_meta/123456789/delete/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        
        # Verify the creative was deleted
        self.assertFalse(AdCreative.objects.filter(id='123456789').exists())
    
    def test_delete_ad_creative_invalid_id_format(self):
        """Test ad creative deletion with invalid ID format"""
        response = self.client.delete('/facebook_meta/abc123/delete/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ad_creative_id must be a numeric string', str(response.data))
    
    def test_delete_ad_creative_not_found(self):
        """Test ad creative deletion when not found"""
        response = self.client.delete('/facebook_meta/999999999/delete/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
        self.assertIn('AdCreative not found', response.data['error'])
        self.assertEqual(response.data['code'], 'NOT_FOUND')
    
    def test_delete_ad_creative_authentication_required(self):
        """Test that authentication is required for deletion"""
        self.client.logout()
        
        response = self.client.delete('/facebook_meta/123456789/delete/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_delete_ad_creative_with_related_objects(self):
        """Test ad creative deletion with related objects"""
        # Create related objects
        photo_data = AdCreativePhotoData.objects.create(
            caption='Test photo caption',
            image_hash='abc123',
            url='https://example.com/image.jpg'
        )
        
        text_data = AdCreativeTextData.objects.create(
            message='Test text message'
        )
        
        # Set object story spec data
        self.ad_creative.object_story_spec_photo_data = photo_data
        self.ad_creative.object_story_spec_text_data = text_data
        self.ad_creative.save()
        
        # Delete the creative
        response = self.client.delete('/facebook_meta/123456789/delete/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['success'], True)
        
        # Verify the creative was deleted
        self.assertFalse(AdCreative.objects.filter(id='123456789').exists())
        
        # Verify related objects still exist (SET_NULL behavior)
        self.assertTrue(AdCreativePhotoData.objects.filter(id=photo_data.id).exists())
        self.assertTrue(AdCreativeTextData.objects.filter(id=text_data.id).exists())


class ViewIntegrationTest(TestCase):
    """Test integration between different views"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        self.ad_account = AdAccount.objects.create(
            id='123456789',
            name='Test Ad Account',
            status=AdAccount.AdAccountStatus.ACTIVE
        )
    
    def test_create_read_update_delete_flow(self):
        """Test complete CRUD flow"""
        # 1. Create ad creative
        create_data = {
            'name': 'Integration Test Creative',
            'authorization_category': 'NONE'
        }
        
        create_response = self.client.post('/facebook_meta/act_123456789/adcreatives/', create_data, format='json')
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        creative_id = create_response.data['data']['id']
        
        # 2. Read ad creative
        read_response = self.client.get(f'/facebook_meta/{creative_id}/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.data['name'], 'Integration Test Creative')
        
        # 3. Update ad creative
        update_data = {
            'name': 'Updated Integration Test Creative',
            'status': 'IN_PROCESS'
        }
        
        update_response = self.client.patch(f'/facebook_meta/{creative_id}/update/', update_data, format='json')
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['success'], True)
        
        # 4. Verify update
        read_response = self.client.get(f'/facebook_meta/{creative_id}/')
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.data['name'], 'Updated Integration Test Creative')
        self.assertEqual(read_response.data['status'], 'IN_PROCESS')
        
        # 5. Delete ad creative
        delete_response = self.client.delete(f'/facebook_meta/{creative_id}/delete/')
        self.assertEqual(delete_response.status_code, status.HTTP_200_OK)
        self.assertEqual(delete_response.data['success'], True)
        
        # 6. Verify deletion
        read_response = self.client.get(f'/facebook_meta/{creative_id}/')
        print(read_response.data)
        self.assertEqual(read_response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_list_and_filter_flow(self):
        """Test list and filter flow"""
        # Create multiple creatives
        for i in range(3):
            AdCreative.objects.create(
                id=f'creative_{i}',
                account=self.ad_account,
                actor=self.user,
                name=f'Creative {i}',
                status=AdCreative.STATUS_ACTIVE
            )
        
        # Create labels
        label1 = AdLabel.objects.create(
            id='label_1',
            account=self.ad_account,
            name='Label 1'
        )
        
        label2 = AdLabel.objects.create(
            id='label_2',
            account=self.ad_account,
            name='Label 2'
        )
        
        # Add labels to creatives
        creative1 = AdCreative.objects.get(id='creative_1')
        creative2 = AdCreative.objects.get(id='creative_2')
        creative1.ad_labels.add(label1)  # creative_1 has Label 1
        creative2.ad_labels.add(label2)  # creative_2 has Label 2
        creative2.ad_labels.add(label1)  # creative_2 also has Label 1
        
        # 1. List all creatives by account
        list_response = self.client.get('/facebook_meta/act_123456789/adcreatives/')
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data['results']), 3)
        
        # 2. Filter by labels
        filter_response = self.client.get(f'/facebook_meta/act_123456789/adcreativesbylabels/?labels=["Label 1"]')
        self.assertEqual(filter_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_response.data['results']), 2)  # creative_1 and creative_2 both have Label 1
        self.assertIn(filter_response.data['results'][0]['id'], ['creative_1', 'creative_2'])
        
        # 3. Filter by multiple labels (should find only creative_2 which has both labels)
        filter_response = self.client.get(f'/facebook_meta/act_123456789/adcreativesbylabels/?labels=["Label 1", "Label 2"]')
        self.assertEqual(filter_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(filter_response.data['results']), 1)
        self.assertEqual(filter_response.data['results'][0]['id'], 'creative_2')
        
        # 4. Test field filtering
        field_filter_response = self.client.get('/facebook_meta/act_123456789/adcreatives/?fields=id,name')
        self.assertEqual(field_filter_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(field_filter_response.data['results']), 3)
        
        for result in field_filter_response.data['results']:
            self.assertEqual(len(result), 2)  # Only id and name
            self.assertIn('id', result)
            self.assertIn('name', result)
            self.assertNotIn('status', result)
    
    def test_error_handling_flow(self):
        """Test error handling across different views"""
        # 1. Test invalid ID format across views
        invalid_id_views = [
            '/facebook_meta/abc123/',
            '/facebook_meta/act_abc123/adcreatives/',
            '/facebook_meta/act_abc123/adcreativesbylabels/?labels=test',
            '/facebook_meta/abc123/update/',
            '/facebook_meta/abc123/delete/'
        ]
        
        for view_url in invalid_id_views:
            with self.subTest(view_url=view_url):
                if 'update' in view_url:
                    response = self.client.patch(view_url, {'name': 'test'}, format='json')
                elif 'delete' in view_url:
                    response = self.client.delete(view_url)
                else:
                    response = self.client.get(view_url)
                
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # 2. Test non-existent resources
        non_existent_views = [
            '/facebook_meta/999999999/',
            '/facebook_meta/act_999999999/adcreatives/',
            '/facebook_meta/act_999999999/adcreativesbylabels/?labels=test',
            '/facebook_meta/999999999/update/',
            '/facebook_meta/999999999/delete/'
        ]
        
        for view_url in non_existent_views:
            with self.subTest(view_url=view_url):
                if 'update' in view_url:
                    response = self.client.patch(view_url, {'name': 'test'}, format='json')
                elif 'delete' in view_url:
                    response = self.client.delete(view_url)
                else:
                    response = self.client.get(view_url)
                
                self.assertIn(response.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_400_BAD_REQUEST])
        
        # 3. Test authentication required
        self.client.logout()
        
        auth_required_views = [
            '/facebook_meta/123456789/',
            '/facebook_meta/act_123456789/adcreatives/',
            '/facebook_meta/act_123456789/adcreativesbylabels/?labels=test',
            '/facebook_meta/123456789/update/',
            '/facebook_meta/123456789/delete/'
        ]
        
        for view_url in auth_required_views:
            with self.subTest(view_url=view_url):
                if 'update' in view_url:
                    response = self.client.patch(view_url, {'name': 'test'}, format='json')
                elif 'delete' in view_url:
                    response = self.client.delete(view_url)
                else:
                    response = self.client.get(view_url)
                
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PreviewViewsTest(TestCase):
    """Additional coverage for preview-related endpoints"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='previewuser',
            email='preview@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.ad_account = AdAccount.objects.create(
            id='987654321',
            name='Preview Ad Account',
            status=AdAccount.AdAccountStatus.ACTIVE
        )
        self.ad_creative = AdCreative.objects.create(
            id='987654321',
            account=self.ad_account,
            actor=self.user,
            name='Preview Creative',
            status=AdCreative.STATUS_ACTIVE
        )

    def test_get_ad_creative_previews_success(self):
        url = f'/facebook_meta/{self.ad_creative.id}/previews/?ad_format=DESKTOP_FEED_STANDARD&width=300&height=250'
        r = self.client.get(url)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('results', r.data)
        self.assertIn('body', r.data['results'][0])
        self.assertIn('token', r.data['results'][0]['body'])

    def test_get_ad_creative_previews_missing_ad_format(self):
        r = self.client.get(f'/facebook_meta/{self.ad_creative.id}/previews/')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'MISSING_AD_FORMAT')

    def test_get_ad_creative_previews_not_found(self):
        r = self.client.get('/facebook_meta/999999999/previews/?ad_format=DESKTOP_FEED_STANDARD')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(r.data.get('code'), 'NOT_FOUND')

    def test_generate_previews_success(self):
        params = {
            'ad_format': 'MOBILE_FEED_STANDARD',
            'creative': json.dumps({'name': 'Tmp', 'body': 'B'})
        }
        r = self.client.get('/facebook_meta/generatepreviews/', params)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('results', r.data)
        self.assertIn('token', r.data['results'][0]['body'])

    def test_generate_previews_missing_params(self):
        r = self.client.get('/facebook_meta/generatepreviews/?creative={}')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        r = self.client.get('/facebook_meta/generatepreviews/?ad_format=MOBILE_FEED_STANDARD')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generate_previews_invalid_creative_json(self):
        r = self.client.get('/facebook_meta/generatepreviews/?ad_format=MOBILE_FEED_STANDARD&creative=%7Binvalid_json%7D')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'INVALID_CREATIVE_FORMAT')

    def test_generate_previews_by_account_success(self):
        params = {
            'ad_format': 'MOBILE_FEED_STANDARD',
            'creative': json.dumps({'name': 'Tmp2', 'body': 'B2'})
        }
        r = self.client.get(f'/facebook_meta/act_{self.ad_account.id}/generatepreviews/', params)
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertIn('token', r.data['results'][0]['body'])

    def test_generate_previews_by_account_invalid_account_id(self):
        r = self.client.get('/facebook_meta/act_abc123/generatepreviews/?ad_format=MOBILE_FEED_STANDARD&creative={}')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generate_previews_by_account_missing_params(self):
        r = self.client.get(f'/facebook_meta/act_{self.ad_account.id}/generatepreviews/?creative={{}}')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'MISSING_AD_FORMAT')
        r = self.client.get(f'/facebook_meta/act_{self.ad_account.id}/generatepreviews/?ad_format=MOBILE_FEED_STANDARD')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'MISSING_CREATIVE')

    def test_get_preview_json_spec_paths(self):
        # not found
        r = self.client.get('/facebook_meta/preview/nonexistent-token/')
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(r.data.get('code'), 'TOKEN_NOT_FOUND')

        # expired
        expired = AdCreativePreview.objects.create(
            ad_creative_id=None,
            token='tok-exp-preview',
            json_spec={'ok': False},
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        r = self.client.get('/facebook_meta/preview/tok-exp-preview/')
        self.assertEqual(r.status_code, status.HTTP_410_GONE)
        self.assertEqual(r.data.get('code'), 'TOKEN_EXPIRED')

        # valid
        valid = AdCreativePreview.objects.create(
            ad_creative_id=None,
            token='tok-valid-preview',
            json_spec={'ok': True},
            expires_at=timezone.now() + timedelta(hours=1),
        )
        r = self.client.get('/facebook_meta/preview/tok-valid-preview/')
        self.assertEqual(r.status_code, status.HTTP_200_OK)
        self.assertEqual(r.data, {'ok': True})


class ViewsEdgeCasesTest(TestCase):
    """Cover edge branches and error codes in views"""

    def setUp(self):
        self.user = User.objects.create_user('edge@example.com', 'password')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.account = AdAccount.objects.create(id='555555555', name='EdgeAcc', status=AdAccount.AdAccountStatus.ACTIVE)
        self.creative = AdCreative.objects.create(
            id='555555555', account=self.account, actor=self.user, name='Edge', status=AdCreative.STATUS_ACTIVE
        )

    def test_get_ad_creative_invalid_thumbnail_types(self):
        r = self.client.get(f'/facebook_meta/{self.creative.id}/?thumbnail_width=abc')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'INVALID_THUMBNAIL_WIDTH')
        r = self.client.get(f'/facebook_meta/{self.creative.id}/?thumbnail_height=abc')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'INVALID_THUMBNAIL_HEIGHT')

    def test_get_ad_creatives_by_labels_non_list_json(self):
        r = self.client.get(f'/facebook_meta/act_{self.account.id}/adcreativesbylabels/?labels="not-a-list"')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)

    def test_account_list_fields_invalid(self):
        r = self.client.get(f'/facebook_meta/act_{self.account.id}/adcreatives/?fields=id,invalid')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'INVALID_FIELDS')

    def test_update_invalid_payload(self):
        r = self.client.patch(f'/facebook_meta/{self.creative.id}/update/', {'status': 'INVALID'}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'INVALID_DATA')

    def test_create_invalid_payload(self):
        r = self.client.post(f'/facebook_meta/act_{self.account.id}/adcreatives/', {'name': ''}, format='json')
        self.assertEqual(r.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(r.data.get('code'), 'INVALID_DATA')