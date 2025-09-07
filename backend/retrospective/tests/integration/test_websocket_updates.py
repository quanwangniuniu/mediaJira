"""
Integration tests for WebSocket updates in retrospective workflow
Tests real-time updates, group notifications, and timing
"""
import pytest
import json
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from unittest.mock import patch, MagicMock

from core.models import Project, Organization
from retrospective.models import RetrospectiveTask, Insight, CampaignMetric, RetrospectiveStatus
from retrospective.services import RetrospectiveService
from retrospective.routing import websocket_urlpatterns
from retrospective.consumers import RetrospectiveConsumer

User = get_user_model()


class TestWebSocketUpdates(TransactionTestCase):
    """Test WebSocket real-time updates for retrospectives"""

    def setUp(self):
        """Set up test data"""
        # Create organization
        self.organization = Organization.objects.create(
            name="Test Agency",
            email_domain="testagency.com"
        )
        
        # Create users
        self.media_buyer = User.objects.create_user(
            username="buyer1",
            email="buyer@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        self.manager = User.objects.create_user(
            username="manager1",
            email="manager@testagency.com",
            password="testpass123",
            organization=self.organization
        )
        
        # Create campaign
        self.campaign = Project.objects.create(
            name="Test Campaign",
            organization=self.organization,
            created_by=self.media_buyer
        )
        
        # Create KPI data
        self.create_kpi_data()

    def create_kpi_data(self):
        """Create test KPI data"""
        base_date = datetime.now().date()
        
        for i in range(10):
            date = base_date - timedelta(days=i)
            CampaignMetric.objects.create(
                campaign=self.campaign,
                date=date,
                impressions=1000 + (i * 10),
                clicks=50 + (i * 2),
                conversions=5 + (i * 0.1),
                cost_per_click=Decimal('2.50') + Decimal(str(i * 0.01)),
                cost_per_impression=Decimal('0.10') + Decimal(str(i * 0.001)),
                cost_per_conversion=Decimal('25.00') + Decimal(str(i * 0.1)),
                click_through_rate=Decimal('0.05') + Decimal(str(i * 0.001)),
                conversion_rate=Decimal('0.10') + Decimal(str(i * 0.001))
            )

    async def test_websocket_connection(self):
        """Test basic WebSocket connection"""
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        
        connected, subprotocol = await communicator.connect()
        assert connected
        
        await communicator.disconnect()

    async def test_retrospective_status_updates(self):
        """Test real-time status updates"""
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.SCHEDULED
        )
        
        # Connect WebSocket
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        await communicator.connect()
        
        # Update retrospective status
        retrospective.status = RetrospectiveStatus.IN_PROGRESS
        retrospective.started_at = datetime.now()
        retrospective.save()
        
        # Send status update via WebSocket
        await communicator.send_json_to({
            'type': 'status_update',
            'retrospective_id': str(retrospective.id),
            'status': RetrospectiveStatus.IN_PROGRESS,
            'timestamp': datetime.now().isoformat()
        })
        
        # Receive update
        response = await communicator.receive_json_from()
        assert response['type'] == 'status_update'
        assert response['retrospective_id'] == str(retrospective.id)
        assert response['status'] == RetrospectiveStatus.IN_PROGRESS
        
        await communicator.disconnect()

    async def test_insight_generation_updates(self):
        """Test real-time insight generation updates"""
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.IN_PROGRESS
        )
        
        # Connect WebSocket
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        await communicator.connect()
        
        # Generate insights
        insights = RetrospectiveService.generate_insights_batch(
            retrospective_id=str(retrospective.id)
        )
        
        # Send insight generation update
        await communicator.send_json_to({
            'type': 'insights_generated',
            'retrospective_id': str(retrospective.id),
            'insights_count': len(insights),
            'timestamp': datetime.now().isoformat()
        })
        
        # Receive update
        response = await communicator.receive_json_from()
        assert response['type'] == 'insights_generated'
        assert response['retrospective_id'] == str(retrospective.id)
        assert response['insights_count'] == len(insights)
        
        await communicator.disconnect()

    async def test_group_notifications(self):
        """Test group notifications for multiple users"""
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.COMPLETED
        )
        
        # Connect multiple WebSocket clients
        buyer_communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        manager_communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.manager.id}/"
        )
        
        await buyer_communicator.connect()
        await manager_communicator.connect()
        
        # Send group notification
        await buyer_communicator.send_json_to({
            'type': 'group_notification',
            'retrospective_id': str(retrospective.id),
            'message': 'Retrospective completed and ready for review',
            'target_users': [self.media_buyer.id, self.manager.id],
            'timestamp': datetime.now().isoformat()
        })
        
        # Both clients should receive the notification
        buyer_response = await buyer_communicator.receive_json_from()
        manager_response = await manager_communicator.receive_json_from()
        
        assert buyer_response['type'] == 'group_notification'
        assert manager_response['type'] == 'group_notification'
        assert buyer_response['retrospective_id'] == str(retrospective.id)
        assert manager_response['retrospective_id'] == str(retrospective.id)
        
        await buyer_communicator.disconnect()
        await manager_communicator.disconnect()

    async def test_websocket_timing_and_delivery(self):
        """Test WebSocket message timing and delivery"""
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer
        )
        
        # Connect WebSocket
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        await communicator.connect()
        
        # Send multiple rapid updates
        start_time = datetime.now()
        for i in range(5):
            await communicator.send_json_to({
                'type': 'progress_update',
                'retrospective_id': str(retrospective.id),
                'progress': (i + 1) * 20,
                'timestamp': datetime.now().isoformat()
            })
        
        # Receive all updates
        responses = []
        for i in range(5):
            response = await communicator.receive_json_from()
            responses.append(response)
        
        end_time = datetime.now()
        
        # Verify all messages were received
        assert len(responses) == 5
        
        # Verify timing (should be fast)
        duration = (end_time - start_time).total_seconds()
        assert duration < 1.0  # Should complete in under 1 second
        
        # Verify message order
        for i, response in enumerate(responses):
            assert response['type'] == 'progress_update'
            assert response['progress'] == (i + 1) * 20
        
        await communicator.disconnect()

    async def test_connection_handling(self):
        """Test WebSocket connection handling and cleanup"""
        # Test normal connection
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        
        connected, subprotocol = await communicator.connect()
        assert connected
        
        # Test graceful disconnect
        await communicator.disconnect()
        
        # Test reconnection
        communicator2 = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        
        connected, subprotocol = await communicator2.connect()
        assert connected
        
        await communicator2.disconnect()

    async def test_error_handling_in_websocket(self):
        """Test error handling in WebSocket communication"""
        # Connect WebSocket
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        await communicator.connect()
        
        # Send invalid message
        await communicator.send_json_to({
            'type': 'invalid_type',
            'data': 'invalid_data'
        })
        
        # Should receive error response
        response = await communicator.receive_json_from()
        assert response['type'] == 'error'
        assert 'error' in response
        
        await communicator.disconnect()

    async def test_websocket_with_large_data(self):
        """Test WebSocket with large data payloads"""
        # Create retrospective with many insights
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer
        )
        
        # Generate many insights
        insights = []
        for i in range(100):
            insight = Insight.objects.create(
                retrospective=retrospective,
                title=f"Test Insight {i}",
                description=f"Description for insight {i}" * 10,  # Long description
                severity='medium',
                rule_id=f'rule_{i}',
                suggested_actions=[f"Action {j}" for j in range(5)]
            )
            insights.append(insight)
        
        # Connect WebSocket
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        await communicator.connect()
        
        # Send large data payload
        large_payload = {
            'type': 'insights_data',
            'retrospective_id': str(retrospective.id),
            'insights': [
                {
                    'id': str(insight.id),
                    'title': insight.title,
                    'description': insight.description,
                    'severity': insight.severity,
                    'suggested_actions': insight.suggested_actions
                }
                for insight in insights
            ],
            'timestamp': datetime.now().isoformat()
        }
        
        await communicator.send_json_to(large_payload)
        
        # Should receive confirmation
        response = await communicator.receive_json_from()
        assert response['type'] == 'insights_data_received'
        assert response['insights_count'] == 100
        
        await communicator.disconnect()

    @patch('retrospective.consumers.async_to_sync')
    async def test_websocket_with_celery_integration(self, mock_async_to_sync):
        """Test WebSocket integration with Celery tasks"""
        # Mock Celery task completion
        mock_async_to_sync.return_value = MagicMock()
        
        # Create retrospective
        retrospective = RetrospectiveTask.objects.create(
            campaign=self.campaign,
            created_by=self.media_buyer,
            status=RetrospectiveStatus.IN_PROGRESS
        )
        
        # Connect WebSocket
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{self.media_buyer.id}/"
        )
        await communicator.connect()
        
        # Simulate Celery task completion
        await communicator.send_json_to({
            'type': 'celery_task_complete',
            'task_id': 'test-task-id',
            'retrospective_id': str(retrospective.id),
            'result': 'success',
            'timestamp': datetime.now().isoformat()
        })
        
        # Receive task completion notification
        response = await communicator.receive_json_from()
        assert response['type'] == 'celery_task_complete'
        assert response['task_id'] == 'test-task-id'
        assert response['result'] == 'success'
        
        await communicator.disconnect()


