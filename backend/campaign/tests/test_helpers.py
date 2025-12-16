"""
Test helper functions for campaign execution
Extracted metrics calculation tests from test_tasks.py
"""
import pytest
from campaign.tasks import _calculate_metrics_from_stats, _check_threshold
from campaign.models import Comparator


class TestMetricsCalculation:
    """Test metrics calculation helper functions"""
    
    def test_calculate_metrics_from_stats(self):
        """Test calculating metrics from raw stats"""
        stats = {
            'impressions': 10000,
            'clicks': 100,
            'cost': 100.0,
            'revenue': 200.0,
            'conversions': 10
        }
        
        metrics = _calculate_metrics_from_stats(stats)
        
        # Check calculated metrics
        assert 'ctr' in metrics
        assert abs(metrics['ctr'] - 1.0) < 0.01  # 100/10000 * 100 = 1.0%
        
        assert 'cpc' in metrics
        assert abs(metrics['cpc'] - 1.0) < 0.01  # 100/100 = 1.0
        
        assert 'cpa' in metrics
        assert abs(metrics['cpa'] - 10.0) < 0.01  # 100/10 = 10.0
        
        assert 'roas' in metrics
        assert abs(metrics['roas'] - 2.0) < 0.01  # 200/100 = 2.0
        
        assert 'roi' in metrics
        assert abs(metrics['roi'] - 1.0) < 0.01  # (200-100)/100 = 1.0
    
    def test_calculate_metrics_mock_data(self):
        """Test calculating metrics with mock data (no revenue)"""
        stats = {
            'impressions': 1000,
            'clicks': 50,
            'cost': 50.0,
            # No revenue
        }
        
        metrics = _calculate_metrics_from_stats(stats)
        
        # Should calculate CTR and CPC
        assert 'ctr' in metrics
        assert 'cpc' in metrics
        
        # Should have mock ROAS/ROI (2x)
        assert 'roas' in metrics
        assert abs(metrics['roas'] - 2.0) < 0.01
        assert 'roi' in metrics
        assert abs(metrics['roi'] - 1.0) < 0.01
    
    def test_calculate_metrics_alternative_field_names(self):
        """Test calculating metrics with alternative field names"""
        stats = {
            'impression': 5000,  # Alternative name
            'click': 50,  # Alternative name
            'spend': 50.0,  # Alternative name
            'value': 100.0,  # Alternative name for revenue
            'conversion': 5  # Alternative name
        }
        
        metrics = _calculate_metrics_from_stats(stats)
        
        assert 'ctr' in metrics
        assert 'cpc' in metrics
        assert 'cpa' in metrics
        assert 'roas' in metrics
        assert 'roi' in metrics
    
    def test_calculate_metrics_zero_impressions(self):
        """Test calculating metrics with zero impressions"""
        stats = {
            'impressions': 0,
            'clicks': 0,
            'cost': 0.0
        }
        
        metrics = _calculate_metrics_from_stats(stats)
        
        # Should not have CTR (division by zero)
        assert 'ctr' not in metrics or metrics.get('ctr') == 0
        # When cost is 0, ROAS/ROI may not be calculated
        # Check that function doesn't crash
        assert isinstance(metrics, dict)


class TestThresholdChecking:
    """Test threshold checking with different comparators"""
    
    def test_check_threshold_less_than(self):
        """Test less than comparator"""
        assert _check_threshold(1.5, Comparator.LT, 2.0) is True
        assert _check_threshold(2.5, Comparator.LT, 2.0) is False
        assert _check_threshold(2.0, Comparator.LT, 2.0) is False
    
    def test_check_threshold_less_than_or_equal(self):
        """Test less than or equal comparator"""
        assert _check_threshold(2.0, Comparator.LTE, 2.0) is True
        assert _check_threshold(1.5, Comparator.LTE, 2.0) is True
        assert _check_threshold(2.5, Comparator.LTE, 2.0) is False
    
    def test_check_threshold_greater_than(self):
        """Test greater than comparator"""
        assert _check_threshold(2.5, Comparator.GT, 2.0) is True
        assert _check_threshold(1.5, Comparator.GT, 2.0) is False
        assert _check_threshold(2.0, Comparator.GT, 2.0) is False
    
    def test_check_threshold_greater_than_or_equal(self):
        """Test greater than or equal comparator"""
        assert _check_threshold(2.0, Comparator.GTE, 2.0) is True
        assert _check_threshold(2.5, Comparator.GTE, 2.0) is True
        assert _check_threshold(1.5, Comparator.GTE, 2.0) is False
    
    def test_check_threshold_equal(self):
        """Test equal comparator (with epsilon for float comparison)"""
        assert _check_threshold(2.0, Comparator.EQ, 2.0) is True
        assert _check_threshold(2.000001, Comparator.EQ, 2.0) is True  # Within epsilon
        assert _check_threshold(2.01, Comparator.EQ, 2.0) is False
        assert _check_threshold(1.99, Comparator.EQ, 2.0) is False
    
    def test_check_threshold_edge_cases(self):
        """Test threshold checking with edge cases"""
        # Zero threshold
        assert _check_threshold(0.0, Comparator.EQ, 0.0) is True
        assert _check_threshold(0.1, Comparator.GT, 0.0) is True
        
        # Negative values
        assert _check_threshold(-1.0, Comparator.LT, 0.0) is True
        assert _check_threshold(-1.0, Comparator.GT, -2.0) is True
        
        # Large values
        assert _check_threshold(1000.0, Comparator.LT, 2000.0) is True
        assert _check_threshold(1000.0, Comparator.GT, 500.0) is True

