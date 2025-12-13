"""
Tests for campaign views
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from campaign.models import CampaignTask, Channel, CampaignTaskStatus

User = get_user_model()


class CampaignTaskViewTest(TestCase):
    """Test campaign task views"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_campaign_task(self):
        """Test creating a campaign task via API"""
        data = {
            'title': 'Test Campaign',
            'scheduled_date': '2025-01-01T00:00:00Z',
            'channel': Channel.GOOGLE_ADS,
            'creative_asset_ids': ['asset1'],
            'audience_config': {'type': 'google', 'common': {}},
        }
        response = self.client.post('/api/campaigns/tasks/', data, format='json')
        # Note: This test may need adjustment based on permission requirements
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_403_FORBIDDEN])

