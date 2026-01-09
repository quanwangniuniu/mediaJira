"""
Tests for chat models.
Validates model behavior, relationships, and business logic.
"""

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from core.models import Organization, Project, CustomUser, ProjectMember
from chat.models import Chat, ChatParticipant, Message, MessageStatus


@pytest.mark.django_db
class TestChatModel:
    """Tests for Chat model"""
    
    @pytest.fixture
    def setup_data(self):
        """Set up test data"""
        # Create organization
        org = Organization.objects.create(name="Test Org")
        
        # Create users
        user1 = CustomUser.objects.create(
            email="user1@test.com",
            username="user1",
            organization=org
        )
        user2 = CustomUser.objects.create(
            email="user2@test.com",
            username="user2",
            organization=org
        )
        
        # Create project
        project = Project.objects.create(
            name="Test Project",
            organization=org,
            owner=user1
        )
        
        # Add users as project members
        ProjectMember.objects.create(
            user=user1,
            project=project,
            role='owner',
            is_active=True
        )
        ProjectMember.objects.create(
            user=user2,
            project=project,
            role='member',
            is_active=True
        )
        
        return {
            'org': org,
            'user1': user1,
            'user2': user2,
            'project': project
        }
    
    def test_create_private_chat(self, setup_data):
        """Test creating a private chat"""
        chat = Chat.objects.create(
            project=setup_data['project'],
            chat_type='private',
            created_by=setup_data['user1']
        )
        
        assert chat.chat_type == 'private'
        assert chat.project == setup_data['project']
        assert chat.created_by == setup_data['user1']
        assert chat.name is None
    
    def test_create_group_chat(self, setup_data):
        """Test creating a group chat"""
        chat = Chat.objects.create(
            project=setup_data['project'],
            chat_type='group',
            name='Test Group',
            created_by=setup_data['user1']
        )
        
        assert chat.chat_type == 'group'
        assert chat.name == 'Test Group'
        assert str(chat) == 'Test Group'
    
    def test_group_chat_requires_name(self, setup_data):
        """Test that group chats must have a name"""
        chat = Chat(
            project=setup_data['project'],
            chat_type='group',
            created_by=setup_data['user1']
        )
        
        with pytest.raises(ValidationError):
            chat.clean()
    
    def test_chat_must_have_project(self, setup_data):
        """Test that chats must be associated with a project"""
        with pytest.raises(Exception):
            Chat.objects.create(
                chat_type='private',
                created_by=setup_data['user1']
            )
    
    def test_get_participant_count(self, setup_data):
        """Test getting participant count"""
        chat = Chat.objects.create(
            project=setup_data['project'],
            chat_type='private',
            created_by=setup_data['user1']
        )
        
        ChatParticipant.objects.create(
            chat=chat,
            user=setup_data['user1'],
            is_active=True
        )
        ChatParticipant.objects.create(
            chat=chat,
            user=setup_data['user2'],
            is_active=True
        )
        
        assert chat.get_participant_count() == 2
    
    def test_private_chat_string_representation(self, setup_data):
        """Test string representation of private chat"""
        chat = Chat.objects.create(
            project=setup_data['project'],
            chat_type='private',
            created_by=setup_data['user1']
        )
        
        ChatParticipant.objects.create(chat=chat, user=setup_data['user1'])
        ChatParticipant.objects.create(chat=chat, user=setup_data['user2'])
        
        chat_str = str(chat)
        assert 'user1@test.com' in chat_str
        assert 'user2@test.com' in chat_str


@pytest.mark.django_db
class TestChatParticipantModel:
    """Tests for ChatParticipant model"""
    
    @pytest.fixture
    def setup_data(self):
        """Set up test data"""
        org = Organization.objects.create(name="Test Org")
        user = CustomUser.objects.create(
            email="user@test.com",
            username="user",
            organization=org
        )
        project = Project.objects.create(
            name="Test Project",
            organization=org,
            owner=user
        )
        chat = Chat.objects.create(
            project=project,
            chat_type='private',
            created_by=user
        )
        
        return {
            'user': user,
            'chat': chat
        }
    
    def test_create_participant(self, setup_data):
        """Test creating a chat participant"""
        participant = ChatParticipant.objects.create(
            chat=setup_data['chat'],
            user=setup_data['user'],
            is_active=True
        )
        
        assert participant.chat == setup_data['chat']
        assert participant.user == setup_data['user']
        assert participant.is_active is True
        assert participant.last_read_at is None
    
    def test_unique_user_per_chat(self, setup_data):
        """Test that a user can only be a participant once per chat"""
        ChatParticipant.objects.create(
            chat=setup_data['chat'],
            user=setup_data['user']
        )
        
        with pytest.raises(Exception):  # IntegrityError
            ChatParticipant.objects.create(
                chat=setup_data['chat'],
                user=setup_data['user']
            )
    
    def test_mark_as_read(self, setup_data):
        """Test marking chat as read"""
        participant = ChatParticipant.objects.create(
            chat=setup_data['chat'],
            user=setup_data['user']
        )
        
        assert participant.last_read_at is None
        
        participant.mark_as_read()
        participant.refresh_from_db()
        
        assert participant.last_read_at is not None


