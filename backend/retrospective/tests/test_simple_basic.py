"""
Simple basic test cases for retrospective app (no Django model imports at module level)
"""
import pytest


def test_retrospective_status_choices():
    """Test retrospective status choices"""
    from retrospective.models import RetrospectiveStatus
    choices = RetrospectiveStatus.choices
    assert isinstance(choices, list)
    assert len(choices) > 0
    
    # Check that all statuses are valid
    status_values = [choice[0] for choice in choices]
    assert 'scheduled' in status_values
    assert 'in_progress' in status_values
    assert 'completed' in status_values
    assert 'reported' in status_values
    assert 'cancelled' in status_values


def test_insight_severity_choices():
    """Test insight severity choices"""
    from retrospective.models import InsightSeverity
    choices = InsightSeverity.choices
    assert isinstance(choices, list)
    assert len(choices) > 0
    
    # Check that all severities are valid
    severity_values = [choice[0] for choice in choices]
    assert 'low' in severity_values
    assert 'medium' in severity_values
    assert 'high' in severity_values
    assert 'critical' in severity_values


def test_roi_threshold_check():
    """Test ROI threshold checking"""
    from retrospective.rules import InsightRules
    # Test poor ROI
    result = InsightRules.check_roi_threshold(0.65)
    assert result['triggered'] is True
    assert result['severity'] == 'high'
    
    # Test critical ROI
    result = InsightRules.check_roi_threshold(0.45)
    assert result['triggered'] is True
    assert result['severity'] == 'critical'
    
    # Test good ROI
    result = InsightRules.check_roi_threshold(0.85)
    assert result['triggered'] is False


def test_ctr_threshold_check():
    """Test CTR threshold checking"""
    from retrospective.rules import InsightRules
    # Test low CTR
    result = InsightRules.check_ctr_threshold(0.003)
    assert result['triggered'] is True
    assert result['severity'] == 'medium'
    
    # Test good CTR
    result = InsightRules.check_ctr_threshold(0.008)
    assert result['triggered'] is False


def test_get_all_rules():
    """Test getting all available rules"""
    from retrospective.rules import InsightRules
    rules = InsightRules.get_all_rules()
    
    assert isinstance(rules, dict)
    assert 'roi_poor' in rules
    assert 'roi_critical' in rules
    assert 'ctr_low' in rules
    assert 'cpc_high' in rules


def test_get_rule_definition():
    """Test getting specific rule definition"""
    from retrospective.rules import InsightRules
    rule_def = InsightRules.get_rule_definition('roi_poor')
    
    assert rule_def is not None
    assert 'name' in rule_def
    assert 'description' in rule_def
    assert 'threshold' in rule_def
    assert 'severity' in rule_def


def test_retrospective_status_enum():
    """Test RetrospectiveStatus enum values"""
    from retrospective.models import RetrospectiveStatus
    assert RetrospectiveStatus.SCHEDULED == 'scheduled'
    assert RetrospectiveStatus.IN_PROGRESS == 'in_progress'
    assert RetrospectiveStatus.COMPLETED == 'completed'
    assert RetrospectiveStatus.REPORTED == 'reported'
    assert RetrospectiveStatus.CANCELLED == 'cancelled'


def test_insight_severity_enum():
    """Test InsightSeverity enum values"""
    from retrospective.models import InsightSeverity
    assert InsightSeverity.LOW == 'low'
    assert InsightSeverity.MEDIUM == 'medium'
    assert InsightSeverity.HIGH == 'high'
    assert InsightSeverity.CRITICAL == 'critical'
