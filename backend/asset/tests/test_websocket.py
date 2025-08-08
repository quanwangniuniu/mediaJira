import json
import asyncio
from channels.testing import WebsocketCommunicator
from rest_framework_simplejwt.tokens import AccessToken
from django.test import TransactionTestCase

from backend.asgi import application
from asset.models import Asset, Task, AssetVersion, AssetComment, ReviewAssignment
from core.models import Organization, Team
from asset.services import AssetEventService
from django.contrib.auth import get_user_model

User = get_user_model()


class TestWebSocketConnection(TransactionTestCase):
    """Test WebSocket connection functionality"""
    
    def setUp(self):
        # Create test user
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test', 'asset']
        )
        
        # Create JWT token for authentication
        self.token = str(AccessToken.for_user(self.user1))
    
    def test_websocket_connect_success(self):
        """Test successful WebSocket connection with valid authentication"""
        async def test_connection():
            headers = [
                (b'authorization', f'Bearer {self.token}'.encode())
            ]
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            
            assert connected
            await communicator.disconnect()
        
        asyncio.run(test_connection())
    
    def test_websocket_connection_established_message(self):
        """Test connection_established message format and content"""
        async def test_connection():
            headers = [
                (b'authorization', f'Bearer {self.token}'.encode())
            ]
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            
            assert connected
            
            # Receive the connection_established message
            response = await communicator.receive_json_from()
            
            # Verify the connection_established message
            assert response['type'] == 'connection_established'
            assert int(response['asset_id']) == self.asset.id
            assert int(response['user_id']) == self.user1.id
            assert response['username'] == self.user1.username
            assert 'Connected to asset' in response['message']
            
            await communicator.disconnect()
        
        asyncio.run(test_connection())
    
    def test_websocket_connect_without_auth(self):
        """Test WebSocket connection without authentication should fail"""
        async def test_connection():
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/"
            )
            connected, _ = await communicator.connect()
            
            assert not connected
        
        asyncio.run(test_connection())
    
    def test_websocket_connect_invalid_token(self):
        """Test WebSocket connection with invalid token should fail"""
        async def test_connection():
            headers = [
                (b'authorization', b'Bearer invalid_token')
            ]
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            
            assert not connected
        
        asyncio.run(test_connection())
    
    def test_websocket_connect_nonexistent_asset(self):
        """Test WebSocket connection to nonexistent asset should fail"""
        async def test_connection():
            headers = [
                (b'authorization', f'Bearer {self.token}'.encode())
            ]
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/99999/",  # Non-existent asset ID
                headers=headers
            )
            connected, _ = await communicator.connect()
            
            assert not connected
        
        asyncio.run(test_connection())


class TestWebSocketMessageHandling(TransactionTestCase):
    """Test WebSocket message handling functionality"""
    
    def setUp(self):
        # Create test user
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test', 'asset']
        )
        
        # Create JWT token for authentication
        self.token = str(AccessToken.for_user(self.user1))
    
    def test_websocket_ping_pong(self):
        """Test ping-pong functionality for connection keep-alive"""
        async def test_connection():
            headers = [
                (b'authorization', f'Bearer {self.token}'.encode())
            ]
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            
            assert connected
            
            # Receive connection_established message
            await communicator.receive_json_from()
            
            # Send ping message
            ping_data = {
                'type': 'ping',
                'timestamp': '2023-01-01T00:00:00Z'
            }
            await communicator.send_json_to(ping_data)
            
            # Receive pong response
            pong_response = await communicator.receive_json_from()
            
            assert pong_response['type'] == 'pong'
            assert pong_response['timestamp'] == '2023-01-01T00:00:00Z'
            
            await communicator.disconnect()
        
        asyncio.run(test_connection())
    
    def test_websocket_invalid_json(self):
        """Test handling of invalid JSON messages"""
        async def test_connection():
            headers = [
                (b'authorization', f'Bearer {self.token}'.encode())
            ]
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            
            assert connected
            
            # Receive connection_established message
            await communicator.receive_json_from()
            
            # Send invalid JSON
            await communicator.send_to('invalid json')
            
            # Receive error response
            error_response = await communicator.receive_json_from()
            
            assert error_response['type'] == 'error'
            assert 'Invalid JSON format' in error_response['message']
            
            await communicator.disconnect()
        
        asyncio.run(test_connection())
    
    def test_websocket_echo_message(self):
        """Test echo functionality for other message types"""
        async def test_connection():
            headers = [
                (b'authorization', f'Bearer {self.token}'.encode())
            ]
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            
            assert connected
            
            # Receive connection_established message
            await communicator.receive_json_from()
            
            # Send test message
            test_data = {
                'type': 'test_message',
                'content': 'Hello WebSocket!'
            }
            await communicator.send_json_to(test_data)
            
            # Receive echo response
            echo_response = await communicator.receive_json_from()
            
            assert echo_response['type'] == 'echo'
            assert echo_response['message'] == test_data
            
            await communicator.disconnect()
        
        asyncio.run(test_connection())


