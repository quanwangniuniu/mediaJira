import logging
import json
import pytest
from channels.testing import WebsocketCommunicator
from channels.routing import URLRouter
from django.contrib.auth import get_user_model
from django.test import TestCase
from core.models import Project, Organization, Team, TeamMember, ProjectMember
from chat.models import Chat, ChatParticipant, Message, MessageStatus, ChatType
from chat.consumers import ChatConsumer
from chat.routing import websocket_urlpatterns
from asset.middleware import JWTAuthMiddleware
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()
logger = logging.getLogger(__name__)


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
class TestChatConsumer:
    """Test ChatConsumer WebSocket functionality"""
    
    async def test_websocket_connect_authenticated(self, db):
        """Test WebSocket connection with authenticated user"""
        # Create test user
        user = await self._create_user('testuser', 'test@example.com')
        
        # Create JWT token
        token = str(AccessToken.for_user(user))
        
        # Create WebSocket communicator
        application = JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        communicator = WebsocketCommunicator(
            application,
            f'/ws/chat/{user.id}/?token={token}'
        )
        
        # Connect
        connected, _ = await communicator.connect()
        assert connected
        
        # Disconnect
        await communicator.disconnect()
    
    async def test_websocket_connect_unauthenticated(self, db):
        """Test WebSocket connection without authentication fails"""
        # Create WebSocket communicator without token
        application = JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        communicator = WebsocketCommunicator(
            application,
            '/ws/chat/999/'
        )
        
        # Connection should fail
        connected, _ = await communicator.connect()
        assert not connected
    
    async def test_websocket_send_message(self, db):
        """Test sending a message via WebSocket"""
        # Setup
        user1 = await self._create_user('user1', 'user1@example.com')
        user2 = await self._create_user('user2', 'user2@example.com')
        
        org = await self._create_organization('Test Org')
        team = await self._create_team(org, 'Test Team')
        project = await self._create_project(org, 'Test Project')
        
        await self._add_team_member(user1, team, 'owner')
        await self._add_team_member(user2, team, 'member')
        await self._add_project_member(user1, project, 'owner')
        await self._add_project_member(user2, project, 'member')
        
        chat = await self._create_chat(project, ChatType.PRIVATE)
        await self._add_chat_participant(chat, user1)
        await self._add_chat_participant(chat, user2)
        
        # Connect user1
        token1 = str(AccessToken.for_user(user1))
        application = JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        communicator1 = WebsocketCommunicator(
            application,
            f'/ws/chat/{user1.id}/?token={token1}'
        )
        
        connected, _ = await communicator1.connect()
        assert connected
        
        # Send message
        await communicator1.send_json_to({
            'type': 'chat_message',
            'chat_id': chat.id,
            'content': 'Hello, this is a test message!'
        })
        
        # Receive message echo
        response = await communicator1.receive_json_from(timeout=5)
        assert response['type'] == 'chat_message'
        assert response['message']['content'] == 'Hello, this is a test message!'
        assert response['message']['chat_id'] == chat.id
        
        await communicator1.disconnect()
    
    async def test_websocket_typing_indicator(self, db):
        """Test typing indicator via WebSocket"""
        # Setup
        user1 = await self._create_user('user1', 'user1@example.com')
        user2 = await self._create_user('user2', 'user2@example.com')
        
        org = await self._create_organization('Test Org')
        team = await self._create_team(org, 'Test Team')
        project = await self._create_project(org, 'Test Project')
        
        await self._add_team_member(user1, team, 'owner')
        await self._add_team_member(user2, team, 'member')
        await self._add_project_member(user1, project, 'owner')
        await self._add_project_member(user2, project, 'member')
        
        chat = await self._create_chat(project, ChatType.PRIVATE)
        await self._add_chat_participant(chat, user1)
        await self._add_chat_participant(chat, user2)
        
        # Connect both users
        token1 = str(AccessToken.for_user(user1))
        token2 = str(AccessToken.for_user(user2))
        
        application = JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        
        communicator1 = WebsocketCommunicator(
            application,
            f'/ws/chat/{user1.id}/?token={token1}'
        )
        communicator2 = WebsocketCommunicator(
            application,
            f'/ws/chat/{user2.id}/?token={token2}'
        )
        
        await communicator1.connect()
        await communicator2.connect()
        
        # User1 starts typing
        await communicator1.send_json_to({
            'type': 'typing_start',
            'chat_id': chat.id
        })
        
        # User2 should receive typing indicator
        response = await communicator2.receive_json_from(timeout=5)
        assert response['type'] == 'typing_indicator'
        assert response['chat_id'] == chat.id
        assert response['user_id'] == user1.id
        assert response['is_typing'] is True
        
        # User1 stops typing
        await communicator1.send_json_to({
            'type': 'typing_stop',
            'chat_id': chat.id
        })
        
        # User2 should receive typing stop
        response = await communicator2.receive_json_from(timeout=5)
        assert response['type'] == 'typing_indicator'
        assert response['is_typing'] is False
        
        await communicator1.disconnect()
        await communicator2.disconnect()
    
    async def test_websocket_heartbeat(self, db):
        """Test heartbeat to keep connection alive"""
        # Create test user
        user = await self._create_user('testuser', 'test@example.com')
        token = str(AccessToken.for_user(user))
        
        application = JWTAuthMiddleware(URLRouter(websocket_urlpatterns))
        communicator = WebsocketCommunicator(
            application,
            f'/ws/chat/{user.id}/?token={token}'
        )
        
        await communicator.connect()
        
        # Send heartbeat
        await communicator.send_json_to({
            'type': 'heartbeat'
        })
        
        # Receive pong
        response = await communicator.receive_json_from(timeout=5)
        assert response['type'] == 'pong'
        assert 'timestamp' in response
        
        await communicator.disconnect()
    
    # Helper methods (database operations must use sync_to_async)
    
    @staticmethod
    async def _create_user(username, email):
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def create():
            return User.objects.create_user(
                username=username,
                email=email,
                password='testpass123'
            )
        
        return await create()
    
    @staticmethod
    async def _create_organization(name):
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def create():
            return Organization.objects.create(name=name)
        
        return await create()
    
    @staticmethod
    async def _create_team(org, name):
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def create():
            return Team.objects.create(organization=org, name=name)
        
        return await create()
    
    @staticmethod
    async def _create_project(org, name):
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def create():
            return Project.objects.create(organization=org, name=name)
        
        return await create()
    
    @staticmethod
    async def _add_team_member(user, team, role):
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def create():
            return TeamMember.objects.create(
                user=user,
                team=team
            )
        
        return await create()
    
    @staticmethod
    async def _add_project_member(user, project, role):
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def create():
            return ProjectMember.objects.create(
                user=user,
                project=project,
                role=role,
                is_active=True
            )
        
        return await create()
    
    @staticmethod
    async def _create_chat(project, chat_type):
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def create():
            return Chat.objects.create(project=project, type=chat_type)
        
        return await create()
    
    @staticmethod
    async def _add_chat_participant(chat, user):
        from channels.db import database_sync_to_async
        
        @database_sync_to_async
        def create():
            return ChatParticipant.objects.create(
                chat=chat,
                user=user,
                is_active=True
            )
        
        return await create()


