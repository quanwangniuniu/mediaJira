"""
Integration tests for filename handling and edge cases
Tests various filename scenarios and special character handling
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
class FilenameHandlingTest(TestCase):
    def setUp(self):
        """Set up test data and client"""
        self.client = APIClient()
        
        # Create test user
        self.user = User.objects.create_user(
            email='test_filename@example.com',
            username='testfilename',
            password='testpass123'
        )
        self.user.is_verified = True
        self.user.save()
        
        # URLs
        self.login_url = reverse('login')
        self.upload_url = reverse('metric_upload:file-upload')
        
        # Login and get token
        login_data = {
            'email': 'test_filename@example.com',
            'password': 'testpass123'
        }
        login_response = self.client.post(self.login_url, login_data)
        self.token = login_response.data.get('token')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_upload_file_with_special_characters_in_name(self):
        """Test uploading file with special characters in filename"""
        test_cases = [
            ('test file with spaces.txt', b'File with spaces'),
            ('test-file-with-dashes.txt', b'File with dashes'),
            ('test_file_with_underscores.txt', b'File with underscores'),
            ('test file with spaces & symbols!@#$%^&*().txt', b'File with special symbols'),
            ('test[file]with{brackets}.txt', b'File with brackets'),
            ('test+file+with+pluses.txt', b'File with pluses'),
            ('test=file=with=equals.txt', b'File with equals'),
            ('test,file,with,commas.txt', b'File with commas'),
            ('test;file;with;semicolons.txt', b'File with semicolons'),
            ('test:file:with:colons.txt', b'File with colons'),
        ]
        
        for filename, content in test_cases:
            with self.subTest(filename=filename):
                test_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type='text/plain'
                )
                
                upload_data = {'file': test_file}
                upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
                
                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                
                file_data = upload_response.data
                self.assertEqual(file_data['original_filename'], filename)
                self.assertEqual(file_data['size'], len(content))
                
                # Verify file was saved correctly
                from django.conf import settings
                full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
                self.assertTrue(os.path.exists(full_path))
                
                # Verify content is preserved
                with open(full_path, 'rb') as f:
                    saved_content = f.read()
                self.assertEqual(saved_content, content)
                
    
    def test_upload_file_with_unicode_characters(self):
        """Test uploading file with Unicode characters in filename"""
        test_cases = [
            ('测试文件.txt', b'Chinese filename test'),
            ('файл_тест.txt', b'Russian filename test'),
            ('ファイルテスト.txt', b'Japanese filename test'),
            ('ملف_اختبار.txt', b'Arabic filename test'),
            ('קובץ_בדיקה.txt', b'Hebrew filename test'),
            ('test_файл_文件.txt', b'Mixed languages filename'),
            ('test_émojis_🚀_📁.txt', b'Filename with emojis'),
        ]
        
        for filename, content in test_cases:
            with self.subTest(filename=filename):
                test_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type='text/plain'
                )
                
                upload_data = {'file': test_file}
                upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
                
                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                
                file_data = upload_response.data
                self.assertEqual(file_data['original_filename'], filename)
                self.assertEqual(file_data['size'], len(content))
                
                # Verify file was saved correctly
                from django.conf import settings
                full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
                self.assertTrue(os.path.exists(full_path))
                
                # Verify content is preserved
                with open(full_path, 'rb') as f:
                    saved_content = f.read()
                self.assertEqual(saved_content, content)
                
    
    def test_upload_file_with_empty_filename(self):
        """Test uploading file with empty filename - Django behavior"""
        # Django's SimpleUploadedFile doesn't allow empty filenames
        # This test verifies Django's validation behavior
        try:
            empty_name_file = SimpleUploadedFile(
                '',  # Empty filename
                b'Content with empty name',
                content_type='text/plain'
            )
            # If we get here, Django allowed it
            upload_data = {'file': empty_name_file}
            upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
            
            if upload_response.status_code == status.HTTP_201_CREATED:
                file_data = upload_response.data
                self.assertEqual(file_data['original_filename'], '')
                self.assertEqual(file_data['size'], len(b'Content with empty name'))
        except Exception as e:
            # Django's validation caught the empty filename
            self.assertIn('SuspiciousFileOperation', str(type(e)))
    
    def test_upload_file_with_none_filename(self):
        """Test uploading file with None filename"""
        none_name_file = SimpleUploadedFile(
            None,  # None filename
            b'Content with None name',
            content_type='text/plain'
        )
        
        upload_data = {'file': none_name_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        # Django might convert None to empty string or handle it differently
        self.assertIsNotNone(file_data['original_filename'])
        self.assertEqual(file_data['size'], len(b'Content with None name'))
        
    
    def test_upload_file_with_very_long_filename(self):
        """Test uploading file with very long filename"""
        # Create a filename that's 255 characters long (max filename length)
        long_filename = 'a' * 250 + '.txt'
        content = b'File with very long filename'
        
        long_file = SimpleUploadedFile(
            long_filename,
            content,
            content_type='text/plain'
        )
        
        upload_data = {'file': long_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['original_filename'], long_filename)
        self.assertEqual(file_data['size'], len(content))
        
        # Verify file was saved correctly
        from django.conf import settings
        full_path = os.path.join(settings.FILE_STORAGE_DIR, file_data['storage_key'])
        self.assertTrue(os.path.exists(full_path))
        
    
    def test_upload_file_with_only_extension(self):
        """Test uploading file with only extension as filename"""
        extension_only_file = SimpleUploadedFile(
            '.txt',  # Only extension
            b'File with only extension',
            content_type='text/plain'
        )
        
        upload_data = {'file': extension_only_file}
        upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
        
        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        
        file_data = upload_response.data
        self.assertEqual(file_data['original_filename'], '.txt')
        self.assertEqual(file_data['size'], len(b'File with only extension'))
        
    
    def test_upload_file_with_multiple_dots(self):
        """Test uploading file with multiple dots in filename"""
        test_cases = [
            ('test.backup.txt', b'File with multiple dots'),
            ('test..txt', b'File with double dots'),
            ('test...txt', b'File with triple dots'),
            ('test.file.backup.txt', b'File with many dots'),
        ]
        
        for filename, content in test_cases:
            with self.subTest(filename=filename):
                test_file = SimpleUploadedFile(
                    filename,
                    content,
                    content_type='text/plain'
                )
                
                upload_data = {'file': test_file}
                upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
                
                self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
                
                file_data = upload_response.data
                self.assertEqual(file_data['original_filename'], filename)
                self.assertEqual(file_data['size'], len(content))
                
    
    def test_upload_file_with_control_characters(self):
        """Test uploading file with control characters in filename - Django behavior"""
        # Test with various control characters
        control_chars = ['\n', '\r', '\t', '\x00', '\x1f']
        
        for char in control_chars:
            original_filename = f'test{char}file.txt'
            content = b'File with control character'
            
            test_file = SimpleUploadedFile(
                original_filename,
                content,
                content_type='text/plain'
            )
            
            upload_data = {'file': test_file}
            upload_response = self.client.post(self.upload_url, upload_data, format='multipart')
            
            self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
            
            file_data = upload_response.data
            # Django may sanitize control characters, so we check that it's handled gracefully
            self.assertIsNotNone(file_data['original_filename'])
            self.assertNotEqual(file_data['original_filename'], original_filename)  # Should be sanitized
            self.assertEqual(file_data['size'], len(content))
            
    
    def tearDown(self):
        """Clean up test files"""
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
