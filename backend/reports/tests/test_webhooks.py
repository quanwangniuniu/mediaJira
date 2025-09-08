"""
Test suite for reports webhooks functionality
"""
import pytest
import json
import hmac
import hashlib
from unittest.mock import patch, MagicMock, Mock
from django.test import TestCase
from django.utils import timezone
from reports.webhooks import (
    _compose_url, _post, _report_payload, _job_payload, _asset_payload,
    fire_report_submitted, fire_report_approved, fire_export_completed, fire_report_published
)
from reports.models import Report, ReportTemplate, ReportAsset
from task.models import Task


class TestWebhookHelpers(TestCase):
    """Test webhook helper functions"""
    
    def test_compose_url(self):
        """Test URL composition"""
        # Test with default endpoint
        url = _compose_url('report.submitted')
        self.assertEqual(url, 'http://localhost:9100/report.submitted')
        
        # Test with trailing slash
        url = _compose_url('report.approved')
        self.assertEqual(url, 'http://localhost:9100/report.approved')
    
    def test_report_payload(self):
        """Test report payload generation"""
        # Create mock report
        report = Mock()
        report.id = 'test_report_1'
        report.title = 'Test Report'
        report.owner_id = 'user_123'
        report.status = 'approved'
        report.report_template_id = 'template_1'
        report.created_at = timezone.now()
        report.updated_at = timezone.now()
        
        payload = _report_payload(report)
        
        self.assertEqual(payload['id'], 'test_report_1')
        self.assertEqual(payload['title'], 'Test Report')
        self.assertEqual(payload['owner_id'], 'user_123')
        self.assertEqual(payload['status'], 'approved')
        self.assertEqual(payload['report_template_id'], 'template_1')
        self.assertIsNotNone(payload['created_at'])
        self.assertIsNotNone(payload['updated_at'])
    
    def test_report_payload_with_none_values(self):
        """Test report payload with None values"""
        report = Mock()
        report.id = 'test_report_1'
        report.title = None
        report.owner_id = None
        report.status = None
        report.report_template_id = None
        report.created_at = None
        report.updated_at = None
        
        payload = _report_payload(report)
        
        self.assertEqual(payload['id'], 'test_report_1')
        self.assertIsNone(payload['title'])
        self.assertIsNone(payload['owner_id'])
        self.assertIsNone(payload['status'])
        self.assertIsNone(payload['report_template_id'])
        self.assertIsNone(payload['created_at'])
        self.assertIsNone(payload['updated_at'])
    
    def test_job_payload(self):
        """Test job payload generation"""
        job = Mock()
        job.id = 'job_123'
        job.type = 'export'
        job.status = 'completed'
        job.message = 'Export completed successfully'
        job.created_at = timezone.now()
        job.updated_at = timezone.now()
        job.result_asset_id = 'asset_456'
        job.page_id = 'page_789'
        job.page_url = 'https://example.com/page/789'
        
        payload = _job_payload(job)
        
        self.assertEqual(payload['id'], 'job_123')
        self.assertEqual(payload['type'], 'export')
        self.assertEqual(payload['status'], 'completed')
        self.assertEqual(payload['message'], 'Export completed successfully')
        self.assertEqual(payload['result_asset_id'], 'asset_456')
        self.assertEqual(payload['page_id'], 'page_789')
        self.assertEqual(payload['page_url'], 'https://example.com/page/789')
        self.assertIsNotNone(payload['created_at'])
        self.assertIsNotNone(payload['updated_at'])
    
    def test_asset_payload(self):
        """Test asset payload generation"""
        asset = Mock()
        asset.id = 'asset_123'
        asset.report_id = 'report_456'
        asset.file_url = 'https://example.com/files/report.pdf'
        asset.file_type = 'pdf'
        asset.checksum = 'abc123def456'
        asset.created_at = timezone.now()
        asset.updated_at = timezone.now()
        
        payload = _asset_payload(asset)
        
        self.assertEqual(payload['id'], 'asset_123')
        self.assertEqual(payload['report_id'], 'report_456')
        self.assertEqual(payload['file_url'], 'https://example.com/files/report.pdf')
        self.assertEqual(payload['file_type'], 'pdf')
        self.assertEqual(payload['checksum'], 'abc123def456')
        self.assertIsNotNone(payload['created_at'])
        self.assertIsNotNone(payload['updated_at'])