@pytest.mark.asyncio
class TestWebSocketPerformance:
    """Performance tests for WebSocket operations"""
    
    async def test_concurrent_websocket_connections(self):
        """Test handling of concurrent WebSocket connections"""
        # Create test data
        org = Organization.objects.create(name="Perf Test Org")
        user = User.objects.create_user(username="perfuser", email="perf@test.com")
        campaign = Project.objects.create(name="Perf Campaign", organization=org)
        
        # Create multiple concurrent connections
        communicators = []
        for i in range(10):
            communicator = WebsocketCommunicator(
                RetrospectiveConsumer.as_asgi(),
                f"/ws/retrospective/{user.id}/"
            )
            connected, _ = await communicator.connect()
            assert connected
            communicators.append(communicator)
        
        # Send messages from all connections simultaneously
        tasks = []
        for i, communicator in enumerate(communicators):
            task = communicator.send_json_to({
                'type': 'test_message',
                'connection_id': i,
                'timestamp': datetime.now().isoformat()
            })
            tasks.append(task)
        
        # Wait for all messages to be sent
        await asyncio.gather(*tasks)
        
        # Receive responses from all connections
        for communicator in communicators:
            response = await communicator.receive_json_from()
            assert response['type'] == 'test_message'
        
        # Clean up
        for communicator in communicators:
            await communicator.disconnect()
    
    async def test_websocket_message_throughput(self):
        """Test WebSocket message throughput"""
        # Create test data
        org = Organization.objects.create(name="Perf Test Org")
        user = User.objects.create_user(username="perfuser", email="perf@test.com")
        
        # Connect WebSocket
        communicator = WebsocketCommunicator(
            RetrospectiveConsumer.as_asgi(),
            f"/ws/retrospective/{user.id}/"
        )
        await communicator.connect()
        
        # Send many messages rapidly
        start_time = datetime.now()
        message_count = 100
        
        for i in range(message_count):
            await communicator.send_json_to({
                'type': 'throughput_test',
                'message_id': i,
                'timestamp': datetime.now().isoformat()
            })
        
        # Receive all responses
        for i in range(message_count):
            response = await communicator.receive_json_from()
            assert response['type'] == 'throughput_test'
            assert response['message_id'] == i
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        # Should handle 100 messages in under 5 seconds
        assert duration < 5.0
        
        # Calculate throughput
        throughput = message_count / duration
        assert throughput > 20  # At least 20 messages per second
        
        await communicator.disconnect()
