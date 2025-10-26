from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.core.files.uploadedfile import SimpleUploadedFile
from io import BytesIO
from PIL import Image
from ..models import TikTokCreative

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
