from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from decimal import Decimal
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from campaigns.models import (
    Campaign, CampaignAssignment, CampaignMetric, CampaignNote,
    CampaignStatus, CampaignType
)


class CampaignViewSetTest(APITestCase):
    """
    Test cases for CampaignViewSet
    
    Tests all CRUD operations and custom actions
    """
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            description='A test campaign for API testing',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.DRAFT,
            budget=Decimal('10000.00'),
            spent_amount=Decimal('5000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
        
        self.campaign_url = reverse('campaign-list')
        self.campaign_detail_url = reverse('campaign-detail', args=[self.campaign.id])
    
    def test_list_campaigns(self):
        """Test listing campaigns"""
        response = self.client.get(self.campaign_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Test Campaign')
    
    def test_retrieve_campaign(self):
        """Test retrieving a single campaign"""
        response = self.client.get(self.campaign_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Campaign')
        self.assertEqual(response.data['status'], CampaignStatus.DRAFT)
        self.assertEqual(response.data['budget_utilization'], 50.0)
    
    def test_create_campaign(self):
        """Test creating a new campaign"""
        data = {
            'name': 'New Campaign',
            'description': 'A new test campaign',
            'campaign_type': CampaignType.SOCIAL_MEDIA,
            'budget': '15000.00',
            'start_date': (timezone.now() + timedelta(days=1)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=30)).isoformat(),
            'tags': ['test', 'social']
        }
        
        response = self.client.post(self.campaign_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Campaign')
        self.assertEqual(response.data['owner']['username'], 'testuser')
        
        # Check that campaign was created in database
        campaign = Campaign.objects.get(name='New Campaign')
        self.assertEqual(campaign.owner, self.user)
        self.assertEqual(campaign.budget, Decimal('15000.00'))
        
        # Check that owner assignment was created
        assignment = CampaignAssignment.objects.get(campaign=campaign, user=self.user)
        self.assertEqual(assignment.role, 'owner')
    
    def test_create_campaign_invalid_data(self):
        """Test creating campaign with invalid data"""
        data = {
            'name': 'Invalid Campaign',
            'budget': '15000.00',
            'start_date': (timezone.now() + timedelta(days=30)).isoformat(),
            'end_date': (timezone.now() + timedelta(days=1)).isoformat(),  # End before start
        }
        
        response = self.client.post(self.campaign_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('end_date', response.data)
    
    def test_update_campaign(self):
        """Test updating a campaign"""
        data = {
            'name': 'Updated Campaign',
            'description': 'Updated description',
            'budget': '20000.00'
        }
        
        response = self.client.patch(self.campaign_detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Campaign')
        self.assertEqual(response.data['budget'], '20000.00')
        
        # Check database was updated
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.name, 'Updated Campaign')
        self.assertEqual(self.campaign.budget, Decimal('20000.00'))
    
    def test_delete_campaign(self):
        """Test deleting a campaign"""
        response = self.client.delete(self.campaign_detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check campaign was deleted
        self.assertFalse(Campaign.objects.filter(id=self.campaign.id).exists())
    
    def test_update_status_action(self):
        """Test custom update_status action"""
        url = reverse('campaign-update-status', args=[self.campaign.id])
        data = {
            'status': CampaignStatus.ACTIVE,
            'reason': 'Starting the campaign'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], CampaignStatus.ACTIVE)
        
        # Check database was updated
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.status, CampaignStatus.ACTIVE)
        
        # Check that note was created
        note = CampaignNote.objects.filter(campaign=self.campaign).first()
        self.assertIsNotNone(note)
        self.assertIn('Status changed to active', note.content)
    
    def test_update_status_invalid_transition(self):
        """Test invalid status transition"""
        url = reverse('campaign-update-status', args=[self.campaign.id])
        data = {'status': CampaignStatus.PAUSED}  # Cannot transition from DRAFT to PAUSED
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', response.data)
    
    def test_metrics_summary_action(self):
        """Test metrics_summary action"""
        # Create some metrics for the campaign
        CampaignMetric.objects.create(
            campaign=self.campaign,
            impressions=1000,
            clicks=100,
            conversions=10,
            cost_per_click=Decimal('2.50'),
            cost_per_impression=Decimal('0.25'),
            cost_per_conversion=Decimal('25.00')
        )
        
        CampaignMetric.objects.create(
            campaign=self.campaign,
            impressions=500,
            clicks=50,
            conversions=5,
            cost_per_click=Decimal('3.00'),
            cost_per_impression=Decimal('0.30'),
            cost_per_conversion=Decimal('30.00')
        )
        
        url = reverse('campaign-metrics-summary', args=[self.campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data['total_impressions'], 1500)
        self.assertEqual(data['total_clicks'], 150)
        self.assertEqual(data['total_conversions'], 15)
        self.assertEqual(data['total_spent'], '5000.00')
    
    def test_metrics_summary_no_metrics(self):
        """Test metrics_summary with no metrics"""
        url = reverse('campaign-metrics-summary', args=[self.campaign.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data['total_impressions'], 0)
        self.assertEqual(data['total_clicks'], 0)
        self.assertEqual(data['total_conversions'], 0)
        self.assertEqual(data['total_spent'], '5000.00')  # From campaign spent_amount
    
    def test_dashboard_stats_action(self):
        """Test dashboard_stats action"""
        # Create additional campaigns for testing
        Campaign.objects.create(
            name='Active Campaign',
            campaign_type=CampaignType.SOCIAL_MEDIA,
            status=CampaignStatus.ACTIVE,
            budget=Decimal('5000.00'),
            spent_amount=Decimal('2000.00'),
            start_date=timezone.now() - timedelta(days=1),
            end_date=timezone.now() + timedelta(days=5),  # Ending soon
            owner=self.user
        )
        
        Campaign.objects.create(
            name='Over Budget Campaign',
            campaign_type=CampaignType.SEARCH_ENGINE,
            status=CampaignStatus.ACTIVE,
            budget=Decimal('1000.00'),
            spent_amount=Decimal('1500.00'),  # Over budget
            start_date=timezone.now() - timedelta(days=10),
            end_date=timezone.now() + timedelta(days=20),
            owner=self.user
        )
        
        url = reverse('campaign-dashboard-stats')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.data
        self.assertEqual(data['total_campaigns'], 3)
        self.assertEqual(data['active_campaigns'], 2)
        self.assertEqual(data['draft_campaigns'], 1)
        self.assertEqual(data['over_budget'], 1)
        self.assertEqual(data['soon_ending'], 1)
    
    def test_filter_campaigns_by_status(self):
        """Test filtering campaigns by status"""
        # Create campaigns with different statuses
        Campaign.objects.create(
            name='Active Campaign',
            campaign_type=CampaignType.SOCIAL_MEDIA,
            status=CampaignStatus.ACTIVE,
            budget=Decimal('5000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
        
        url = f"{self.campaign_url}?status=active"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Active Campaign')
    
    def test_search_campaigns(self):
        """Test searching campaigns"""
        url = f"{self.campaign_url}?search=test"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Test Campaign')
    
    def test_ordering_campaigns(self):
        """Test ordering campaigns"""
        Campaign.objects.create(
            name='Another Campaign',
            campaign_type=CampaignType.SOCIAL_MEDIA,
            status=CampaignStatus.DRAFT,
            budget=Decimal('5000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
        
        url = f"{self.campaign_url}?ordering=name"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['name'], 'Another Campaign')
        self.assertEqual(response.data['results'][1]['name'], 'Test Campaign')
    
    def test_unauthorized_access(self):
        """Test unauthorized access to campaigns"""
        self.client.force_authenticate(user=None)
        
        response = self.client.get(self.campaign_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_permissions(self):
        """Test user can only see their own campaigns"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        # Create campaign for other user
        Campaign.objects.create(
            name='Other User Campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.DRAFT,
            budget=Decimal('5000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=other_user
        )
        
        # Current user should only see their own campaign
        response = self.client.get(self.campaign_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['name'], 'Test Campaign')


class CampaignAssignmentViewSetTest(APITestCase):
    """Test cases for CampaignAssignmentViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.DRAFT,
            budget=Decimal('10000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
        
        self.assignment = CampaignAssignment.objects.create(
            campaign=self.campaign,
            user=self.user,
            role='manager'
        )
        
        self.assignment_url = reverse('assignment-list')
        self.assignment_detail_url = reverse('assignment-detail', args=[self.assignment.id])
    
    def test_list_assignments(self):
        """Test listing assignments"""
        response = self.client.get(self.assignment_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['role'], 'manager')
    
    def test_create_assignment(self):
        """Test creating a new assignment"""
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        
        data = {
            'campaign': self.campaign.id,
            'user_id': other_user.id,
            'role': 'analyst'
        }
        
        response = self.client.post(self.assignment_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['role'], 'analyst')
        
        # Check assignment was created
        assignment = CampaignAssignment.objects.get(user=other_user, campaign=self.campaign)
        self.assertEqual(assignment.role, 'analyst')
    
    def test_update_assignment(self):
        """Test updating an assignment"""
        data = {'role': 'viewer'}
        response = self.client.patch(self.assignment_detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['role'], 'viewer')
        
        # Check database was updated
        self.assignment.refresh_from_db()
        self.assertEqual(self.assignment.role, 'viewer')


class CampaignMetricViewSetTest(APITestCase):
    """Test cases for CampaignMetricViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.ACTIVE,
            budget=Decimal('10000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
        
        self.metric = CampaignMetric.objects.create(
            campaign=self.campaign,
            impressions=1000,
            clicks=100,
            conversions=10,
            cost_per_click=Decimal('2.50'),
            cost_per_impression=Decimal('0.25'),
            cost_per_conversion=Decimal('25.00')
        )
        
        self.metric_url = reverse('metric-list')
        self.metric_detail_url = reverse('metric-detail', args=[self.metric.id])
    
    def test_list_metrics(self):
        """Test listing metrics"""
        response = self.client.get(self.metric_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['impressions'], 1000)
    
    def test_create_metric(self):
        """Test creating a new metric"""
        data = {
            'campaign': self.campaign.id,
            'impressions': 500,
            'clicks': 50,
            'conversions': 5,
            'cost_per_click': '3.00',
            'cost_per_impression': '0.30',
            'cost_per_conversion': '30.00'
        }
        
        response = self.client.post(self.metric_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['impressions'], 500)
        self.assertEqual(response.data['clicks'], 50)
        
        # Check metric was created
        metric = CampaignMetric.objects.get(impressions=500)
        self.assertEqual(metric.campaign, self.campaign)
        self.assertEqual(metric.cost_per_click, Decimal('3.00'))
    
    def test_create_metric_invalid_data(self):
        """Test creating metric with invalid data"""
        data = {
            'campaign': self.campaign.id,
            'impressions': 100,
            'clicks': 200,  # More clicks than impressions
            'conversions': 50,
            'cost_per_click': '2.50'
        }
        
        response = self.client.post(self.metric_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('clicks', response.data)
    
    def test_update_metric(self):
        """Test updating a metric"""
        data = {
            'impressions': 1500,
            'clicks': 150,
            'conversions': 15
        }
        
        response = self.client.patch(self.metric_detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['impressions'], 1500)
        self.assertEqual(response.data['clicks'], 150)
        
        # Check database was updated
        self.metric.refresh_from_db()
        self.assertEqual(self.metric.impressions, 1500)
        self.assertEqual(self.metric.clicks, 150)


class CampaignNoteViewSetTest(APITestCase):
    """Test cases for CampaignNoteViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.campaign = Campaign.objects.create(
            name='Test Campaign',
            campaign_type=CampaignType.DIGITAL_DISPLAY,
            status=CampaignStatus.DRAFT,
            budget=Decimal('10000.00'),
            start_date=timezone.now() + timedelta(days=1),
            end_date=timezone.now() + timedelta(days=30),
            owner=self.user
        )
        
        self.note = CampaignNote.objects.create(
            campaign=self.campaign,
            author=self.user,
            title='Test Note',
            content='This is a test note.',
            is_private=False
        )
        
        self.note_url = reverse('note-list')
        self.note_detail_url = reverse('note-detail', args=[self.note.id])
    
    def test_list_notes(self):
        """Test listing notes"""
        response = self.client.get(self.note_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Note')
    
    def test_create_note(self):
        """Test creating a new note"""
        data = {
            'campaign': self.campaign.id,
            'title': 'New Note',
            'content': 'This is a new note.',
            'is_private': True
        }
        
        response = self.client.post(self.note_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Note')
        self.assertEqual(response.data['content'], 'This is a new note.')
        self.assertTrue(response.data['is_private'])
        self.assertEqual(response.data['author']['username'], 'testuser')
        
        # Check note was created
        note = CampaignNote.objects.get(title='New Note')
        self.assertEqual(note.campaign, self.campaign)
        self.assertEqual(note.author, self.user)
        self.assertTrue(note.is_private)
    
    def test_update_note(self):
        """Test updating a note"""
        data = {
            'title': 'Updated Note',
            'content': 'This is an updated note.',
            'is_private': True
        }
        
        response = self.client.patch(self.note_detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Note')
        self.assertEqual(response.data['content'], 'This is an updated note.')
        self.assertTrue(response.data['is_private'])
        
        # Check database was updated
        self.note.refresh_from_db()
        self.assertEqual(self.note.title, 'Updated Note')
        self.assertEqual(self.note.content, 'This is an updated note.')
        self.assertTrue(self.note.is_private)
    
    def test_delete_note(self):
        """Test deleting a note"""
        response = self.client.delete(self.note_detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Check note was deleted
        self.assertFalse(CampaignNote.objects.filter(id=self.note.id).exists())
    
    def test_filter_notes_by_privacy(self):
        """Test filtering notes by privacy"""
        # Create a private note
        CampaignNote.objects.create(
            campaign=self.campaign,
            author=self.user,
            title='Private Note',
            content='This is a private note.',
            is_private=True
        )
        
        url = f"{self.note_url}?is_private=true"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Private Note') 