"""
Unit tests for MetricFile model FSM logic
Tests status transitions, helper methods, and state machine behavior
"""

import os
import tempfile
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from metric_upload.models import MetricFile

User = get_user_model()


@override_settings(
    FILE_STORAGE_DIR=tempfile.mkdtemp()
)
class MetricFileFSMTest(TestCase):
    def setUp(self):
        """Set up test data"""
        # Create test user
        self.user = User.objects.create_user(
            email='test_fsm@example.com',
            username='testfsm',
            password='testpass123'
        )
    
    def test_initial_status_is_incoming(self):
        """Test that newly created file starts with 'incoming' status"""
        metric_file = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/initial.txt',
            original_filename='initial.txt',
            uploaded_by=self.user
        )
        
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
    
    def test_manual_status_transitions(self):
        """Test manual status transitions using FSM methods"""
        # Create a metric file directly in database
        metric_file = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/manual_transitions.txt',
            original_filename='manual_transitions.txt',
            uploaded_by=self.user
        )
        
        # Test incoming -> scanning
        self.assertEqual(metric_file.status, MetricFile.INCOMING)
        metric_file.start_scan()
        self.assertEqual(metric_file.status, MetricFile.SCANNING)
        
        # Test scanning -> ready
        metric_file.mark_clean()
        self.assertEqual(metric_file.status, MetricFile.READY)
        
        # Test scanning -> infected
        metric_file2 = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/manual_transitions2.txt',
            original_filename='manual_transitions2.txt',
            uploaded_by=self.user
        )
        metric_file2.start_scan()
        metric_file2.mark_infected()
        self.assertEqual(metric_file2.status, MetricFile.INFECTED)
        
        # Test scanning -> error_scanning
        metric_file3 = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/manual_transitions3.txt',
            original_filename='manual_transitions3.txt',
            uploaded_by=self.user
        )
        metric_file3.start_scan()
        metric_file3.mark_error_scanning()
        self.assertEqual(metric_file3.status, MetricFile.ERROR_SCANNING)
    
    def test_status_check_methods(self):
        """Test status check helper methods"""
        # Create files in different states
        incoming_file = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/incoming.txt',
            original_filename='incoming.txt',
            uploaded_by=self.user
        )
        
        scanning_file = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/scanning.txt',
            original_filename='scanning.txt',
            uploaded_by=self.user
        )
        scanning_file.start_scan()
        
        ready_file = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/ready.txt',
            original_filename='ready.txt',
            uploaded_by=self.user
        )
        ready_file.start_scan()
        ready_file.mark_clean()
        
        # Test status check methods
        self.assertTrue(incoming_file.is_scanning())
        self.assertFalse(incoming_file.is_ready())
        self.assertFalse(incoming_file.is_infected())
        
        self.assertTrue(scanning_file.is_scanning())
        self.assertFalse(scanning_file.is_ready())
        self.assertFalse(scanning_file.is_infected())
        
        self.assertFalse(ready_file.is_scanning())
        self.assertTrue(ready_file.is_ready())
        self.assertFalse(ready_file.is_infected())
        
    
    def test_status_messages(self):
        """Test status message generation"""
        # Create file in incoming state
        metric_file = MetricFile.objects.create(
            mime_type='text/plain',
            size=1024,
            storage_key='test/messages.txt',
            original_filename='messages.txt',
            uploaded_by=self.user
        )
        
        # Test initial message
        message = metric_file.get_status_message()
        self.assertIn('waiting for virus scan', message)
        
        # Test scanning message
        metric_file.start_scan()
        message = metric_file.get_status_message()
        self.assertIn('Virus scan in progress', message)
        
        # Test ready message
        metric_file.mark_clean()
        message = metric_file.get_status_message()
        self.assertIn('safe and ready', message)
    
    def tearDown(self):
        """Clean up test files"""
        # Clean up any created files
        from django.conf import settings
        for metric_file in MetricFile.objects.all():
            full_path = os.path.join(settings.FILE_STORAGE_DIR, metric_file.storage_key)
            if os.path.exists(full_path):
                os.remove(full_path)
