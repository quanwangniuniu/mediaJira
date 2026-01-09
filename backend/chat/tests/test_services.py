"""
Tests for chat services.
Validates business logic and validation rules.
"""

import pytest
from core.models import Organization, Project, CustomUser, ProjectMember, Team, TeamMember
from chat.models import Chat, ChatParticipant
from chat.services import ChatValidationService


@pytest.mark.django_db
class TestChatValidationService:
    """Tests for ChatValidationService"""
    
    @pytest.fixture
    def setup_data(self):
        """Set up test data"""
        # Create organizations
        org1 = Organization.objects.create(name="Org 1")
        org2 = Organization.objects.create(name="Org 2")
        
        # Create users in org1
        user1 = CustomUser.objects.create(
            email="user1@org1.com",
            username="user1",
            organization=org1
        )
        user2 = CustomUser.objects.create(
            email="user2@org1.com",
            username="user2",
            organization=org1
        )
        
        # Create user in org2
        user3 = CustomUser.objects.create(
            email="user3@org2.com",
            username="user3",
            organization=org2
        )
        
        # Create projects
        project1 = Project.objects.create(
            name="Project 1",
            organization=org1,
            owner=user1
        )
        project2 = Project.objects.create(
            name="Project 2",
            organization=org1,
            owner=user2
        )
        
        # Add project members
        ProjectMember.objects.create(
            user=user1,
            project=project1,
            role='owner',
            is_active=True
        )
        ProjectMember.objects.create(
            user=user2,
            project=project1,
            role='member',
            is_active=True
        )
        ProjectMember.objects.create(
            user=user2,
            project=project2,
            role='owner',
            is_active=True
        )
        
        return {
            'org1': org1,
            'org2': org2,
            'user1': user1,
            'user2': user2,
            'user3': user3,
            'project1': project1,
            'project2': project2
        }
    
    def test_can_users_chat_same_project(self, setup_data):
        """Test that users in the same project can chat"""
        is_valid, error = ChatValidationService.can_users_chat_in_project(
            setup_data['user1'],
            setup_data['user2'],
            setup_data['project1'].id
        )
        
        assert is_valid is True
        assert error is None
    
    def test_cannot_chat_with_self(self, setup_data):
        """Test that a user cannot create a chat with themselves"""
        is_valid, error = ChatValidationService.can_users_chat_in_project(
            setup_data['user1'],
            setup_data['user1'],
            setup_data['project1'].id
        )
        
        assert is_valid is False
        assert "yourself" in error.lower()
    
    def test_cannot_chat_different_projects(self, setup_data):
        """Test that users must both be in the project"""
        # user1 is not in project2
        is_valid, error = ChatValidationService.can_users_chat_in_project(
            setup_data['user1'],
            setup_data['user2'],
            setup_data['project2'].id
        )
        
        assert is_valid is False
        assert "members of the project" in error.lower()
    
    def test_cannot_chat_different_organizations(self, setup_data):
        """Test that users must be in the same organization"""
        # Add user3 (from org2) to project1
        ProjectMember.objects.create(
            user=setup_data['user3'],
            project=setup_data['project1'],
            role='member',
            is_active=True
        )
        
        is_valid, error = ChatValidationService.can_users_chat_in_project(
            setup_data['user1'],
            setup_data['user3'],
            setup_data['project1'].id
        )
        
        assert is_valid is False
        assert "same organization" in error.lower()
    
    def test_validate_group_participants(self, setup_data):
        """Test validating group chat participants"""
        user_ids = [setup_data['user1'].id, setup_data['user2'].id]
        
        is_valid, error = ChatValidationService.validate_group_participants(
            user_ids,
            setup_data['project1'].id
        )
        
        assert is_valid is True
        assert error is None
    
    def test_group_chat_minimum_participants(self, setup_data):
        """Test that group chats need at least 2 participants"""
        user_ids = [setup_data['user1'].id]
        
        is_valid, error = ChatValidationService.validate_group_participants(
            user_ids,
            setup_data['project1'].id
        )
        
        assert is_valid is False
        assert "at least 2" in error.lower()
    
    def test_group_chat_no_duplicates(self, setup_data):
        """Test that group chats cannot have duplicate participants"""
        user_ids = [setup_data['user1'].id, setup_data['user1'].id]
        
        is_valid, error = ChatValidationService.validate_group_participants(
            user_ids,
            setup_data['project1'].id
        )
        
        assert is_valid is False
        assert "duplicate" in error.lower()
    
    def test_group_chat_all_must_be_project_members(self, setup_data):
        """Test that all group chat participants must be project members"""
        # user3 is not in project1
        user_ids = [
            setup_data['user1'].id,
            setup_data['user2'].id,
            setup_data['user3'].id
        ]
        
        is_valid, error = ChatValidationService.validate_group_participants(
            user_ids,
            setup_data['project1'].id
        )
        
        assert is_valid is False
        assert "not active members" in error.lower()
    
    def test_check_existing_private_chat(self, setup_data):
        """Test checking for existing private chat"""
        # Create a private chat
        chat = Chat.objects.create(
            project=setup_data['project1'],
            chat_type='private',
            created_by=setup_data['user1']
        )
        ChatParticipant.objects.create(chat=chat, user=setup_data['user1'])
        ChatParticipant.objects.create(chat=chat, user=setup_data['user2'])
        
        # Check if it exists
        existing_chat = ChatValidationService.check_existing_private_chat(
            setup_data['user1'],
            setup_data['user2'],
            setup_data['project1'].id
        )
        
        assert existing_chat is not None
        assert existing_chat.id == chat.id
    
    def test_no_existing_private_chat(self, setup_data):
        """Test when no private chat exists"""
        existing_chat = ChatValidationService.check_existing_private_chat(
            setup_data['user1'],
            setup_data['user2'],
            setup_data['project1'].id
        )
        
        assert existing_chat is None
    
    def test_can_user_access_chat(self, setup_data):
        """Test checking if a user can access a chat"""
        chat = Chat.objects.create(
            project=setup_data['project1'],
            chat_type='private',
            created_by=setup_data['user1']
        )
        ChatParticipant.objects.create(
            chat=chat,
            user=setup_data['user1'],
            is_active=True
        )
        
        # User1 can access
        assert ChatValidationService.can_user_access_chat(
            setup_data['user1'],
            chat
        ) is True
        
        # User2 cannot access
        assert ChatValidationService.can_user_access_chat(
            setup_data['user2'],
            chat
        ) is False
    
    def test_can_user_send_message(self, setup_data):
        """Test checking if a user can send a message"""
        chat = Chat.objects.create(
            project=setup_data['project1'],
            chat_type='private',
            created_by=setup_data['user1']
        )
        ChatParticipant.objects.create(
            chat=chat,
            user=setup_data['user1'],
            is_active=True
        )
        
        # User1 can send
        can_send, error = ChatValidationService.can_user_send_message(
            setup_data['user1'],
            chat
        )
        assert can_send is True
        assert error is None
        
        # User2 cannot send
        can_send, error = ChatValidationService.can_user_send_message(
            setup_data['user2'],
            chat
        )
        assert can_send is False
        assert "not an active participant" in error.lower()
    
    def test_can_add_participant_to_group_chat(self, setup_data):
        """Test adding a participant to a group chat"""
        chat = Chat.objects.create(
            project=setup_data['project1'],
            chat_type='group',
            name='Test Group',
            created_by=setup_data['user1']
        )
        ChatParticipant.objects.create(
            chat=chat,
            user=setup_data['user1'],
            is_active=True
        )
        
        # Can add user2
        can_add, error = ChatValidationService.can_add_participant(
            chat,
            setup_data['user2'],
            setup_data['user1']
        )
        assert can_add is True
        assert error is None
    
    def test_cannot_add_to_private_chat(self, setup_data):
        """Test that participants cannot be added to private chats"""
        chat = Chat.objects.create(
            project=setup_data['project1'],
            chat_type='private',
            created_by=setup_data['user1']
        )
        ChatParticipant.objects.create(chat=chat, user=setup_data['user1'])
        
        can_add, error = ChatValidationService.can_add_participant(
            chat,
            setup_data['user2'],
            setup_data['user1']
        )
        assert can_add is False
        assert "private chat" in error.lower()
    
    def test_cannot_add_already_participant(self, setup_data):
        """Test that a user cannot be added twice"""
        chat = Chat.objects.create(
            project=setup_data['project1'],
            chat_type='group',
            name='Test Group',
            created_by=setup_data['user1']
        )
        ChatParticipant.objects.create(chat=chat, user=setup_data['user1'])
        ChatParticipant.objects.create(chat=chat, user=setup_data['user2'])
        
        can_add, error = ChatValidationService.can_add_participant(
            chat,
            setup_data['user2'],
            setup_data['user1']
        )
        assert can_add is False
        assert "already a participant" in error.lower()

