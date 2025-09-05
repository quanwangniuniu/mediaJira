"""
Unit tests for metric_upload serializers
Tests serializer field definitions, validation, and data representation
"""

import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from unittest.mock import patch, MagicMock

from metric_upload.models import MetricFile
from metric_upload.serializers import MetricFileSerializer, UserSerializer

User = get_user_model()


class TestUserSerializer(TestCase):
    """Test UserSerializer functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_user_serializer_fields(self):
        """Test UserSerializer includes correct fields"""
        serializer = UserSerializer(self.user)
        data = serializer.data
        
        expected_fields = {'id', 'username', 'email'}
        actual_fields = set(data.keys())
        
        self.assertEqual(actual_fields, expected_fields)
    
    def test_user_serializer_data(self):
        """Test UserSerializer returns correct data"""
        serializer = UserSerializer(self.user)
        data = serializer.data
        
        self.assertEqual(data['id'], self.user.id)
        self.assertEqual(data['username'], 'testuser')
        self.assertEqual(data['email'], 'test@example.com')


class TestMetricFileSerializer(TestCase):
    """Test MetricFileSerializer functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.metric_file = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/storage/key.txt',
            original_filename='test.txt',
            uploaded_by=self.user,
            checksum='abcd1234efgh5678',
            is_public=False,
            is_deleted=False
        )
    
    def test_metric_file_serializer_fields(self):
        """Test MetricFileSerializer includes all required fields"""
        serializer = MetricFileSerializer(self.metric_file)
        data = serializer.data
        
        expected_fields = {
            'id', 'status', 'mime_type', 'size', 'checksum', 'storage_key',
            'original_filename', 'is_public', 'is_deleted', 'uploaded_by', 
            'created_at', 'updated_at'
        }
        actual_fields = set(data.keys())
        
        self.assertEqual(actual_fields, expected_fields)
    
    def test_metric_file_serializer_data(self):
        """Test MetricFileSerializer returns correct data"""
        serializer = MetricFileSerializer(self.metric_file)
        data = serializer.data
        
        # Test basic fields
        self.assertEqual(data['id'], self.metric_file.id)
        self.assertEqual(data['status'], self.metric_file.status)
        self.assertEqual(data['mime_type'], 'text/plain')
        self.assertEqual(data['size'], 1024)
        self.assertEqual(data['checksum'], 'abcd1234efgh5678')
        self.assertEqual(data['storage_key'], 'test/storage/key.txt')
        self.assertEqual(data['original_filename'], 'test.txt')
        self.assertEqual(data['is_public'], False)
        self.assertEqual(data['is_deleted'], False)
        
        # Test nested uploaded_by field
        self.assertIsInstance(data['uploaded_by'], dict)
        self.assertEqual(data['uploaded_by']['id'], self.user.id)
        self.assertEqual(data['uploaded_by']['username'], 'testuser')
        self.assertEqual(data['uploaded_by']['email'], 'test@example.com')
        
        # Test timestamp fields
        self.assertIsNotNone(data['created_at'])
        self.assertIsNotNone(data['updated_at'])
    
    def test_metric_file_serializer_read_only_fields(self):
        """Test that read-only fields cannot be modified"""
        serializer = MetricFileSerializer(self.metric_file)
        
        read_only_fields = {
            'id', 'status', 'mime_type', 'size', 'checksum', 'storage_key', 
            'is_deleted', 'uploaded_by', 'created_at', 'updated_at'
        }
        
        for field in read_only_fields:
            self.assertIn(field, serializer.Meta.read_only_fields)
    
    def test_metric_file_serializer_writable_fields(self):
        """Test that only specific fields are writable"""
        serializer = MetricFileSerializer(self.metric_file)
        
        # Fields that should be writable (not in read_only_fields)
        writable_fields = {'original_filename', 'is_public'}
        
        for field in writable_fields:
            self.assertNotIn(field, serializer.Meta.read_only_fields)
    
    def test_metric_file_serializer_with_public_file(self):
        """Test serializer with public file"""
        public_file = MetricFile.objects.create(
            mime_type='image/jpeg',
            size=2048,
            storage_key='public/image.jpg',
            original_filename='image.jpg',
            uploaded_by=self.user,
            checksum='public123456789',
            is_public=True,
            is_deleted=False
        )
        
        serializer = MetricFileSerializer(public_file)
        data = serializer.data
        
        self.assertEqual(data['is_public'], True)
        self.assertEqual(data['mime_type'], 'image/jpeg')
        self.assertEqual(data['size'], 2048)
    
    def test_metric_file_serializer_with_deleted_file(self):
        """Test serializer with deleted file"""
        deleted_file = MetricFile.objects.create(
            mime_type='application/pdf',
            size=5120,
            storage_key='deleted/document.pdf',
            original_filename='document.pdf',
            uploaded_by=self.user,
            checksum='deleted123456789',
            is_public=False,
            is_deleted=True
        )
        
        serializer = MetricFileSerializer(deleted_file)
        data = serializer.data
        
        self.assertEqual(data['is_deleted'], True)
        self.assertEqual(data['mime_type'], 'application/pdf')
        self.assertEqual(data['size'], 5120)
    
    def test_metric_file_serializer_uploaded_by_nested(self):
        """Test that uploaded_by field is properly nested"""
        serializer = MetricFileSerializer(self.metric_file)
        data = serializer.data
        
        uploaded_by_data = data['uploaded_by']
        self.assertIsInstance(uploaded_by_data, dict)
        self.assertEqual(uploaded_by_data['id'], self.user.id)
        self.assertEqual(uploaded_by_data['username'], self.user.username)
        self.assertEqual(uploaded_by_data['email'], self.user.email)
    
    def test_metric_file_serializer_empty_optional_fields(self):
        """Test serializer handles empty optional fields"""
        file_with_minimal_data = MetricFile.objects.create(
            mime_type='text/plain',
            size=0,
            storage_key='empty/file.txt',
            original_filename='',
            uploaded_by=self.user,
            checksum='',
            is_public=False,
            is_deleted=False
        )
        
        serializer = MetricFileSerializer(file_with_minimal_data)
        data = serializer.data
        
        self.assertEqual(data['size'], 0)
        self.assertEqual(data['original_filename'], '')
        self.assertEqual(data['checksum'], '')
        self.assertEqual(data['is_public'], False)
        self.assertEqual(data['is_deleted'], False)
    
    def test_metric_file_serializer_multiple_files(self):
        """Test serializer with multiple files"""
        files = []
        for i in range(3):
            file_obj = MetricFile.objects.create(
                mime_type=f'text/plain{i}',
                size=100 * (i + 1),
                storage_key=f'test/file{i}.txt',
                original_filename=f'file{i}.txt',
                uploaded_by=self.user,
                checksum=f'checksum{i}',
                is_public=(i % 2 == 0),
                is_deleted=False
            )
            files.append(file_obj)
        
        # Test serializing multiple files
        serialized_data = []
        for file_obj in files:
            serializer = MetricFileSerializer(file_obj)
            serialized_data.append(serializer.data)
        
        self.assertEqual(len(serialized_data), 3)
        
        # Verify each file has correct data
        for i, data in enumerate(serialized_data):
            self.assertEqual(data['mime_type'], f'text/plain{i}')
            self.assertEqual(data['size'], 100 * (i + 1))
            self.assertEqual(data['original_filename'], f'file{i}.txt')
            self.assertEqual(data['checksum'], f'checksum{i}')
            self.assertEqual(data['is_public'], (i % 2 == 0))
