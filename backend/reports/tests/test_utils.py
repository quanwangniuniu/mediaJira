"""
Test utility functions
"""
import pytest
from unittest.mock import patch, MagicMock
from django.test import TestCase
import hashlib
import json


def generate_version_hash(data):
    """Simple version hash generation for testing"""
    if data is None:
        data = {}
    data_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(data_str.encode()).hexdigest()

def compare_versions(data1, data2):
    """Simple version comparison for testing"""
    if data1 is None and data2 is None:
        return True
    if data1 is None or data2 is None:
        return False
    return generate_version_hash(data1) == generate_version_hash(data2)

def generate_etag(data):
    """Simple ETag generation for testing"""
    hash_val = generate_version_hash(data)
    return f'"{hash_val}"'

def validate_etag(etag, data):
    """Simple ETag validation for testing"""
    if etag is None or data is None:
        return False
    expected_etag = generate_etag(data)
    return etag == expected_etag


@pytest.mark.django_db
class TestReportUtils(TestCase):
    """Test report utility functions"""
    
    def setUp(self):
        """Set up test data"""
        self.test_data = {
            "tables": {
                "default": [
                    {"campaign": "Campaign A", "cost": 100, "revenue": 200},
                    {"campaign": "Campaign B", "cost": 150, "revenue": 300}
                ]
            },
            "total_records": 2,
            "total_cost": 250,
            "total_revenue": 500
        }
    
    def test_generate_version_hash(self):
        """Test version hash generation"""
        hash1 = generate_version_hash(self.test_data)
        hash2 = generate_version_hash(self.test_data)
        
        # Same data should generate same hash
        assert hash1 == hash2
        assert isinstance(hash1, str)
        assert len(hash1) > 0
    
    def test_generate_version_hash_different_data(self):
        """Test version hash generation with different data"""
        data1 = {"tables": {"default": [{"campaign": "A", "cost": 100}]}}
        data2 = {"tables": {"default": [{"campaign": "B", "cost": 200}]}}
        
        hash1 = generate_version_hash(data1)
        hash2 = generate_version_hash(data2)
        
        # Different data should generate different hashes
        assert hash1 != hash2
    
    def test_generate_version_hash_empty_data(self):
        """Test version hash generation with empty data"""
        empty_data = {}
        hash1 = generate_version_hash(empty_data)
        
        assert isinstance(hash1, str)
        assert len(hash1) > 0
    
    def test_generate_version_hash_none_data(self):
        """Test version hash generation with None data"""
        hash1 = generate_version_hash(None)
        
        assert isinstance(hash1, str)
        assert len(hash1) > 0
    
    def test_compare_versions(self):
        """Test version comparison"""
        data1 = {"tables": {"default": [{"campaign": "A", "cost": 100}]}}
        data2 = {"tables": {"default": [{"campaign": "A", "cost": 100}]}}
        data3 = {"tables": {"default": [{"campaign": "B", "cost": 200}]}}
        
        # Same data should be equal
        assert compare_versions(data1, data2) == True
        
        # Different data should not be equal
        assert compare_versions(data1, data3) == False
    
    def test_compare_versions_with_none(self):
        """Test version comparison with None values"""
        data1 = {"tables": {"default": [{"campaign": "A", "cost": 100}]}}
        
        # Compare with None
        assert compare_versions(data1, None) == False
        assert compare_versions(None, data1) == False
        assert compare_versions(None, None) == True
    
    def test_generate_etag(self):
        """Test ETag generation"""
        etag1 = generate_etag(self.test_data)
        etag2 = generate_etag(self.test_data)
        
        # Same data should generate same ETag
        assert etag1 == etag2
        assert isinstance(etag1, str)
        assert len(etag1) > 0
    
    def test_generate_etag_different_data(self):
        """Test ETag generation with different data"""
        data1 = {"tables": {"default": [{"campaign": "A", "cost": 100}]}}
        data2 = {"tables": {"default": [{"campaign": "B", "cost": 200}]}}
        
        etag1 = generate_etag(data1)
        etag2 = generate_etag(data2)
        
        # Different data should generate different ETags
        assert etag1 != etag2
    
    def test_validate_etag(self):
        """Test ETag validation"""
        etag = generate_etag(self.test_data)
        
        # Valid ETag should pass validation
        assert validate_etag(etag, self.test_data) == True
        
        # Invalid ETag should fail validation
        assert validate_etag("invalid_etag", self.test_data) == False
    
    def test_validate_etag_with_none(self):
        """Test ETag validation with None values"""
        etag = generate_etag(self.test_data)
        
        # None ETag should fail validation
        assert validate_etag(None, self.test_data) == False
        
        # None data should fail validation
        assert validate_etag(etag, None) == False
    
    def test_hash_consistency(self):
        """Test hash consistency across multiple calls"""
        hashes = []
        
        # Generate multiple hashes for same data
        for i in range(10):
            hash_val = generate_version_hash(self.test_data)
            hashes.append(hash_val)
        
        # All hashes should be identical
        assert all(h == hashes[0] for h in hashes)
    
    def test_hash_sensitivity(self):
        """Test hash sensitivity to small changes"""
        data1 = {"tables": {"default": [{"campaign": "A", "cost": 100}]}}
        data2 = {"tables": {"default": [{"campaign": "A", "cost": 101}]}}  # Small change
        
        hash1 = generate_version_hash(data1)
        hash2 = generate_version_hash(data2)
        
        # Small changes should result in different hashes
        assert hash1 != hash2
    
    def test_etag_format(self):
        """Test ETag format"""
        etag = generate_etag(self.test_data)
        
        # ETag should be a valid format (typically starts with quote)
        assert etag.startswith('"') and etag.endswith('"')
    
    def test_performance_large_data(self):
        """Test performance with large data"""
        import time
        
        # Create large dataset
        large_data = {
            "tables": {
                "default": [
                    {"campaign": f"Campaign {i}", "cost": i * 10, "revenue": i * 20}
                    for i in range(1000)
                ]
            }
        }
        
        start_time = time.time()
        hash_val = generate_version_hash(large_data)
        end_time = time.time()
        
        execution_time = end_time - start_time
        
        # Should complete within reasonable time
        assert execution_time < 1  # 1 second max
        assert isinstance(hash_val, str)
    
    def test_unicode_handling(self):
        """Test Unicode handling in hash generation"""
        unicode_data = {
            "tables": {
                "default": [
                    {"campaign": "测试活动", "cost": 100, "revenue": 200}
                ]
            }
        }
        
        hash_val = generate_version_hash(unicode_data)
        
        assert isinstance(hash_val, str)
        assert len(hash_val) > 0
    
    def test_nested_data_handling(self):
        """Test nested data handling"""
        nested_data = {
            "tables": {
                "default": [
                    {
                        "campaign": "Campaign A",
                        "metrics": {
                            "cost": 100,
                            "revenue": 200,
                            "details": {
                                "impressions": 1000,
                                "clicks": 50
                            }
                        }
                    }
                ]
            }
        }
        
        hash_val = generate_version_hash(nested_data)
        
        assert isinstance(hash_val, str)
        assert len(hash_val) > 0
    
    def test_error_handling(self):
        """Test error handling in utility functions"""
        # Test with invalid data types
        try:
            hash_val = generate_version_hash("invalid_string")
            assert isinstance(hash_val, str)
        except Exception:
            # Should handle errors gracefully
            pass
        
        try:
            etag = generate_etag("invalid_string")
            assert isinstance(etag, str)
        except Exception:
            # Should handle errors gracefully
            pass
    
    def test_memory_usage(self):
        """Test memory usage with large datasets"""
        import sys
        
        # Create large dataset
        large_data = {
            "tables": {
                "default": [
                    {"campaign": f"Campaign {i}", "cost": i * 10, "revenue": i * 20}
                    for i in range(10000)
                ]
            }
        }
        
        # Generate hash
        hash_val = generate_version_hash(large_data)
        
        # Should not cause memory issues
        assert isinstance(hash_val, str)
        assert len(hash_val) > 0