class TestWebSocketEventBroadcasting(TransactionTestCase):
    """Test WebSocket event broadcasting functionality"""
    
    def setUp(self):
        # Create test users
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='testpass123'
        )
        
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            username='user2',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test', 'asset']
        )
        
        # Create JWT tokens for authentication
        self.token1 = str(AccessToken.for_user(self.user1))
        self.token2 = str(AccessToken.for_user(self.user2))
    
    def test_status_change_broadcasting(self):
        """Test broadcasting asset status change events"""
        async def test_broadcasting():
            # Connect user1 to WebSocket
            headers1 = [(b'authorization', f'Bearer {self.token1}'.encode())]
            communicator1 = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers1
            )
            connected1, _ = await communicator1.connect()
            assert connected1
            
            # Connect user2 to WebSocket
            headers2 = [(b'authorization', f'Bearer {self.token2}'.encode())]
            communicator2 = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers2
            )
            connected2, _ = await communicator2.connect()
            assert connected2
            
            # Receive connection_established messages
            await communicator1.receive_json_from()
            await communicator2.receive_json_from()
            
            # Broadcast status change event using async method
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'asset_{self.asset.id}',
                {
                    'type': 'asset_status_changed',
                    'asset_id': self.asset.id,
                    'from_state': Asset.NOT_SUBMITTED,
                    'to_state': Asset.PENDING_REVIEW,
                    'changed_by': self.user1.username,
                    'timestamp': '2023-01-01T00:00:00Z',
                    'metadata': {'comment': 'Ready for review'}
                }
            )
            
            # Both users should receive the status change event
            status_msg1 = await communicator1.receive_json_from()
            status_msg2 = await communicator2.receive_json_from()
            
            # Verify the messages
            for msg in [status_msg1, status_msg2]:
                assert msg['type'] == 'statusChanged'
                assert int(msg['asset_id']) == self.asset.id
                assert msg['from'] == Asset.NOT_SUBMITTED
                assert msg['to'] == Asset.PENDING_REVIEW
                assert msg['changed_by'] == self.user1.username
                assert 'timestamp' in msg
                assert 'comment' in msg['metadata']
                assert msg['metadata']['comment'] == 'Ready for review'
            
            await communicator1.disconnect()
            await communicator2.disconnect()
        
        asyncio.run(test_broadcasting())
    
    def test_version_upload_broadcasting(self):
        """Test broadcasting version upload events"""
        async def test_broadcasting():
            # Connect to WebSocket
            headers = [(b'authorization', f'Bearer {self.token1}'.encode())]
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            assert connected
            
            # Receive connection_established message
            await communicator.receive_json_from()
            
            # Broadcast version upload event using async method
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'asset_{self.asset.id}',
                {
                    'type': 'version_uploaded',
                    'asset_id': self.asset.id,
                    'version_number': 1,
                    'uploaded_by': self.user1.username,
                    'file_name': 'test_file.txt',
                    'timestamp': '2023-01-01T00:00:00Z'
                }
            )
            
            # Receive version upload event
            version_msg = await communicator.receive_json_from()
            
            # Verify the message
            assert version_msg['type'] == 'versionUploaded'
            assert int(version_msg['asset_id']) == self.asset.id
            assert version_msg['version_number'] == 1
            assert version_msg['uploaded_by'] == self.user1.username
            assert version_msg['file_name'] == 'test_file.txt'
            assert 'timestamp' in version_msg
            
            await communicator.disconnect()
        
        asyncio.run(test_broadcasting())
    
    def test_comment_added_broadcasting(self):
        """Test broadcasting comment addition events"""
        async def test_broadcasting():
            # Connect to WebSocket
            headers = [(b'authorization', f'Bearer {self.token1}'.encode())]
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            assert connected
            
            # Receive connection_established message
            await communicator.receive_json_from()
            
            # Create a comment using database_sync_to_async
            from channels.db import database_sync_to_async
            
            @database_sync_to_async
            def create_comment():
                return AssetComment.objects.create(
                    asset=self.asset,
                    user=self.user2,
                    body='This is a test comment'
                )
            
            comment = await create_comment()
            
            # Broadcast comment added event using async method
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'asset_{self.asset.id}',
                {
                    'type': 'comment_added',
                    'asset_id': self.asset.id,
                    'comment_id': comment.id,
                    'user_id': self.user2.id,
                    'body': comment.body,
                    'timestamp': '2023-01-01T00:00:00Z'
                }
            )
            
            # Receive comment added event
            comment_msg = await communicator.receive_json_from()
            
            # Verify the message
            assert comment_msg['type'] == 'commentAdded'
            assert int(comment_msg['asset_id']) == self.asset.id
            assert comment_msg['comment_id'] == comment.id
            assert comment_msg['user_id'] == self.user2.id
            assert comment_msg['body'] == 'This is a test comment'
            assert 'timestamp' in comment_msg
            
            await communicator.disconnect()
        
        asyncio.run(test_broadcasting())
    
    def test_review_action_broadcasting(self):
        """Test broadcasting review action events"""
        async def test_broadcasting():
            # Connect to WebSocket
            headers = [(b'authorization', f'Bearer {self.token1}'.encode())]
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            assert connected
            
            # Receive connection_established message
            await communicator.receive_json_from()
            
            # Broadcast review action event using async method
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'asset_{self.asset.id}',
                {
                    'type': 'review_action',
                    'asset_id': self.asset.id,
                    'action': 'approve',
                    'performed_by': self.user2.username,
                    'comment': 'Looks good!',
                    'timestamp': '2023-01-01T00:00:00Z'
                }
            )
            
            # Receive review action event
            action_msg = await communicator.receive_json_from()
            
            # Verify the message
            assert action_msg['type'] == 'reviewAction'
            assert int(action_msg['asset_id']) == self.asset.id
            assert action_msg['action'] == 'approve'
            assert action_msg['performed_by'] == self.user2.username
            assert action_msg['comment'] == 'Looks good!'
            assert 'timestamp' in action_msg
            
            await communicator.disconnect()
        
        asyncio.run(test_broadcasting())

    def test_version_published_broadcasting(self):
        """Test broadcasting version published events"""
        async def test_broadcasting():
            # Connect to WebSocket
            headers = [(b'authorization', f'Bearer {self.token1}'.encode())]
            communicator = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers
            )
            connected, _ = await communicator.connect()
            assert connected
            
            # Receive connection_established message
            await communicator.receive_json_from()
            
            # Broadcast version published event using async method
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'asset_{self.asset.id}',
                {
                    'type': 'version_published',
                    'asset_id': self.asset.id,
                    'version_number': 2,
                    'published_by': self.user1.username,
                    'file_name': 'document_v2.pdf',
                    'timestamp': '2023-01-01T00:00:00Z'
                }
            )
            
            # Receive version published event
            version_msg = await communicator.receive_json_from()
            
            # Verify the message
            assert version_msg['type'] == 'versionPublished'
            assert int(version_msg['asset_id']) == self.asset.id
            assert version_msg['version_number'] == 2
            assert version_msg['published_by'] == self.user1.username
            assert version_msg['file_name'] == 'document_v2.pdf'
            assert 'timestamp' in version_msg
            
            await communicator.disconnect()
        
        asyncio.run(test_broadcasting())


