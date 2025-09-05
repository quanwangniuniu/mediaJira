"""
Integration tests for file type detection and MIME type handling
Tests different file types and MIME type detection logic
"""

import os
import tempfile
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from metric_upload.models import MetricFile

User = get_user_model()


@override_settings(
    CELERY_TASK_ALWAYS_EAGER=True,
    FILE_STORAGE_DIR=tempfile.mkdtemp()
)
class FileTypesAndMimeTest(TestCase):
    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            email='test_file_types@example.com',
            username='testfiletypes',
            password='testpass123'
        )
        self.user.is_verified = True
        self.user.save()
        
        # URLs
        self.login_url = reverse('login')
        self.upload_url = reverse('metric_upload:file-upload')
        
        # Login and get token
        login_data = {
            'email': 'test_file_types@example.com',
            'password': 'testpass123'
        }
        login_response = self.client.post(self.login_url, login_data)
        self.token = login_response.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_upload_text_file_mime_detection(self):
        """Test MIME type detection for text files"""
        test_cases = [
            ('test.txt', b'This is a text file', 'text/plain'),
            ('test.md', b'# Markdown content', 'text/markdown'),
            ('test.html', b'<html><body>Hello</body></html>', 'text/html'),
            ('test.css', b'body { color: red; }', 'text/css'),
            ('test.js', b'console.log("Hello");', 'application/javascript'),
        ]
        
        for filename, content, expected_mime in test_cases:
            with self.subTest(filename=filename):
                test_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type=expected_mime
                )
                
                upload_data = {'file': test_file}
                upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
                
                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                
                file_data = upload_response.data
                self.assertEqual(file_data['mime_type'], expected_mime)
                self.assertEqual(file_data['original_filename'], filename)
                self.assertEqual(file_data['size'], len(content))
                
    
    def test_upload_image_file_mime_detection(self):
        """Test MIME type detection for image files"""
        # Create minimal valid image headers
        jpeg_header = b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00'
        png_header = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        gif_header = b'GIF87a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01'
        
        test_cases = [
            ('test.jpg', jpeg_header, 'image/jpeg'),
            ('test.jpeg', jpeg_header, 'image/jpeg'),
            ('test.png', png_header, 'image/png'),
            ('test.gif', gif_header, 'image/gif'),
        ]
        
        for filename, content, expected_mime in test_cases:
            with self.subTest(filename=filename):
                test_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type=expected_mime
                )
                
                upload_data = {'file': test_file}
                upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
                
                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                
                file_data = upload_response.data
                self.assertEqual(file_data['mime_type'], expected_mime)
                self.assertEqual(file_data['original_filename'], filename)
                
    
    def test_upload_document_file_mime_detection(self):
        """Test MIME type detection for document files"""
        # Create minimal document content
        pdf_content = b'%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj'
        json_content = b'{"name": "test", "value": 123}'
        xml_content = b'<?xml version="1.0"?><root><item>test</item></root>'
        
        test_cases = [
            ('test.pdf', pdf_content, 'application/pdf'),
            ('test.json', json_content, 'application/json'),
            ('test.xml', xml_content, 'application/xml'),
            ('test.csv', b'name,age\nJohn,25\nJane,30', 'text/csv'),
        ]
        
        for filename, content, expected_mime in test_cases:
            with self.subTest(filename=filename):
                test_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type=expected_mime
                )
                
                upload_data = {'file': test_file}
                upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
                
                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                
                file_data = upload_response.data
                self.assertEqual(file_data['mime_type'], expected_mime)
                self.assertEqual(file_data['original_filename'], filename)
                
    
    def test_upload_unknown_file_type_default_mime(self):
        """Test default MIME type for unknown file extensions"""
        test_cases = [
            ('test.xyz', b'Unknown file type content'),
            ('test.unknown', b'Another unknown type'),
            ('test.custom', b'Custom extension content'),
        ]
        
        for filename, content in test_cases:
            with self.subTest(filename=filename):
                # Don't provide content_type, let the system detect it
                test_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type=None
                )
                
                upload_data = {'file': test_file}
                upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
                
                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                
                file_data = upload_response.data
                # Should default to application/octet-stream for unknown types
                self.assertEqual(file_data['mime_type'], 'application/octet-stream')
                self.assertEqual(file_data['original_filename'], filename)
                
    
    def test_upload_file_without_extension(self):
        """Test MIME type detection for files without extension"""
        test_cases = [
            ('README', b'This is a README file', 'text/plain'),
            ('Makefile', b'CC=gcc\nall: main', 'text/plain'),
            ('config', b'key=value\nport=8080', 'text/plain'),
        ]
        
        for filename, content, expected_mime in test_cases:
            with self.subTest(filename=filename):
                test_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type=expected_mime
                )
                
                upload_data = {'file': test_file}
                upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
                
                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                
                file_data = upload_response.data
                self.assertEqual(file_data['mime_type'], expected_mime)
                self.assertEqual(file_data['original_filename'], filename)
                
    
    def test_upload_file_with_provided_content_type_overrides_detection(self):
        """Test that provided content_type overrides automatic detection"""
        # Upload a .txt file but specify it as JSON
        test_file = SimpleUploadedFile(
            'test.txt',
            b'{"name": "test"}',  # JSON content
            content_type='application/json'  # Override the .txt detection
        )
        
        upload_data = {'file': test_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        # Should use the provided content_type, not detect from extension
        self.assertEqual(file_data['mime_type'], 'application/json')
        self.assertEqual(file_data['original_filename'], 'test.txt')
        
    
    def tearDown(self):
        """Clean up test files"""
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
