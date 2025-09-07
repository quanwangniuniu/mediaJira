"""
Basic test cases for retrospective app (no campaigns dependency)
"""
import pytest


@pytest.fixture
@pytest.mark.django_db
def test_user():
    """Create a test user"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )


class TestBasicRetrospective:
    """Basic tests that don't require campaigns app"""
    
    def test_retrospective_status_choices(self):
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
    
    def test_insight_severity_choices(self):
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
    
    @pytest.mark.django_db
    def test_insight_creation_without_retrospective(self, test_user):
        """Test creating insight without retrospective (should fail)"""
        from retrospective.models import Insight, InsightSeverity
        with pytest.raises(Exception):
            Insight.objects.create(
                title='Test Insight',
                description='Test description',
                severity=InsightSeverity.MEDIUM,
                created_by=test_user
            )
    
    @pytest.mark.django_db
    def test_insight_validation(self, test_user):
        """Test insight validation"""
        from retrospective.models import Insight, InsightSeverity
        # Test that title is required
        with pytest.raises(Exception):
            Insight.objects.create(
                description='Test description',
                severity=InsightSeverity.MEDIUM,
                created_by=test_user
            )


class TestInsightRules:
    """Test cases for InsightRules (no external dependencies)"""
    
    def test_roi_threshold_check(self):
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
    
    def test_ctr_threshold_check(self):
        """Test CTR threshold checking"""
        from retrospective.rules import InsightRules
        # Test low CTR
        result = InsightRules.check_ctr_threshold(0.003)
        assert result['triggered'] is True
        assert result['severity'] == 'medium'
        
        # Test good CTR
        result = InsightRules.check_ctr_threshold(0.008)
        assert result['triggered'] is False
    
    def test_get_all_rules(self):
        """Test getting all available rules"""
        from retrospective.rules import InsightRules
        rules = InsightRules.get_all_rules()
        
        assert isinstance(rules, dict)
        assert 'roi_poor' in rules
        assert 'roi_critical' in rules
        assert 'ctr_low' in rules
        assert 'cpc_high' in rules
    
    def test_get_rule_definition(self):
        """Test getting specific rule definition"""
        from retrospective.rules import InsightRules
        rule_def = InsightRules.get_rule_definition('roi_poor')
        
        assert rule_def is not None
        assert 'name' in rule_def
        assert 'description' in rule_def
        assert 'threshold' in rule_def
        assert 'severity' in rule_def


class TestModelChoices:
    """Test model choices and enums"""
    
    def test_retrospective_status_enum(self):
        """Test RetrospectiveStatus enum values"""
        from retrospective.models import RetrospectiveStatus
        assert RetrospectiveStatus.SCHEDULED == 'scheduled'
        assert RetrospectiveStatus.IN_PROGRESS == 'in_progress'
        assert RetrospectiveStatus.COMPLETED == 'completed'
        assert RetrospectiveStatus.REPORTED == 'reported'
        assert RetrospectiveStatus.CANCELLED == 'cancelled'
    
    def test_insight_severity_enum(self):
        """Test InsightSeverity enum values"""
        from retrospective.models import InsightSeverity
        assert InsightSeverity.LOW == 'low'
        assert InsightSeverity.MEDIUM == 'medium'
        assert InsightSeverity.HIGH == 'high'
        assert InsightSeverity.CRITICAL == 'critical'