class TestWebSocketMultipleUsers(TransactionTestCase):
    """Test WebSocket functionality with multiple users"""
    
    def setUp(self):
        # Create test users
        self.user1 = User.objects.create_user(
            email='user1@example.com',
            username='user1',
            password='testpass123'
        )
        
        self.user2 = User.objects.create_user(
            email='user2@example.com',
            username='user2',
            password='testpass123'
        )
        
        # Create test task
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user1,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test', 'asset']
        )
        
        # Create JWT tokens for authentication
        self.token1 = str(AccessToken.for_user(self.user1))
        self.token2 = str(AccessToken.for_user(self.user2))
    
    def test_multiple_users_receive_notifications(self):
        """Test that multiple connected users receive the same notifications"""
        async def test_multiple_users():
            # Connect user1
            headers1 = [(b'authorization', f'Bearer {self.token1}'.encode())]
            communicator1 = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers1
            )
            connected1, _ = await communicator1.connect()
            assert connected1
            
            # Connect user2
            headers2 = [(b'authorization', f'Bearer {self.token2}'.encode())]
            communicator2 = WebsocketCommunicator(
                application,
                f"/ws/assets/{self.asset.id}/",
                headers=headers2
            )
            connected2, _ = await communicator2.connect()
            assert connected2
            
            # Receive connection_established messages
            await communicator1.receive_json_from()
            await communicator2.receive_json_from()
            
            # Broadcast an event using async method
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            await channel_layer.group_send(
                f'asset_{self.asset.id}',
                {
                    'type': 'review_action',
                    'asset_id': self.asset.id,
                    'action': 'start_review',
                    'performed_by': self.user1.username,
                    'comment': 'Starting review process',
                    'timestamp': '2023-01-01T00:00:00Z'
                }
            )
            
            # Both users should receive the same notification
            msg1 = await communicator1.receive_json_from()
            msg2 = await communicator2.receive_json_from()
            
            # Verify both messages are identical
            assert msg1 == msg2
            assert msg1['type'] == 'reviewAction'
            assert msg1['action'] == 'start_review'
            assert msg1['performed_by'] == self.user1.username
            assert msg1['comment'] == 'Starting review process'
            
            await communicator1.disconnect()
            await communicator2.disconnect()
        
        asyncio.run(test_multiple_users()) 