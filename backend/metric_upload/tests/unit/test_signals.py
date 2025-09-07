"""
Unit tests for metric_upload signals
Tests signal handlers and automatic task triggering
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock

from metric_upload.models import MetricFile
from metric_upload.signals import trigger_virus_scan

User = get_user_model()


class TestVirusScanSignal(TestCase):
    """Test virus scan signal functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal(self, mock_scan_task):
        """Test that virus scan signal triggers scan task"""
        # Create a new MetricFile
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        # Check that scan task was triggered
        mock_scan_task.assert_called_once_with(metric_file.id)
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_on_update(self, mock_scan_task):
        """Test that virus scan signal is not triggered on file updates"""
        # Create a MetricFile
        metric_file = MetricFile.objects.create(
            original_filename='test.txt',
            uploaded_by=self.user,
            storage_key='test/test.txt',
            size=100,
            checksum='test_checksum',
            mime_type='text/plain'
        )
        
        # Clear the mock to reset call count
        mock_scan_task.reset_mock()
        
        # Update the file
        metric_file.original_filename = 'updated_test.txt'
        metric_file.save()
        
        # Check that scan task was not triggered again
        mock_scan_task.assert_not_called()
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_multiple_files(self, mock_scan_task):
        """Test that virus scan signal triggers for multiple files"""
        # Create multiple MetricFiles
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
        
        # Check that scan task was triggered for each file
        expected_calls = [
            MagicMock(file1.id),
            MagicMock(file2.id),
            MagicMock(file3.id)
        ]
        
        self.assertEqual(mock_scan_task.call_count, 3)
        mock_scan_task.assert_any_call(file1.id)
        mock_scan_task.assert_any_call(file2.id)
        mock_scan_task.assert_any_call(file3.id)
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_with_different_owners(self, mock_scan_task):
        """Test that virus scan signal works with different file owners"""
        # Create another user
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        # Create files with different owners
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
            uploaded_by=other_user,
            storage_key='test/file2.txt',
            size=200,
            checksum='checksum2',
            mime_type='text/plain'
        )
        
        # Check that scan task was triggered for both files
        self.assertEqual(mock_scan_task.call_count, 2)
        mock_scan_task.assert_any_call(file1.id)
        mock_scan_task.assert_any_call(file2.id)
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_with_different_statuses(self, mock_scan_task):
        """Test that virus scan signal triggers regardless of initial status"""
        # Create files with different initial statuses
        file1 = MetricFile.objects.create(
            original_filename='file1.txt',
            uploaded_by=self.user,
            storage_key='test/file1.txt',
            size=100,
            checksum='checksum1',
            mime_type='text/plain'
        )
        
        # Manually set status to something other than INCOMING using FSM transition
        file1.start_scan()
        file1.save()
        
        # Create another file
        file2 = MetricFile.objects.create(
            original_filename='file2.txt',
            uploaded_by=self.user,
            storage_key='test/file2.txt',
            size=200,
            checksum='checksum2',
            mime_type='text/plain'
        )
        
        # Check that scan task was triggered for both files
        self.assertEqual(mock_scan_task.call_count, 2)
        mock_scan_task.assert_any_call(file1.id)
        mock_scan_task.assert_any_call(file2.id)
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_with_public_files(self, mock_scan_task):
        """Test that virus scan signal works with public files"""
        # Create a public file
        public_file = MetricFile.objects.create(
            original_filename='public.txt',
            uploaded_by=self.user,
            storage_key='test/public.txt',
            size=100,
            checksum='public_checksum',
            mime_type='text/plain',
            is_public=True
        )
        
        # Check that scan task was triggered
        mock_scan_task.assert_called_once_with(public_file.id)
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_with_deleted_files(self, mock_scan_task):
        """Test that virus scan signal works with deleted files"""
        # Create a deleted file
        deleted_file = MetricFile.objects.create(
            original_filename='deleted.txt',
            uploaded_by=self.user,
            storage_key='test/deleted.txt',
            size=100,
            checksum='deleted_checksum',
            mime_type='text/plain',
            is_deleted=True
        )
        
        # Check that scan task was triggered
        mock_scan_task.assert_called_once_with(deleted_file.id)
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_with_large_files(self, mock_scan_task):
        """Test that virus scan signal works with large files"""
        # Create a large file
        large_file = MetricFile.objects.create(
            original_filename='large.txt',
            uploaded_by=self.user,
            storage_key='test/large.txt',
            size=1000000,  # 1MB
            checksum='large_checksum',
            mime_type='text/plain'
        )
        
        # Check that scan task was triggered
        mock_scan_task.assert_called_once_with(large_file.id)
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_with_zero_size_files(self, mock_scan_task):
        """Test that virus scan signal works with zero-size files"""
        # Create a zero-size file
        zero_file = MetricFile.objects.create(
            original_filename='zero.txt',
            uploaded_by=self.user,
            storage_key='test/zero.txt',
            size=0,
            checksum='zero_checksum',
            mime_type='text/plain'
        )
        
        # Check that scan task was triggered
        mock_scan_task.assert_called_once_with(zero_file.id)
    
    @patch('metric_upload.signals.scan_file_for_virus.delay')
    def test_trigger_virus_scan_signal_with_special_characters(self, mock_scan_task):
        """Test that virus scan signal works with special characters in filename"""
        # Create a file with special characters
        special_file = MetricFile.objects.create(
            original_filename='test file with spaces & symbols!.txt',
            uploaded_by=self.user,
            storage_key='test/test file with spaces & symbols!.txt',
            size=100,
            checksum='special_checksum',
            mime_type='text/plain'
        )
        
        # Check that scan task was triggered
        mock_scan_task.assert_called_once_with(special_file.id)
