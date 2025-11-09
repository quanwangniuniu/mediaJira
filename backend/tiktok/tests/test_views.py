from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from io import BytesIO
from PIL import Image
from ..models import TikTokCreative, AdGroup, AdDraft
import uuid

User = get_user_model()


class TikTokViewsTest(APITestCase):
    """Test cases for TikTok views."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def create_test_image(self, width=1200, height=628, format='JPEG'):
        """Create a test image file."""
        image = Image.new('RGB', (width, height), color='red')
        image_io = BytesIO()
        image.save(image_io, format=format)
        image_io.seek(0)
        return SimpleUploadedFile(
            'test.jpg',
            image_io.getvalue(),
            content_type='image/jpeg'
        )
    
    def create_test_video(self):
        """Create a test video file (mock)."""
        return SimpleUploadedFile(
            'test.mp4',
            b'fake video content',
            content_type='video/mp4'
        )
    
    def test_upload_image_ad_success(self):
        """Test successful image upload."""
        image_file = self.create_test_image()
        
        data = {
            'file': image_file,
            'name': 'Test Image',
            'original_filename': 'test.jpg'
        }
        
        response = self.client.post('/api/tiktok/file/image/ad/upload/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TikTokCreative.objects.count(), 1)
        
        creative = TikTokCreative.objects.first()
        self.assertEqual(creative.type, 'image')
        self.assertEqual(creative.name, 'Test Image')
        self.assertEqual(creative.uploaded_by, self.user)
    
    def test_upload_image_ad_missing_file(self):
        """Test image upload without file."""
        data = {
            'name': 'Test Image'
        }
        
        response = self.client.post('/api/tiktok/file/image/ad/upload/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('file is required', response.data['error'])
    
    def test_upload_image_ad_invalid_type(self):
        """Test image upload with invalid file type."""
        text_file = SimpleUploadedFile(
            'test.txt',
            b'text content',
            content_type='text/plain'
        )
        
        data = {
            'file': text_file,
            'name': 'Test Image'
        }
        
        response = self.client.post('/api/tiktok/file/image/ad/upload/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)
    
    def test_upload_image_ad_too_large(self):
        """Test image upload with file too large."""
        # Create a large image (simulate by creating a file with large size)
        large_file = SimpleUploadedFile(
            'large.jpg',
            b'x' * (11 * 1024 * 1024),  # 11MB
            content_type='image/jpeg'
        )
        
        data = {
            'file': large_file,
            'name': 'Large Image'
        }
        
        response = self.client.post('/api/tiktok/file/image/ad/upload/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    
    def test_upload_video_ad_success(self):
        """Test successful video upload with real MP4 file."""
        import os
        
        # Load the real MP4 file from test assets
        test_video_path = os.path.join(os.path.dirname(__file__), 'assets', 'test_video.mp4')
        
        with open(test_video_path, 'rb') as f:
            video_file = SimpleUploadedFile(
                'test_video.mp4',
                f.read(),
                content_type='video/mp4'
            )
        
        data = {
            'file': video_file,
            'name': 'Test Video',
            'original_filename': 'test_video.mp4'
        }
        
        response = self.client.post('/api/tiktok/file/video/ad/upload/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TikTokCreative.objects.count(), 1)
        
        creative = TikTokCreative.objects.first()
        self.assertEqual(creative.type, 'video')
        self.assertEqual(creative.name, 'Test Video')
        self.assertEqual(creative.uploaded_by, self.user)
        self.assertEqual(creative.original_filename, 'test_video.mp4')
        self.assertEqual(creative.mime_type, 'video/mp4')
    
    def test_upload_video_ad_missing_name(self):
        """Test video upload without name."""
        video_file = self.create_test_video()
        
        data = {
            'file': video_file
        }
        
        response = self.client.post('/api/tiktok/file/video/ad/upload/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name is required', response.data['error'])
    
    def test_material_list_success(self):
        """Test successful material list retrieval."""
        # Create test creatives
        TikTokCreative.objects.create(
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
        
        TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=2000,
            width=1920,
            height=1080,
            duration_sec=30.0,
            md5='video123',
            preview_url='https://example.com/video',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        response = self.client.get('/api/tiktok/material/list/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 2)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 20)
    
    def test_material_list_with_type_filter(self):
        """Test material list with type filter."""
        # Create test creatives
        TikTokCreative.objects.create(
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
        
        TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=2000,
            width=1920,
            height=1080,
            duration_sec=30.0,
            md5='video123',
            preview_url='https://example.com/video',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        # Filter by image type
        response = self.client.get('/api/tiktok/material/list/?type=image')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 1)
        self.assertEqual(response.data['items'][0]['type'], 'image')
    
    def test_material_list_pagination(self):
        """Test material list pagination."""
        # Create multiple creatives
        for i in range(25):
            TikTokCreative.objects.create(
                type='image',
                name=f'Test Image {i}',
                storage_path=f'tiktok/images/test{i}.jpg',
                original_filename=f'test{i}.jpg',
                mime_type='image/jpeg',
                size_bytes=1000,
                width=1200,
                height=628,
                md5=f'image{i}123',
                preview_url=f'https://example.com/image{i}',
                scan_status=TikTokCreative.INCOMING,
                uploaded_by=self.user
            )
        
        # Test first page
        response = self.client.get('/api/tiktok/material/list/?page=1&page_size=10')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['items']), 10)
        self.assertEqual(response.data['total'], 25)
        self.assertEqual(response.data['page'], 1)
        self.assertEqual(response.data['page_size'], 10)
    
    def test_material_info_success(self):
        """Test successful material info retrieval."""
        creative = TikTokCreative.objects.create(
            type='video',
            name='Test Video',
            storage_path='tiktok/videos/test.mp4',
            original_filename='test.mp4',
            mime_type='video/mp4',
            size_bytes=2000,
            width=1920,
            height=1080,
            duration_sec=30.0,
            md5='video123',
            preview_url='https://example.com/video',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=self.user
        )
        
        response = self.client.get(f'/api/tiktok/material/info/{creative.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], creative.id)
        self.assertEqual(response.data['name'], 'Test Video')
        self.assertEqual(response.data['type'], 'video')
    
    def test_material_info_not_found(self):
        """Test material info with non-existent ID."""
        response = self.client.get('/api/tiktok/material/info/999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Material not found', response.data['error'])
    
    def test_material_info_unauthorized(self):
        """Test material info for creative owned by different user."""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        
        creative = TikTokCreative.objects.create(
            type='video',
            name='Other User Video',
            storage_path='tiktok/videos/other.mp4',
            original_filename='other.mp4',
            mime_type='video/mp4',
            size_bytes=2000,
            width=1920,
            height=1080,
            duration_sec=30.0,
            md5='other123',
            preview_url='https://example.com/other',
            scan_status=TikTokCreative.INCOMING,
            uploaded_by=other_user
        )
        
        response = self.client.get(f'/api/tiktok/material/info/{creative.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_unauthorized_access(self):
        """Test access without authentication."""
        self.client.logout()

        response = self.client.get('/api/tiktok/material/list/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TikTokCreationAPITest(APITestCase):
    """Test cases for TikTok Creation APIs (AdGroup and AdDraft)."""

    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        self.client.force_authenticate(user=self.user)

    # ==================== AdGroup Save Tests ====================

    def test_ad_group_save_create_success(self):
        """Test creating a new ad group."""
        data = {
            'name': 'Test Ad Group'
        }

        response = self.client.post('/api/tiktok/creation/ad-group/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['msg'], 'success')
        self.assertIn('ad-group-id', response.data['data'])

        # Verify in database
        self.assertEqual(AdGroup.objects.count(), 1)
        ad_group = AdGroup.objects.first()
        self.assertEqual(ad_group.name, 'Test Ad Group')
        self.assertEqual(ad_group.created_by, self.user)
        self.assertIsNotNone(ad_group.gid)

    def test_ad_group_save_update_success(self):
        """Test updating an existing ad group."""
        # Create an ad group
        ad_group = AdGroup.objects.create(
            name='Original Name',
            created_by=self.user
        )

        data = {
            'id': str(ad_group.id),
            'name': 'Updated Name'
        }

        response = self.client.post('/api/tiktok/creation/ad-group/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')
        self.assertEqual(response.data['data']['ad-group-id'], str(ad_group.id))

        # Verify in database
        ad_group.refresh_from_db()
        self.assertEqual(ad_group.name, 'Updated Name')

    def test_ad_group_save_missing_name(self):
        """Test creating ad group without name."""
        data = {}

        response = self.client.post('/api/tiktok/creation/ad-group/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name is required', response.data['error'])

    def test_ad_group_save_update_unauthorized(self):
        """Test updating ad group owned by another user."""
        # Create ad group for other user
        ad_group = AdGroup.objects.create(
            name='Other User Group',
            created_by=self.other_user
        )

        data = {
            'id': str(ad_group.id),
            'name': 'Hacked Name'
        }

        response = self.client.post('/api/tiktok/creation/ad-group/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Ad group not found', response.data['error'])

    def test_ad_group_save_invalid_id_format(self):
        """Test updating with invalid UUID format."""
        data = {
            'id': 'invalid-uuid',
            'name': 'Updated Name'
        }

        response = self.client.post('/api/tiktok/creation/ad-group/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid id format', response.data['error'])

    # ==================== AdGroup Delete Tests ====================

    def test_ad_group_delete_success(self):
        """Test deleting ad groups successfully."""
        # Create ad groups
        group1 = AdGroup.objects.create(name='Group 1', created_by=self.user)
        group2 = AdGroup.objects.create(name='Group 2', created_by=self.user)

        data = {
            'ad_group_ids': [str(group1.id), str(group2.id)]
        }

        response = self.client.post('/api/tiktok/creation/ad-group/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')
        self.assertEqual(len(response.data['data']['deleted_ids']), 2)
        self.assertIn(str(group1.id), response.data['data']['deleted_ids'])
        self.assertIn(str(group2.id), response.data['data']['deleted_ids'])

        # Verify deletion
        self.assertEqual(AdGroup.objects.count(), 0)

    def test_ad_group_delete_partial_success(self):
        """Test deleting ad groups with some not found."""
        group1 = AdGroup.objects.create(name='Group 1', created_by=self.user)
        fake_id = str(uuid.uuid4())  # Generate a valid UUID that doesn't exist

        data = {
            'ad_group_ids': [str(group1.id), fake_id]
        }

        response = self.client.post('/api/tiktok/creation/ad-group/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['deleted_ids']), 1)
        self.assertIn('warnings', response.data)
        self.assertIn(fake_id, response.data['warnings']['not_found_ids'])

    def test_ad_group_delete_empty_list(self):
        """Test deleting with empty ad_group_ids list."""
        data = {
            'ad_group_ids': []
        }

        response = self.client.post('/api/tiktok/creation/ad-group/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ad_group_ids is required', response.data['error'])

    def test_ad_group_delete_unauthorized(self):
        """Test deleting ad group owned by another user."""
        group = AdGroup.objects.create(name='Other User Group', created_by=self.other_user)

        data = {
            'ad_group_ids': [str(group.id)]
        }

        response = self.client.post('/api/tiktok/creation/ad-group/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Verify not deleted
        self.assertEqual(AdGroup.objects.count(), 1)

    def test_ad_group_delete_too_many_ids(self):
        """Test deleting with more than 200 IDs."""
        data = {
            'ad_group_ids': [f'12345678-1234-1234-1234-12345678{i:04d}' for i in range(201)]
        }

        response = self.client.post('/api/tiktok/creation/ad-group/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Too many ad_group_ids', response.data['error'])

    def test_ad_group_delete_invalid_uuid(self):
        """Test deleting with invalid UUID format."""
        data = {
            'ad_group_ids': ['invalid-uuid']
        }

        response = self.client.post('/api/tiktok/creation/ad-group/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid UUID format', response.data['error'])

    # ==================== AdDraft Save Tests ====================

    def test_ad_draft_save_create_success(self):
        """Test creating new ad drafts."""
        ad_group = AdGroup.objects.create(name='Test Group', created_by=self.user)

        data = {
            'adgroup_id': str(ad_group.id),
            'form_data_list': [
                {
                    'name': 'Draft 1',
                    'ad_text': 'Test ad text 1',
                    'call_to_action': '',
                    'creative_type': 'SINGLE_VIDEO',
                    'assets': {'primaryCreative': {'id': 1, 'type': 'video'}}
                },
                {
                    'name': 'Draft 2',
                    'ad_text': 'Test ad text 2',
                    'creative_type': 'SINGLE_IMAGE',
                    'assets': {'primaryCreative': {'id': 2, 'type': 'image'}}
                }
            ]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')
        self.assertEqual(len(response.data['data']['ad-draft-id']), 2)

        # Verify in database
        self.assertEqual(AdDraft.objects.count(), 2)
        draft1 = AdDraft.objects.filter(name='Draft 1').first()
        self.assertIsNotNone(draft1)
        self.assertEqual(draft1.ad_group, ad_group)
        self.assertEqual(draft1.created_by, self.user)
        self.assertIsNotNone(draft1.aid)

    def test_ad_draft_save_update_success(self):
        """Test updating existing ad drafts."""
        ad_group = AdGroup.objects.create(name='Test Group', created_by=self.user)
        draft = AdDraft.objects.create(
            name='Original Name',
            ad_text='Original text',
            ad_group=ad_group,
            created_by=self.user
        )

        data = {
            'adgroup_id': str(ad_group.id),
            'form_data_list': [
                {
                    'id': str(draft.id),
                    'name': 'Updated Name',
                    'ad_text': 'Updated text',
                    'call_to_action': 'Sign up',
                    'creative_type': 'SINGLE_VIDEO'
                }
            ]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')

        # Verify update
        draft.refresh_from_db()
        self.assertEqual(draft.name, 'Updated Name')
        self.assertEqual(draft.ad_text, 'Updated text')

    def test_ad_draft_save_without_adgroup(self):
        """Test creating ad drafts without ad group."""
        data = {
            'form_data_list': [
                {
                    'name': 'Draft without group',
                    'ad_text': 'Test text',
                    'creative_type': 'SINGLE_VIDEO'
                }
            ]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(AdDraft.objects.count(), 1)
        draft = AdDraft.objects.first()
        self.assertIsNone(draft.ad_group)

    # ==================== Shareable Preview APIs ====================

    def test_share_ad_draft_success(self):
        draft = AdDraft.objects.create(name='Sharable', created_by=self.user)
        resp = self.client.post(f'/api/tiktok/ad-drafts/{draft.id}/share/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['msg'], 'success')
        slug = resp.data['data']['slug']
        self.assertTrue(slug and isinstance(slug, str))

    def test_share_ad_draft_404_for_other_user(self):
        other_user = self.other_user
        draft = AdDraft.objects.create(name='Other', created_by=other_user)
        resp = self.client.post(f'/api/tiktok/ad-drafts/{draft.id}/share/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_public_preview_success(self):
        # Create by calling share API to ensure serializer integration
        draft = AdDraft.objects.create(name='Sharable', created_by=self.user)
        resp = self.client.post(f'/api/tiktok/ad-drafts/{draft.id}/share/', {}, format='json')
        slug = resp.data['data']['slug']
        self.client.logout()
        g = self.client.get(f'/api/tiktok/public-previews/{slug}/')
        self.assertEqual(g.status_code, status.HTTP_200_OK)
        self.assertEqual(g.data['msg'], 'success')
        self.assertEqual(g.data['data']['slug'], slug)

    def test_get_public_preview_not_found(self):
        self.client.logout()
        g = self.client.get('/api/tiktok/public-previews/nope/')
        self.assertEqual(g.status_code, status.HTTP_404_NOT_FOUND)

    def test_ad_draft_save_empty_form_data_list(self):
        """Test saving with empty form_data_list."""
        data = {
            'form_data_list': []
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('form_data_list is required', response.data['error'])

    def test_ad_draft_save_invalid_adgroup(self):
        """Test saving with non-existent ad group."""
        fake_id = str(uuid.uuid4())  # Generate a valid UUID that doesn't exist

        data = {
            'adgroup_id': fake_id,
            'form_data_list': [
                {
                    'name': 'Draft',
                    'ad_text': 'Test'
                }
            ]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('Ad group not found', response.data['error'])

    def test_ad_draft_save_partial_success(self):
        """Test saving drafts with some validation errors."""
        ad_group = AdGroup.objects.create(name='Test Group', created_by=self.user)

        data = {
            'adgroup_id': str(ad_group.id),
            'form_data_list': [
                {
                    'name': 'Valid Draft',
                    'ad_text': 'Valid text'
                },
                {
                    'id': 'invalid-uuid',  # Invalid UUID
                    'name': 'Invalid Draft'
                }
            ]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['ad-draft-id']), 1)
        self.assertIn('warnings', response.data)

    def test_ad_draft_save_unauthorized_adgroup(self):
        """Test saving draft to ad group owned by another user."""
        other_group = AdGroup.objects.create(name='Other Group', created_by=self.other_user)

        data = {
            'adgroup_id': str(other_group.id),
            'form_data_list': [
                {
                    'name': 'Draft',
                    'ad_text': 'Test'
                }
            ]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/save/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    # ==================== AdDraft Delete Tests ====================

    def test_ad_draft_delete_success(self):
        """Test deleting ad drafts successfully."""
        ad_group = AdGroup.objects.create(name='Test Group', created_by=self.user)
        draft1 = AdDraft.objects.create(name='Draft 1', ad_group=ad_group, created_by=self.user)
        draft2 = AdDraft.objects.create(name='Draft 2', ad_group=ad_group, created_by=self.user)

        data = {
            'ad_draft_ids': [str(draft1.id), str(draft2.id)]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')
        self.assertEqual(len(response.data['data']['deleted_ids']), 2)

        # Verify deletion
        self.assertEqual(AdDraft.objects.count(), 0)

    def test_ad_draft_delete_partial_success(self):
        """Test deleting drafts with some not found."""
        draft1 = AdDraft.objects.create(name='Draft 1', created_by=self.user)
        fake_id = str(uuid.uuid4())  # Generate a valid UUID that doesn't exist

        data = {
            'ad_draft_ids': [str(draft1.id), fake_id]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['deleted_ids']), 1)
        self.assertIn('warnings', response.data)

    def test_ad_draft_delete_empty_list(self):
        """Test deleting with empty ad_draft_ids list."""
        data = {
            'ad_draft_ids': []
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('ad_draft_ids is required', response.data['error'])

    def test_ad_draft_delete_unauthorized(self):
        """Test deleting draft owned by another user."""
        draft = AdDraft.objects.create(name='Other Draft', created_by=self.other_user)

        data = {
            'ad_draft_ids': [str(draft.id)]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Verify not deleted
        self.assertEqual(AdDraft.objects.count(), 1)

    def test_ad_draft_delete_too_many_ids(self):
        """Test deleting with more than 200 IDs."""
        data = {
            'ad_draft_ids': [f'12345678-1234-1234-1234-12345678{i:04d}' for i in range(201)]
        }

        response = self.client.post('/api/tiktok/creation/ad-drafts/delete/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Too many ad_draft_ids', response.data['error'])

    # ==================== Brief Info List Tests ====================

    def test_brief_info_list_success(self):
        """Test getting brief info list successfully."""
        # Create ad groups and drafts
        group1 = AdGroup.objects.create(name='Group 1', created_by=self.user)
        group2 = AdGroup.objects.create(name='Group 2', created_by=self.user)

        AdDraft.objects.create(
            name='Draft 1',
            ad_group=group1,
            created_by=self.user,
            creative_type='SINGLE_VIDEO'
        )
        AdDraft.objects.create(
            name='Draft 2',
            ad_group=group1,
            created_by=self.user,
            creative_type='SINGLE_IMAGE'
        )
        AdDraft.objects.create(
            name='Draft 3',
            ad_group=group2,
            created_by=self.user,
            creative_type='SINGLE_VIDEO'
        )

        response = self.client.get('/api/tiktok/creation/sidebar/brief_info_list/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')
        self.assertEqual(len(response.data['data']['ad_group_brief_info_list']), 2)
        self.assertEqual(response.data['data']['total_groups'], 2)

        # Check group structure
        group_info = response.data['data']['ad_group_brief_info_list'][0]
        self.assertIn('gid', group_info)
        self.assertIn('name', group_info)
        self.assertIn('creative_brief_info_item_list', group_info)

    def test_brief_info_list_pagination(self):
        """Test brief info list with pagination."""
        # Create multiple ad groups
        for i in range(15):
            AdGroup.objects.create(name=f'Group {i}', created_by=self.user)

        response = self.client.get('/api/tiktok/creation/sidebar/brief_info_list/?limit_groups=10&offset_groups=0')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['ad_group_brief_info_list']), 10)
        self.assertEqual(response.data['data']['total_groups'], 15)
        self.assertEqual(response.data['data']['limit_groups'], 10)
        self.assertEqual(response.data['data']['offset_groups'], 0)

    def test_brief_info_list_empty(self):
        """Test brief info list when user has no ad groups."""
        response = self.client.get('/api/tiktok/creation/sidebar/brief_info_list/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')
        self.assertEqual(len(response.data['data']['ad_group_brief_info_list']), 0)
        self.assertEqual(response.data['data']['total_groups'], 0)

    def test_brief_info_list_only_own_groups(self):
        """Test that brief info list only returns user's own groups."""
        # Create groups for both users
        AdGroup.objects.create(name='My Group', created_by=self.user)
        AdGroup.objects.create(name='Other Group', created_by=self.other_user)

        response = self.client.get('/api/tiktok/creation/sidebar/brief_info_list/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['ad_group_brief_info_list']), 1)
        self.assertEqual(response.data['data']['ad_group_brief_info_list'][0]['name'], 'My Group')

    def test_brief_info_list_limit_items_per_group(self):
        """Test limiting items per group."""
        group = AdGroup.objects.create(name='Test Group', created_by=self.user)

        # Create 10 drafts
        for i in range(10):
            AdDraft.objects.create(
                name=f'Draft {i}',
                ad_group=group,
                created_by=self.user
            )

        response = self.client.get('/api/tiktok/creation/sidebar/brief_info_list/?limit_items_per_group=5')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        group_info = response.data['data']['ad_group_brief_info_list'][0]
        self.assertEqual(len(group_info['creative_brief_info_item_list']), 5)

    def test_brief_info_list_invalid_pagination_params(self):
        """Test brief info list with invalid pagination parameters."""
        # Invalid params should be clamped to reasonable defaults
        response = self.client.get('/api/tiktok/creation/sidebar/brief_info_list/?limit_groups=999&offset_groups=-10')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should clamp limit_groups to 200 and offset_groups to 0
        self.assertLessEqual(response.data['data']['limit_groups'], 200)
        self.assertEqual(response.data['data']['offset_groups'], 0)

    # ==================== Creation Detail Tests ====================

    def test_creation_detail_by_ad_draft_ids(self):
        """Test getting creation detail by ad_draft_ids."""
        group = AdGroup.objects.create(name='Test Group', created_by=self.user)
        draft1 = AdDraft.objects.create(
            name='Draft 1',
            ad_text='Text 1',
            ad_group=group,
            created_by=self.user,
            creative_type='SINGLE_VIDEO',
            assets={'primaryCreative': {'id': 1, 'type': 'video'}}
        )
        draft2 = AdDraft.objects.create(
            name='Draft 2',
            ad_text='Text 2',
            ad_group=group,
            created_by=self.user,
            creative_type='SINGLE_IMAGE'
        )

        data = {
            'ad_draft_ids': [str(draft1.id), str(draft2.id)]
        }

        response = self.client.post('/api/tiktok/creation/detail/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')
        self.assertEqual(len(response.data['data']['ad_drafts']), 2)

        # Check draft structure
        draft_data = response.data['data']['ad_drafts'][0]
        self.assertIn('id', draft_data)
        self.assertIn('ad_draft_id', draft_data)
        self.assertIn('name', draft_data)
        self.assertIn('ad_text', draft_data)
        self.assertIn('creative_type', draft_data)
        self.assertIn('assets', draft_data)

    def test_creation_detail_by_ad_group_ids(self):
        """Test getting creation detail by ad_group_ids."""
        group1 = AdGroup.objects.create(name='Group 1', created_by=self.user)
        group2 = AdGroup.objects.create(name='Group 2', created_by=self.user)

        AdDraft.objects.create(name='Draft 1', ad_group=group1, created_by=self.user)
        AdDraft.objects.create(name='Draft 2', ad_group=group1, created_by=self.user)
        AdDraft.objects.create(name='Draft 3', ad_group=group2, created_by=self.user)

        data = {
            'ad_group_ids': [str(group1.id), str(group2.id)]
        }

        response = self.client.post('/api/tiktok/creation/detail/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['msg'], 'success')
        self.assertEqual(len(response.data['data']['ad_groups']), 2)

        # Check group structure
        group_data = response.data['data']['ad_groups'][0]
        self.assertIn('id', group_data)
        self.assertIn('gid', group_data)
        self.assertIn('name', group_data)
        self.assertIn('ad_drafts', group_data)
        self.assertIsInstance(group_data['ad_drafts'], list)

    def test_creation_detail_mixed_ids(self):
        """Test getting creation detail with mixed ad_draft_ids and ad_group_ids."""
        group = AdGroup.objects.create(name='Test Group', created_by=self.user)
        draft = AdDraft.objects.create(name='Draft 1', ad_group=group, created_by=self.user)

        data = {
            'ad_draft_ids': [str(draft.id)],
            'ad_group_ids': [str(group.id)]
        }

        response = self.client.post('/api/tiktok/creation/detail/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['ad_drafts']), 1)
        self.assertEqual(len(response.data['data']['ad_groups']), 1)

    def test_creation_detail_legacy_aids(self):
        """Test getting creation detail using legacy aids parameter."""
        draft = AdDraft.objects.create(
            name='Draft',
            created_by=self.user
        )

        data = {
            'aids': [draft.aid]
        }

        response = self.client.post('/api/tiktok/creation/detail/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['ad_drafts']), 1)

    def test_creation_detail_no_valid_ids(self):
        """Test getting creation detail with no valid IDs."""
        data = {
            'ad_draft_ids': [],
            'ad_group_ids': []
        }

        response = self.client.post('/api/tiktok/creation/detail/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('No valid', response.data['error'])

    def test_creation_detail_invalid_uuids(self):
        """Test getting creation detail with invalid UUIDs (should skip and return 400 if none valid)."""
        data = {
            'ad_draft_ids': ['invalid-uuid-1', 'invalid-uuid-2']
        }

        response = self.client.post('/api/tiktok/creation/detail/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_creation_detail_only_own_data(self):
        """Test that creation detail only returns user's own data."""
        my_draft = AdDraft.objects.create(name='My Draft', created_by=self.user)
        other_draft = AdDraft.objects.create(name='Other Draft', created_by=self.other_user)

        data = {
            'ad_draft_ids': [str(my_draft.id), str(other_draft.id)]
        }

        response = self.client.post('/api/tiktok/creation/detail/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['ad_drafts']), 1)
        self.assertEqual(response.data['data']['ad_drafts'][0]['name'], 'My Draft')

    def test_creation_detail_normalize_assets(self):
        """Test that assets are normalized correctly."""
        # Test with dict assets (legacy format)
        draft1 = AdDraft.objects.create(
            name='Draft 1',
            created_by=self.user,
            assets={'primaryCreative': {'id': 1, 'type': 'video'}}
        )

        # Test with list assets
        draft2 = AdDraft.objects.create(
            name='Draft 2',
            created_by=self.user,
            assets=[{'id': 1, 'type': 'video'}]
        )

        data = {
            'ad_draft_ids': [str(draft1.id), str(draft2.id)]
        }

        response = self.client.post('/api/tiktok/creation/detail/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']['ad_drafts']), 2)

        # Both should have assets as list
        for draft_data in response.data['data']['ad_drafts']:
            self.assertIsInstance(draft_data['assets'], list)

    # ==================== Unauthorized Access Tests ====================

    def test_unauthorized_access_to_creation_apis(self):
        """Test access to creation APIs without authentication."""
        self.client.logout()

        endpoints = [
            ('/api/tiktok/creation/sidebar/brief_info_list/', 'get'),
            ('/api/tiktok/creation/detail/', 'post'),
            ('/api/tiktok/creation/ad-group/save/', 'post'),
            ('/api/tiktok/creation/ad-drafts/save/', 'post'),
            ('/api/tiktok/creation/ad-group/delete/', 'post'),
            ('/api/tiktok/creation/ad-drafts/delete/', 'post'),
        ]

        for endpoint, method in endpoints:
            if method == 'get':
                response = self.client.get(endpoint)
            else:
                response = self.client.post(endpoint, {}, format='json')

            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f"Expected 401 for {method.upper()} {endpoint}"
            )