class TestWebhookPosting(TestCase):
    """Test webhook posting functionality"""
    
    def setUp(self):
        """Set up test data"""
        self.mock_report = Mock()
        self.mock_report.id = 'test_report_1'
        self.mock_report.title = 'Test Report'
        self.mock_report.owner_id = 'user_123'
        self.mock_report.status = 'submitted'
        self.mock_report.report_template_id = 'template_1'
        self.mock_report.created_at = timezone.now()
        self.mock_report.updated_at = timezone.now()
        
        self.mock_job = Mock()
        self.mock_job.id = 'job_123'
        self.mock_job.type = 'export'
        self.mock_job.status = 'completed'
        self.mock_job.message = 'Export completed'
        self.mock_job.created_at = timezone.now()
        self.mock_job.updated_at = timezone.now()
        self.mock_job.result_asset_id = 'asset_456'
        self.mock_job.page_id = None
        self.mock_job.page_url = None
        
        self.mock_asset = Mock()
        self.mock_asset.id = 'asset_123'
        self.mock_asset.report_id = 'report_456'
        self.mock_asset.file_url = 'https://example.com/files/report.pdf'
        self.mock_asset.file_type = 'pdf'
        self.mock_asset.checksum = 'abc123def456'
        self.mock_asset.created_at = timezone.now()
        self.mock_asset.updated_at = timezone.now()
    
    @patch('reports.webhooks._post')
    def test_fire_report_submitted(self, mock_post):
        """Test fire_report_submitted webhook"""
        fire_report_submitted(self.mock_report, 'user_123')
        
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        self.assertEqual(call_args[0][0], 'report.submitted')
        payload = call_args[0][1]
        
        self.assertIn('report', payload)
        self.assertIn('triggered_by', payload)
        self.assertIn('occurred_at', payload)
        self.assertEqual(payload['triggered_by'], 'user_123')
        self.assertEqual(payload['report']['id'], 'test_report_1')
    
    @patch('reports.webhooks._post')
    def test_fire_report_approved(self, mock_post):
        """Test fire_report_approved webhook"""
        fire_report_approved(self.mock_report, 'approver_456')
        
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        self.assertEqual(call_args[0][0], 'report.approved')
        payload = call_args[0][1]
        
        self.assertIn('report', payload)
        self.assertIn('approver_id', payload)
        self.assertIn('occurred_at', payload)
        self.assertEqual(payload['approver_id'], 'approver_456')
        self.assertEqual(payload['report']['id'], 'test_report_1')
    
    @patch('reports.webhooks._post')
    def test_fire_export_completed(self, mock_post):
        """Test fire_export_completed webhook"""
        fire_export_completed(self.mock_job, self.mock_asset)
        
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        self.assertEqual(call_args[0][0], 'export.completed')
        payload = call_args[0][1]
        
        self.assertIn('job', payload)
        self.assertIn('asset', payload)
        self.assertIn('occurred_at', payload)
        self.assertEqual(payload['job']['id'], 'job_123')
        self.assertEqual(payload['asset']['id'], 'asset_123')
    
    @patch('reports.webhooks._post')
    def test_fire_report_published(self, mock_post):
        """Test fire_report_published webhook"""
        fire_report_published(self.mock_job, 'page_789', 'https://example.com/page/789')
        
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        
        self.assertEqual(call_args[0][0], 'report.published')
        payload = call_args[0][1]
        
        self.assertIn('job', payload)
        self.assertIn('page_id', payload)
        self.assertIn('page_url', payload)
        self.assertIn('occurred_at', payload)
        self.assertEqual(payload['page_id'], 'page_789')
        self.assertEqual(payload['page_url'], 'https://example.com/page/789')
        self.assertEqual(payload['job']['id'], 'job_123')


