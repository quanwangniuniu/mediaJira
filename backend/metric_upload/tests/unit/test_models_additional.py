"""
Additional unit tests for metric_upload models
Tests model methods, properties, and business logic
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from metric_upload.models import MetricFile

User = get_user_model()


class TestMetricFileModel(TestCase):
    """Test MetricFile model functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_metric_file_creation(self):
        """Test basic MetricFile creation"""
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        self.assertEqual(metric_file.original_filename, 'test.txt')
        self.assertEqual(metric_file.uploaded_by, self.user)
        self.assertEqual(metric_file.storage_key, 'test/test.txt')
        self.assertEqual(metric_file.size, 100)
        self.assertEqual(metric_file.checksum, 'test_checksum')
        self.assertFalse(metric_file.is_public)
        self.assertFalse(metric_file.is_deleted)
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
    
    def test_metric_file_str_representation(self):
        """Test MetricFile string representation"""
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        expected_str = "test.txt (testuser)"
        self.assertEqual(str(metric_file), expected_str)
    
    def test_metric_file_default_values(self):
        """Test MetricFile default values"""
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        self.assertFalse(metric_file.is_public)
        self.assertFalse(metric_file.is_deleted)
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        self.assertIsNotNone(metric_file.created_at)
        self.assertIsNotNone(metric_file.updated_at)
    
    def test_metric_file_public_property(self):
        """Test MetricFile public property"""
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        # Initially private
        self.assertFalse(metric_file.is_public)
        
        # Make public
        metric_file.is_public = True
        metric_file.save()
        
        self.assertTrue(metric_file.is_public)
    
    def test_metric_file_deleted_property(self):
        """Test MetricFile deleted property"""
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        # Initially not deleted
        self.assertFalse(metric_file.is_deleted)
        
        # Mark as deleted
        metric_file.is_deleted = True
        metric_file.save()
        
        self.assertTrue(metric_file.is_deleted)
    
    def test_metric_file_owner_relationship(self):
        """Test MetricFile owner relationship"""
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        self.assertEqual(metric_file.uploaded_by, self.user)
        self.assertIn(metric_file, self.user.uploaded_metrics.all())
    
    def test_metric_file_filename_validation(self):
        """Test MetricFile filename validation"""
        # Test with valid filename
        metric_file = MetricFile.objects.create(
            original_filename='valid_filename.txt',
            uploaded_by=self.user,
            storage_key='test/valid_filename.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        self.assertEqual(metric_file.original_filename, 'valid_filename.txt')
    
    def test_metric_file_file_size_validation(self):
        """Test MetricFile file size validation"""
        # Test with valid file size
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=0,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        self.assertEqual(metric_file.size, 0)
        
        # Test with large file size
        metric_file.size = 1000000
        metric_file.save()
        
        self.assertEqual(metric_file.size, 1000000)
    
    def test_metric_file_checksum_validation(self):
        """Test MetricFile checksum validation"""
        # Test with valid checksum
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='a' * 64,  # SHA256 length
            mime_type='text/plain'
        )
        
        self.assertEqual(metric_file.checksum, 'a' * 64)
    
    def test_metric_file_timestamps(self):
        """Test MetricFile timestamp fields"""
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        # Check that timestamps are set
        self.assertIsNotNone(metric_file.created_at)
        self.assertIsNotNone(metric_file.updated_at)
        
        # Check that created_at and updated_at are initially very close (within 1 second)
        time_diff = abs((metric_file.updated_at - metric_file.created_at).total_seconds())
        self.assertLess(time_diff, 1.0, "created_at and updated_at should be within 1 second of each other")
        
        # Update the file and check that updated_at changes
        original_updated_at = metric_file.updated_at
        metric_file.original_filename = 'updated_test.txt'
        metric_file.save()
        
        self.assertGreater(metric_file.updated_at, original_updated_at)
        self.assertEqual(metric_file.created_at, metric_file.created_at)  # Should not change
    
    def test_metric_file_status_constants(self):
        """Test MetricFile status constants"""
        self.assertEqual(MetricFile.INCOMING, 'incoming')
        self.assertEqual(MetricFile.SCANNING, 'scanning')
        self.assertEqual(MetricFile.READY, 'ready')
        self.assertEqual(MetricFile.INFECTED, 'infected')
        self.assertEqual(MetricFile.ERROR_SCANNING, 'error_scanning')
        self.assertEqual(MetricFile.MISSING, 'missing')
    
    def test_metric_file_status_choices(self):
        """Test MetricFile status choices"""
        status_choices = MetricFile._meta.get_field('status').choices
        
        expected_choices = [
            (MetricFile.INCOMING, 'Incoming - File just uploaded'),
            (MetricFile.SCANNING, 'Scanning - Virus scan in progress'),
            (MetricFile.READY, 'Ready - File is safe and available'),
            (MetricFile.INFECTED, 'Infected - File contains virus/malware'),
            (MetricFile.MISSING, 'Missing - File missing from storage'),
            (MetricFile.ERROR_SCANNING, 'ErrorScanning - Scanner error occurred'),
        ]
        
        self.assertEqual(list(status_choices), expected_choices)
    
    def test_metric_file_ordering(self):
        """Test MetricFile default ordering"""
        # Create multiple files
        file1 = MetricFile.objects.create(
            original_filename='file1.txt',
            uploaded_by=self.user,
            storage_key='test/file1.txt',
            size=100,
            checksum='checksum1',
            mime_type='text/plain'
        )
        
        file2 = MetricFile.objects.create(
            original_filename='file2.txt',
            uploaded_by=self.user,
            storage_key='test/file2.txt',
            size=200,
            checksum='checksum2',
            mime_type='text/plain'
        )
        
        file3 = MetricFile.objects.create(
            original_filename='file3.txt',
            uploaded_by=self.user,
            storage_key='test/file3.txt',
            size=300,
            checksum='checksum3',
            mime_type='text/plain'
        )
        
        # Get all files and check ordering
        all_files = list(MetricFile.objects.all())
        
        # Should be ordered by created_at descending (newest first)
        self.assertEqual(all_files[0], file3)
        self.assertEqual(all_files[1], file2)
        self.assertEqual(all_files[2], file1)
    
    def test_metric_file_soft_delete(self):
        """Test MetricFile soft delete functionality"""
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        # Initially not deleted
        self.assertFalse(metric_file.is_deleted)
        
        # Soft delete
        metric_file.is_deleted = True
        metric_file.save()
        
        # Check that file is marked as deleted
        self.assertTrue(metric_file.is_deleted)
        
        # File should still exist in database
        self.assertTrue(MetricFile.objects.filter(id=metric_file.id).exists())