@pytest.mark.django_db
class TestMessageModel:
    """Tests for Message model"""
    
    @pytest.fixture
    def setup_data(self):
        """Set up test data"""
        org = Organization.objects.create(name="Test Org")
        user1 = CustomUser.objects.create(
            email="user1@test.com",
            username="user1",
            organization=org
        )
        user2 = CustomUser.objects.create(
            email="user2@test.com",
            username="user2",
            organization=org
        )
        project = Project.objects.create(
            name="Test Project",
            organization=org,
            owner=user1
        )
        chat = Chat.objects.create(
            project=project,
            chat_type='private',
            created_by=user1
        )
        
        # Add participants
        ChatParticipant.objects.create(chat=chat, user=user1, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=user2, is_active=True)
        
        return {
            'user1': user1,
            'user2': user2,
            'chat': chat
        }
    
    def test_create_message(self, setup_data):
        """Test creating a message"""
        message = Message.objects.create(
            chat=setup_data['chat'],
            sender=setup_data['user1'],
            content='Hello, world!',
            message_type='text'
        )
        
        assert message.chat == setup_data['chat']
        assert message.sender == setup_data['user1']
        assert message.content == 'Hello, world!'
        assert message.message_type == 'text'
    
    def test_message_content_preview(self, setup_data):
        """Test message string representation"""
        long_content = 'A' * 100
        message = Message.objects.create(
            chat=setup_data['chat'],
            sender=setup_data['user1'],
            content=long_content
        )
        
        message_str = str(message)
        assert len(message_str) < len(long_content) + 50
        assert 'user1@test.com' in message_str
    
    def test_mark_as_read_by(self, setup_data):
        """Test marking message as read by a user"""
        message = Message.objects.create(
            chat=setup_data['chat'],
            sender=setup_data['user1'],
            content='Test message'
        )
        
        status = message.mark_as_read_by(setup_data['user2'])
        
        assert status.message == message
        assert status.user == setup_data['user2']
        assert status.status == 'read'
    
    def test_message_metadata(self, setup_data):
        """Test message metadata field"""
        message = Message.objects.create(
            chat=setup_data['chat'],
            sender=setup_data['user1'],
            content='Test message',
            metadata={'mentions': ['user2'], 'file_url': 'https://example.com/file.pdf'}
        )
        
        assert 'mentions' in message.metadata
        assert message.metadata['mentions'] == ['user2']
        assert message.metadata['file_url'] == 'https://example.com/file.pdf'


@pytest.mark.django_db
class TestMessageStatusModel:
    """Tests for MessageStatus model"""
    
    @pytest.fixture
    def setup_data(self):
        """Set up test data"""
        org = Organization.objects.create(name="Test Org")
        user1 = CustomUser.objects.create(
            email="user1@test.com",
            username="user1",
            organization=org
        )
        user2 = CustomUser.objects.create(
            email="user2@test.com",
            username="user2",
            organization=org
        )
        project = Project.objects.create(
            name="Test Project",
            organization=org,
            owner=user1
        )
        chat = Chat.objects.create(
            project=project,
            chat_type='private',
            created_by=user1
        )
        message = Message.objects.create(
            chat=chat,
            sender=user1,
            content='Test message'
        )
        
        return {
            'user1': user1,
            'user2': user2,
            'message': message
        }
    
    def test_create_message_status(self, setup_data):
        """Test creating a message status"""
        status = MessageStatus.objects.create(
            message=setup_data['message'],
            user=setup_data['user2'],
            status='delivered'
        )
        
        assert status.message == setup_data['message']
        assert status.user == setup_data['user2']
        assert status.status == 'delivered'
    
    def test_unique_status_per_user_per_message(self, setup_data):
        """Test that each user can only have one status per message"""
        MessageStatus.objects.create(
            message=setup_data['message'],
            user=setup_data['user2'],
            status='delivered'
        )
        
        with pytest.raises(Exception):  # IntegrityError
            MessageStatus.objects.create(
                message=setup_data['message'],
                user=setup_data['user2'],
                status='read'
            )
    
    def test_status_update(self, setup_data):
        """Test updating message status"""
        status = MessageStatus.objects.create(
            message=setup_data['message'],
            user=setup_data['user2'],
            status='sent'
        )
        
        original_timestamp = status.timestamp
        
        # Update status
        status.status = 'read'
        status.save()
        status.refresh_from_db()
        
        assert status.status == 'read'
        assert status.timestamp >= original_timestamp