class TestWebhookPostFunction(TestCase):
    """Test the _post function directly"""
    
    @patch('reports.webhooks.requests.post')
    def test_post_success(self, mock_requests_post):
        """Test successful webhook post"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = 'OK'
        mock_requests_post.return_value = mock_response
        
        payload = {'test': 'data'}
        _post('test.event', payload)
        
        mock_requests_post.assert_called_once()
        call_args = mock_requests_post.call_args
        
        # Check URL (using default endpoint)
        self.assertEqual(call_args[0][0], 'http://localhost:9100/test.event')
        
        # Check headers
        headers = call_args[1]['headers']
        self.assertEqual(headers['Content-Type'], 'application/json')
        self.assertEqual(headers['X-Event'], 'test.event')
        self.assertIn('X-Signature-256', headers)
        self.assertIn('X-Idempotency-Key', headers)
        
        # Check data
        data = call_args[1]['data']
        self.assertEqual(json.loads(data), payload)
        
        # Check timeout (using default)
        self.assertEqual(call_args[1]['timeout'], 5)
    
    @patch('reports.webhooks.requests.post')
    def test_post_retry_on_failure(self, mock_requests_post):
        """Test webhook retry on failure"""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = 'Internal Server Error'
        mock_requests_post.return_value = mock_response
        
        payload = {'test': 'data'}
        _post('test.event', payload)
        
        # Should retry 3 times (1 initial + 2 retries)
        self.assertEqual(mock_requests_post.call_count, 3)
    
    @patch('reports.webhooks.requests.post')
    def test_post_exception_handling(self, mock_requests_post):
        """Test webhook exception handling"""
        mock_requests_post.side_effect = Exception('Connection error')
        
        payload = {'test': 'data'}
        _post('test.event', payload)
        
        # Should retry 3 times (1 initial + 2 retries, default RETRIES=2)
        self.assertEqual(mock_requests_post.call_count, 3)
    
    def test_signature_generation(self):
        """Test HMAC signature generation"""
        payload = {'test': 'data'}
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        
        # Generate signature manually
        expected_sig = hmac.new(
            'dev_secret'.encode("utf-8"), 
            body, 
            hashlib.sha256
        ).hexdigest()
        
        # Test signature generation in _post
        with patch('reports.webhooks.requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_post.return_value = mock_response
            
            _post('test.event', payload)
            
            # Get the signature from the call
            headers = mock_post.call_args[1]['headers']
            actual_sig = headers['X-Signature-256']
            
            self.assertEqual(actual_sig, expected_sig)
    
    def test_idempotency_key_generation(self):
        """Test idempotency key generation"""
        payload = {'test': 'data'}
        body = json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
        
        # Generate idempotency key manually
        expected_key = hashlib.sha256(body).hexdigest()
        
        # Test idempotency key generation in _post
        with patch('reports.webhooks.requests.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 200
            mock_post.return_value = mock_response
            
            _post('test.event', payload)
            
            # Get the idempotency key from the call
            headers = mock_post.call_args[1]['headers']
            actual_key = headers['X-Idempotency-Key']
            
            self.assertEqual(actual_key, expected_key)
    
    @patch('reports.webhooks.requests.post')
    def test_unicode_payload_handling(self, mock_requests_post):
        """Test webhook with Unicode payload"""
        payload = {'test': '测试数据', 'emoji': '🚀'}
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_requests_post.return_value = mock_response
        
        _post('test.event', payload)
        
        mock_requests_post.assert_called_once()
        call_args = mock_requests_post.call_args
        
        # Check that Unicode data is properly encoded
        data = call_args[1]['data']
        decoded_data = json.loads(data)
        self.assertEqual(decoded_data, payload)
    
    @patch('reports.webhooks.requests.post')
    def test_large_payload_handling(self, mock_requests_post):
        """Test webhook with large payload"""
        # Create a large payload
        large_data = {'items': [{'id': i, 'data': f'item_{i}'} for i in range(1000)]}
        
        mock_response = Mock()
        mock_response.status_code = 200
        mock_requests_post.return_value = mock_response
        
        _post('test.event', large_data)
        
        mock_requests_post.assert_called_once()
        call_args = mock_requests_post.call_args
        
        # Check that large payload is handled
        data = call_args[1]['data']
        decoded_data = json.loads(data)
        self.assertEqual(len(decoded_data['items']), 1000)
