import pytest
import json
from unittest.mock import Mock, patch, AsyncMock
from django.test import TestCase
from django.contrib.auth.models import User
from channels.testing import WebsocketCommunicator
from ..consumers import CampaignExecutionConsumer, CampaignListConsumer
from ..models import CampaignTask


class CampaignExecutionConsumerTest(TestCase):
    """Test cases for CampaignExecutionConsumer."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        # Mock team object
        self.user.team = type('Team', (), {'id': 1, 'name': 'Test Team'})()
        
        self.campaign = CampaignTask.objects.create(
            title='Test Campaign',
            scheduled_date='2024-12-31 10:00:00',
            channel='google',
            created_by=self.user
        )
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_connect_success(self, mock_db_sync):
        """Test successful WebSocket connection."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=True)  # has_campaign_access
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        connected, subprotocol = await communicator.connect()
        
        self.assertTrue(connected)
        
        # Should receive initial status
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'initial_status')
        self.assertEqual(response['data']['campaign_id'], self.campaign.pk)
        
        await communicator.disconnect()
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_connect_anonymous_user(self, mock_db_sync):
        """Test WebSocket connection with anonymous user."""
        from django.contrib.auth.models import AnonymousUser
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = AnonymousUser()
        
        connected, subprotocol = await communicator.connect()
        
        self.assertFalse(connected)
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_connect_nonexistent_campaign(self, mock_db_sync):
        """Test WebSocket connection with non-existent campaign."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=None),  # get_campaign returns None
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            '/ws/campaigns/99999/'
        )
        communicator.scope['user'] = self.user
        
        connected, subprotocol = await communicator.connect()
        
        self.assertFalse(connected)
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_connect_no_access(self, mock_db_sync):
        """Test WebSocket connection without campaign access."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=False)  # has_campaign_access returns False
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        connected, subprotocol = await communicator.connect()
        
        self.assertFalse(connected)
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_receive_ping(self, mock_db_sync):
        """Test receiving ping message."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=True)  # has_campaign_access
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send ping message
        await communicator.send_json_to({
            'type': 'ping',
            'timestamp': '2024-01-01T10:00:00Z'
        })
        
        # Should receive pong
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'pong')
        self.assertEqual(response['timestamp'], '2024-01-01T10:00:00Z')
        
        await communicator.disconnect()
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_receive_subscribe_metrics(self, mock_db_sync):
        """Test receiving subscribe_metrics message."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=True)  # has_campaign_access
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send subscribe_metrics message
        await communicator.send_json_to({
            'type': 'subscribe_metrics'
        })
        
        # Should receive subscription confirmation
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'subscription_confirmed')
        
        await communicator.disconnect()
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_receive_invalid_json(self, mock_db_sync):
        """Test receiving invalid JSON."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=True)  # has_campaign_access
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send invalid JSON
        await communicator.send_to(text_data='invalid json')
        
        # Should receive error
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'error')
        self.assertIn('Invalid JSON format', response['message'])
        
        await communicator.disconnect()
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_receive_unknown_message_type(self, mock_db_sync):
        """Test receiving unknown message type."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=True)  # has_campaign_access
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send unknown message type
        await communicator.send_json_to({
            'type': 'unknown_type'
        })
        
        # Should receive error
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'error')
        self.assertIn('Unknown message type', response['message'])
        
        await communicator.disconnect()
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_status_changed_event(self, mock_db_sync):
        """Test statusChanged event handling."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=True)  # has_campaign_access
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send statusChanged event
        await communicator.send_json_to({
            'type': 'statusChanged',
            'payload': {
                'status': 'launched',
                'platformStatus': 'RUNNING'
            }
        })
        
        # Should receive status changed message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'status_changed')
        self.assertEqual(response['data']['status'], 'launched')
        
        await communicator.disconnect()
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_roi_alert_event(self, mock_db_sync):
        """Test roiAlert event handling."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=True)  # has_campaign_access
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send roiAlert event
        await communicator.send_json_to({
            'type': 'roiAlert',
            'payload': {
                'metric': 'roi',
                'value': 0.5,
                'threshold': 1.0
            }
        })
        
        # Should receive ROI alert message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'roi_alert')
        self.assertEqual(response['data']['metric'], 'roi')
        
        await communicator.disconnect()
    
    @patch('apps.campaign_execution.consumers.database_sync_to_async')
    async def test_execution_error_event(self, mock_db_sync):
        """Test executionError event handling."""
        # Mock database calls
        mock_db_sync.side_effect = [
            AsyncMock(return_value=self.campaign),  # get_campaign
            AsyncMock(return_value=True)  # has_campaign_access
        ]
        
        communicator = WebsocketCommunicator(
            CampaignExecutionConsumer.as_asgi(),
            f'/ws/campaigns/{self.campaign.pk}/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send executionError event
        await communicator.send_json_to({
            'type': 'executionError',
            'payload': {
                'error': 'API connection failed'
            }
        })
        
        # Should receive execution error message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'execution_error')
        self.assertEqual(response['data']['error'], 'API connection failed')
        
        await communicator.disconnect()


class CampaignListConsumerTest(TestCase):
    """Test cases for CampaignListConsumer."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    async def test_connect_success(self):
        """Test successful WebSocket connection."""
        communicator = WebsocketCommunicator(
            CampaignListConsumer.as_asgi(),
            '/ws/campaigns/'
        )
        communicator.scope['user'] = self.user
        
        connected, subprotocol = await communicator.connect()
        
        self.assertTrue(connected)
        
        await communicator.disconnect()
    
    async def test_connect_anonymous_user(self):
        """Test WebSocket connection with anonymous user."""
        from django.contrib.auth.models import AnonymousUser
        
        communicator = WebsocketCommunicator(
            CampaignListConsumer.as_asgi(),
            '/ws/campaigns/'
        )
        communicator.scope['user'] = AnonymousUser()
        
        connected, subprotocol = await communicator.connect()
        
        self.assertFalse(connected)
    
    async def test_receive_ping(self):
        """Test receiving ping message."""
        communicator = WebsocketCommunicator(
            CampaignListConsumer.as_asgi(),
            '/ws/campaigns/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send ping message
        await communicator.send_json_to({
            'type': 'ping',
            'timestamp': '2024-01-01T10:00:00Z'
        })
        
        # Should receive pong
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'pong')
        self.assertEqual(response['timestamp'], '2024-01-01T10:00:00Z')
        
        await communicator.disconnect()
    
    async def test_campaign_created_event(self):
        """Test campaignCreated event handling."""
        communicator = WebsocketCommunicator(
            CampaignListConsumer.as_asgi(),
            '/ws/campaigns/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send campaignCreated event
        await communicator.send_json_to({
            'type': 'campaignCreated',
            'payload': {
                'campaign_id': 123,
                'title': 'New Campaign'
            }
        })
        
        # Should receive campaign created message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'campaign_created')
        self.assertEqual(response['data']['campaign_id'], 123)
        
        await communicator.disconnect()
    
    async def test_campaign_updated_event(self):
        """Test campaignUpdated event handling."""
        communicator = WebsocketCommunicator(
            CampaignListConsumer.as_asgi(),
            '/ws/campaigns/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send campaignUpdated event
        await communicator.send_json_to({
            'type': 'campaignUpdated',
            'payload': {
                'campaign_id': 123,
                'status': 'launched'
            }
        })
        
        # Should receive campaign updated message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'campaign_updated')
        self.assertEqual(response['data']['status'], 'launched')
        
        await communicator.disconnect()
    
    async def test_campaign_deleted_event(self):
        """Test campaignDeleted event handling."""
        communicator = WebsocketCommunicator(
            CampaignListConsumer.as_asgi(),
            '/ws/campaigns/'
        )
        communicator.scope['user'] = self.user
        
        await communicator.connect()
        
        # Send campaignDeleted event
        await communicator.send_json_to({
            'type': 'campaignDeleted',
            'payload': {
                'campaign_id': 123
            }
        })
        
        # Should receive campaign deleted message
        response = await communicator.receive_json_from()
        self.assertEqual(response['type'], 'campaign_deleted')
        self.assertEqual(response['data']['campaign_id'], 123)
        
        await communicator.disconnect()
