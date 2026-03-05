"""
Test cases for retrospective API views
"""
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from retrospective.models import RetrospectiveTask, Insight, RetrospectiveStatus, InsightSeverity
from core.models import Project, Organization

User = get_user_model()


class RetrospectiveTaskViewSetTest(TestCase):
    """Test cases for RetrospectiveTaskViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a mock campaign using core.Project
        
        # Create organization first
        self.organization = Organization.objects.create(
            name='Test Organization',
            email_domain='test.com'
        )
        
        # Create campaign using Project model
        self.campaign = Project.objects.create(
            name='Test Campaign',
            organization=self.organization
        )
        
        # Create a retrospective task
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.SCHEDULED
        )

    def _retrospective_payload(self, campaign_id):
        return {
            'campaign': str(campaign_id),
            'decision': 'Scale budget toward best performing channel',
            'confidence_level': 4,
            'primary_assumption': 'Recent KPI lift will continue next sprint',
            'key_risk_ignore': 'Short-term auction volatility',
        }
    
    def test_list_retrospectives(self):
        """Test listing retrospectives"""
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_retrospective(self):
        """Test creating a retrospective"""
        
        # Create a second campaign for testing creation
        from core.models import Project
        
        second_campaign = Project.objects.create(
            name='Second Test Campaign',
            organization=self.organization
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-list')
        data = self._retrospective_payload(second_campaign.id)
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RetrospectiveTask.objects.count(), 2)  # Including the one from setUp

    def test_create_retrospective_requires_new_fields(self):
        """Test required decision fields on retrospective creation"""
        third_campaign = Project.objects.create(
            name='Third Test Campaign',
            organization=self.organization
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-list')
        response = self.client.post(url, {'campaign': str(third_campaign.id)})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('decision', response.data)
        self.assertIn('confidence_level', response.data)
        self.assertIn('primary_assumption', response.data)

    def test_create_retrospective_rejects_invalid_confidence_level(self):
        """Test confidence_level option validation on create"""
        fourth_campaign = Project.objects.create(
            name='Fourth Test Campaign',
            organization=self.organization
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-list')
        data = self._retrospective_payload(fourth_campaign.id)
        data['confidence_level'] = 6
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confidence_level', response.data)
    
    def test_create_retrospective_rejects_float_confidence_level(self):
        fifth_campaign = Project.objects.create(
            name='Fifth Test Campaign',
            organization=self.organization
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-list')
        data = {
            'campaign': str(fifth_campaign.id),
            'decision': 'Keep budget steady',
            'confidence_level': 3.5,
            'primary_assumption': 'Performance remains stable',
            'key_risk_ignore': '',
        }

        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confidence_level', response.data)
    
    def test_create_retrospective_rejects_string_confidence_level(self):
        fifth_campaign = Project.objects.create(
            name='Sixth Test Campaign',
            organization=self.organization
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-list')
        data = {
            'campaign': str(fifth_campaign.id),
            'decision': 'Keep budget steady',
            'confidence_level': 'high',
            'primary_assumption': 'Performance remains stable',
            'key_risk_ignore': '',
        }

        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('confidence_level', response.data)
    
    def test_retrieve_retrospective(self):
        """Test retrieving a retrospective"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-detail', args=[str(self.retrospective.id)])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.retrospective.id))
    
    def test_update_retrospective(self):
        """Test updating a retrospective"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-detail', args=[str(self.retrospective.id)])
        data = {
            'status': RetrospectiveStatus.IN_PROGRESS,
            'started_at': timezone.now().isoformat()
        }
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.retrospective.refresh_from_db()
        self.assertEqual(self.retrospective.status, RetrospectiveStatus.IN_PROGRESS)

    def test_update_retrospective_accepts_post_outcome_fields(self):
        """Test valid post-outcome update values via PATCH"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-detail', args=[str(self.retrospective.id)])
        data = {
            'outcome_compared_to_expectation': 'better',
            'biggest_wrong_assumption': 'Expected conversion lag to continue',
            'would_make_same_decision_again': 'yes',
        }
        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.retrospective.refresh_from_db()
        self.assertEqual(self.retrospective.outcome_compared_to_expectation, 'better')
        self.assertEqual(
            self.retrospective.biggest_wrong_assumption,
            'Expected conversion lag to continue',
        )
        self.assertEqual(self.retrospective.would_make_same_decision_again, 'yes')

    def test_update_retrospective_rejects_invalid_post_outcome_options(self):
        """Test invalid enum values for post-outcome fields via PATCH"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-detail', args=[str(self.retrospective.id)])
        data = {
            'outcome_compared_to_expectation': 'much_better',
            'would_make_same_decision_again': 'maybe',
        }
        response = self.client.patch(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('outcome_compared_to_expectation', response.data)
        self.assertIn('would_make_same_decision_again', response.data)

    def test_create_retrospective_rejects_update_only_post_outcome_fields(self):
        """Test post-outcome fields cannot be set during create"""
        extra_campaign = Project.objects.create(
            name='Update Only Field Campaign',
            organization=self.organization
        )
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-list')
        data = self._retrospective_payload(extra_campaign.id)
        data.update({
            'outcome_compared_to_expectation': 'better',
            'biggest_wrong_assumption': 'Assumption text',
            'would_make_same_decision_again': 'yes',
        })
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('outcome_compared_to_expectation', response.data)
        self.assertIn('biggest_wrong_assumption', response.data)
        self.assertIn('would_make_same_decision_again', response.data)

    def test_update_retrospective_post_outcome_fields_are_optional(self):
        """Test PATCH succeeds when only one post-outcome field is provided"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-detail', args=[str(self.retrospective.id)])
        response = self.client.patch(
            url,
            {'biggest_wrong_assumption': 'Assumed CPA would remain high'},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.retrospective.refresh_from_db()
        self.assertEqual(
            self.retrospective.biggest_wrong_assumption,
            'Assumed CPA would remain high',
        )
    
    def test_patch_with_no_fields(self):
        """Test PATCH succeeds when no fields are provided"""
        self.client.force_authenticate(user=self.user)

        url = reverse(
            "retrospective:retrospective-detail",
            args=[str(self.retrospective.id)]
        )

        response = self.client.patch(url, {})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    @patch('retrospective.views.generate_retrospective')
    def test_start_analysis(self, mock_generate_task):
        """Test starting retrospective analysis"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        # Mock the Celery task
        mock_task = MagicMock()
        mock_task.id = 'test-task-id'
        mock_generate_task.delay.return_value = mock_task
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-start-analysis', args=[str(self.retrospective.id)])
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('task_id', response.data)
        self.assertIn('retrospective_id', response.data)
    
    def test_retrospective_summary(self):
        """Test getting retrospective summary"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        # Create some insights for the retrospective
        Insight.objects.create(
            retrospective=self.retrospective,
            title='Test Insight',
            description='Test insight description',
            severity=InsightSeverity.MEDIUM,
            created_by=self.user
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-summary', args=[str(self.retrospective.id)])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('retrospective_id', response.data)
        self.assertIn('insights_summary', response.data)
    
    def test_my_retrospectives(self):
        """Test getting user's retrospectives"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:retrospective-my-retrospectives')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_unauthorized_access(self):
        """Test unauthorized access"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        url = reverse('retrospective:retrospective-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class InsightViewSetTest(TestCase):
    """Test cases for InsightViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a mock campaign and retrospective using core.Project
        from core.models import Project, Organization
        
        # Create organization first
        self.organization = Organization.objects.create(
            name='Test Organization',
            email_domain='test.com'
        )
        
        # Create campaign using Project model
        self.campaign = Project.objects.create(
            name='Test Campaign',
            organization=self.organization
        )
        
        self.retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.IN_PROGRESS
        )
        
        # Create an insight
        self.insight = Insight.objects.create(
            retrospective=self.retrospective,
            title='Test Insight',
            description='Test insight description',
            severity=InsightSeverity.MEDIUM,
            created_by=self.user
        )
    
    def test_list_insights(self):
        """Test listing insights"""
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:insight-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_create_insight(self):
        """Test creating an insight"""
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:insight-list')
        data = {
            'retrospective_id': str(self.retrospective.id),
            'title': 'New Insight',
            'description': 'New insight description',
            'severity': InsightSeverity.CRITICAL
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Insight.objects.count(), 2)  # Including the one from setUp
    
    def test_retrieve_insight(self):
        """Test retrieving an insight"""
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:insight-detail', args=[str(self.insight.id)])
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], str(self.insight.id))
    
    def test_update_insight(self):
        """Test updating an insight"""
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:insight-detail', args=[str(self.insight.id)])
        data = {
            'title': 'Updated Insight',
            'description': 'Updated insight description'
        }
        response = self.client.patch(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.insight.refresh_from_db()
        self.assertEqual(self.insight.title, 'Updated Insight')
    
    @patch('retrospective.views.generate_insights_for_retrospective')
    def test_generate_insights(self, mock_generate_task):
        """Test generating insights"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        # Mock the Celery task
        mock_task = MagicMock()
        mock_task.id = 'test-insight-task-id'
        mock_generate_task.delay.return_value = mock_task
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:insight-generate-insights')
        data = {
            'retrospective_id': str(self.retrospective.id),
            'regenerate': False
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('task_id', response.data)
        self.assertIn('retrospective_id', response.data)
    
    def test_insights_by_retrospective(self):
        """Test getting insights by retrospective"""
        if not self.insight:
            self.skipTest("Insight model not available")
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:insight-by-retrospective')
        response = self.client.get(url, {'retrospective_id': str(self.retrospective.id)})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
    
    def test_insights_by_severity(self):
        """Test getting insights grouped by severity"""
        if not self.insight:
            self.skipTest("Insight model not available")
        
        # Create another insight with different severity
        Insight.objects.create(
            retrospective=self.retrospective,
            title='Critical Insight',
            description='Critical insight description',
            severity=InsightSeverity.CRITICAL,
            created_by=self.user
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:insight-by-severity')
        response = self.client.get(url, {'retrospective_id': str(self.retrospective.id)})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('medium', response.data)
        self.assertIn('critical', response.data)
    
    def test_insight_validation(self):
        """Test insight validation"""
        if not self.retrospective:
            self.skipTest("Retrospective model not available")
        
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:insight-list')
        data = {
            'title': '',  # Empty title should fail
            'description': 'Test description',
            'severity': InsightSeverity.MEDIUM
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RuleEngineViewSetTest(TestCase):
    """Test cases for RuleEngineViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_get_rules(self):
        """Test getting all rules"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:rule-rules')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('roi_poor', response.data)
        self.assertIn('roi_critical', response.data)
        self.assertIn('ctr_low', response.data)
    
    def test_get_rule_definition(self):
        """Test getting specific rule definition"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:rule-rule-definition')
        response = self.client.get(url, {'rule_id': 'roi_poor'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('name', response.data)
        self.assertIn('description', response.data)
        self.assertIn('threshold', response.data)
    
    def test_get_nonexistent_rule(self):
        """Test getting non-existent rule"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:rule-rule-definition')
        response = self.client.get(url, {'rule_id': 'nonexistent_rule'})
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_test_rule(self):
        """Test testing a rule with KPI value"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:rule-test-rule')
        data = {
            'rule_id': 'roi_poor',
            'kpi_value': 0.65
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('triggered', response.data)
        self.assertIn('severity', response.data)
    
    def test_test_rule_invalid_data(self):
        """Test testing a rule with invalid data"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:rule-test-rule')
        data = {
            'rule_id': 'roi_poor',
            'kpi_value': 'invalid_value'  # Should be a number
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_test_rule_missing_data(self):
        """Test testing a rule with missing data"""
        self.client.force_authenticate(user=self.user)
        url = reverse('retrospective:rule-test-rule')
        data = {
            'rule_id': 'roi_poor'
            # Missing kpi_value
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class APIIntegrationTest(TestCase):
    """Integration tests for API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        # Create a mock campaign using core.Project
        
        # Create organization first
        self.organization = Organization.objects.create(
            name='Test Organization',
            email_domain='test.com'
        )
        
        # Create campaign using Project model
        self.campaign = Project.objects.create(
            name='Integration Test Campaign',
            organization=self.organization
        )
    
    @patch('retrospective.views.generate_retrospective')
    @patch('retrospective.views.generate_insights_for_retrospective')
    def test_complete_retrospective_workflow(self, mock_insight_task, mock_generate_task):
        """Test complete retrospective workflow through API"""
        
        # Mock the Celery tasks
        mock_generate_task_obj = MagicMock()
        mock_generate_task_obj.id = 'test-generate-task-id'
        mock_generate_task.delay.return_value = mock_generate_task_obj
        
        mock_insight_task_obj = MagicMock()
        mock_insight_task_obj.id = 'test-insight-task-id'
        mock_insight_task.delay.return_value = mock_insight_task_obj
        
        self.client.force_authenticate(user=self.user)
        
        # 1. Create retrospective
        url = reverse('retrospective:retrospective-list')
        data = {
            'campaign': str(self.campaign.id),
            'decision': 'Keep the current creative mix',
            'confidence_level': 3,
            'primary_assumption': 'Current conversion trend remains stable',
            'key_risk_ignore': '',
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        retrospective_id = response.data['id']
        
        # 2. Start analysis
        url = reverse('retrospective:retrospective-start-analysis', args=[retrospective_id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 3. Generate insights
        url = reverse('retrospective:insight-generate-insights')
        data = {
            'retrospective_id': retrospective_id,
            'regenerate': False
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 4. Get insights
        url = reverse('retrospective:insight-by-retrospective')
        response = self.client.get(url, {'retrospective_id': retrospective_id})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Get summary
        url = reverse('retrospective:retrospective-summary', args=[retrospective_id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_insight_creation_and_management(self):
        """Test insight creation and management through API"""
        
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.user,
            status=RetrospectiveStatus.IN_PROGRESS
        )
        
        self.client.force_authenticate(user=self.user)
        
        # Create insight
        url = reverse('retrospective:insight-list')
        data = {
            'retrospective_id': str(retrospective.id),
            'title': 'API Test Insight',
            'description': 'Insight created via API',
            'severity': InsightSeverity.MEDIUM
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        insight_id = response.data['id']
        
        # Update insight
        url = reverse('retrospective:insight-detail', args=[insight_id])
        data = {
            'title': 'Updated API Test Insight',
            'description': 'Updated insight description'
        }
        response = self.client.patch(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Get insight
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated API Test Insight')
    
    def test_rule_engine_integration(self):
        """Test rule engine integration through API"""
        self.client.force_authenticate(user=self.user)
        
        # Get all rules
        url = reverse('retrospective:rule-rules')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Test specific rule
        url = reverse('retrospective:rule-test-rule')
        data = {
            'rule_id': 'roi_poor',
            'kpi_value': 0.65
        }
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['triggered'])
        
        # Test rule definition
        url = reverse('retrospective:rule-rule-definition')
        response = self.client.get(url, {'rule_id': 'roi_poor'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('name', response.data) 