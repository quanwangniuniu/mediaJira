"""
Basic test cases for retrospective app (no campaigns dependency)
"""
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from retrospective.models import (
    RetrospectiveTask, Insight, 
    RetrospectiveStatus, InsightSeverity
)
from retrospective.rules import InsightRules

User = get_user_model()


class BasicRetrospectiveTest(TestCase):
    """Basic tests that don't require campaigns app"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_retrospective_status_choices(self):
        """Test retrospective status choices"""
        choices = RetrospectiveStatus.choices
        self.assertIsInstance(choices, list)
        self.assertGreater(len(choices), 0)
        
        # Check that all statuses are valid
        status_values = [choice[0] for choice in choices]
        self.assertIn('scheduled', status_values)
        self.assertIn('in_progress', status_values)
        self.assertIn('completed', status_values)
        self.assertIn('reported', status_values)
        self.assertIn('cancelled', status_values)
    
    def test_insight_severity_choices(self):
        """Test insight severity choices"""
        choices = InsightSeverity.choices
        self.assertIsInstance(choices, list)
        self.assertGreater(len(choices), 0)
        
        # Check that all severities are valid
        severity_values = [choice[0] for choice in choices]
        self.assertIn('low', severity_values)
        self.assertIn('medium', severity_values)
        self.assertIn('high', severity_values)
        self.assertIn('critical', severity_values)
    
    def test_insight_creation_without_retrospective(self):
        """Test creating insight without retrospective (should fail)"""
        with self.assertRaises(Exception):
            Insight.objects.create(
                title='Test Insight',
                description='Test description',
                severity=InsightSeverity.MEDIUM,
                created_by=self.user
            )
    
    def test_insight_validation(self):
        """Test insight validation"""
        # Test that title is required
        with self.assertRaises(Exception):
            Insight.objects.create(
                description='Test description',
                severity=InsightSeverity.MEDIUM,
                created_by=self.user
            )


class InsightRulesTest(TestCase):
    """Test cases for InsightRules (no external dependencies)"""
    
    def test_roi_threshold_check(self):
        """Test ROI threshold checking"""
        # Test poor ROI
        result = InsightRules.check_roi_threshold(0.65)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'high')
        
        # Test critical ROI
        result = InsightRules.check_roi_threshold(0.45)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'critical')
        
        # Test good ROI
        result = InsightRules.check_roi_threshold(0.85)
        self.assertFalse(result['triggered'])
    
    def test_ctr_threshold_check(self):
        """Test CTR threshold checking"""
        # Test low CTR
        result = InsightRules.check_ctr_threshold(0.003)
        self.assertTrue(result['triggered'])
        self.assertEqual(result['severity'], 'medium')
        
        # Test good CTR
        result = InsightRules.check_ctr_threshold(0.008)
        self.assertFalse(result['triggered'])
    
    def test_get_all_rules(self):
        """Test getting all available rules"""
        rules = InsightRules.get_all_rules()
        
        self.assertIsInstance(rules, dict)
        self.assertIn('roi_poor', rules)
        self.assertIn('roi_critical', rules)
        self.assertIn('ctr_low', rules)
        self.assertIn('cpc_high', rules)
    
    def test_get_rule_definition(self):
        """Test getting specific rule definition"""
        rule_def = InsightRules.get_rule_definition('roi_poor')
        
        self.assertIsNotNone(rule_def)
        self.assertIn('name', rule_def)
        self.assertIn('description', rule_def)
        self.assertIn('threshold', rule_def)
        self.assertIn('severity', rule_def)


class ModelChoicesTest(TestCase):
    """Test model choices and enums"""
    
    def test_retrospective_status_enum(self):
        """Test RetrospectiveStatus enum values"""
        self.assertEqual(RetrospectiveStatus.SCHEDULED, 'scheduled')
        self.assertEqual(RetrospectiveStatus.IN_PROGRESS, 'in_progress')
        self.assertEqual(RetrospectiveStatus.COMPLETED, 'completed')
        self.assertEqual(RetrospectiveStatus.REPORTED, 'reported')
        self.assertEqual(RetrospectiveStatus.CANCELLED, 'cancelled')
    
    def test_insight_severity_enum(self):
        """Test InsightSeverity enum values"""
        self.assertEqual(InsightSeverity.LOW, 'low')
        self.assertEqual(InsightSeverity.MEDIUM, 'medium')
        self.assertEqual(InsightSeverity.HIGH, 'high')
        self.assertEqual(InsightSeverity.CRITICAL, 'critical') 