class ChatConsumerSyncTest(TestCase):
    """Synchronous tests for ChatConsumer (using Django TestCase)"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.organization = Organization.objects.create(name='Test Org')
        self.team = Team.objects.create(organization=self.organization, name='Test Team')
        self.project = Project.objects.create(organization=self.organization, name='Test Project')
        
        TeamMember.objects.create(user=self.user, team=self.team)
        ProjectMember.objects.create(user=self.user, project=self.project, role='owner', is_active=True)
        
        self.chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=self.chat, user=self.user, is_active=True)
    
    def test_consumer_initialization(self):
        """Test consumer can be instantiated"""
        consumer = ChatConsumer()
        self.assertIsNotNone(consumer)
    
    def test_get_chat_participants(self):
        """Test getting chat participants"""
        user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        ChatParticipant.objects.create(chat=self.chat, user=user2, is_active=True)
        
        consumer = ChatConsumer()
        consumer.user = self.user
        
        participants = consumer.get_chat_participants(self.chat.id)
        self.assertEqual(len(participants), 2)
        self.assertIn(self.user.id, participants)
        self.assertIn(user2.id, participants)
    
    def test_get_chat_participants_exclude_user(self):
        """Test getting chat participants excluding a specific user"""
        user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='testpass123'
        )
        ChatParticipant.objects.create(chat=self.chat, user=user2, is_active=True)
        
        consumer = ChatConsumer()
        consumer.user = self.user
        
        participants = consumer.get_chat_participants(self.chat.id, exclude_user_id=self.user.id)
        self.assertEqual(len(participants), 1)
        self.assertNotIn(self.user.id, participants)
        self.assertIn(user2.id, participants)

