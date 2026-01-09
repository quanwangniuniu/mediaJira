"""
Business logic and validation services for chat functionality.
"""

from django.db.models import Q
from core.models import ProjectMember
from .models import Chat, ChatParticipant


class ChatValidationService:
    """
    Service class for validating chat operations.
    Enforces business rules: same Organization + same Project.
    """
    
    @staticmethod
    def can_users_chat_in_project(user1, user2, project_id):
        """
        Validate if two users can create a private chat in a project.
        
        Business Rules:
        - Both users must be active members of the project
        - Both users must be in the same organization
        
        Args:
            user1: First user
            user2: Second user
            project_id: Project ID
            
        Returns:
            tuple: (bool: is_valid, str: error_message or None)
        """
        if user1.id == user2.id:
            return False, "Cannot create a chat with yourself"
        
        # Check if both users are active project members
        members = ProjectMember.objects.filter(
            project_id=project_id,
            is_active=True,
            user__in=[user1, user2]
        ).select_related('user__organization', 'project__organization')
        
        if members.count() != 2:
            return False, "Both users must be active members of the project"
        
        # Check if both users are in the same organization
        orgs = set(m.user.organization_id for m in members)
        if len(orgs) != 1:
            return False, "Users must be in the same organization"
        
        return True, None
    
    @staticmethod
    def validate_group_participants(user_ids, project_id):
        """
        Validate participants for a group chat.
        
        Business Rules:
        - All users must be active members of the project
        - All users must be in the same organization
        - Minimum 2 participants required
        
        Args:
            user_ids: List of user IDs
            project_id: Project ID
            
        Returns:
            tuple: (bool: is_valid, str: error_message or None)
        """
        if len(user_ids) < 2:
            return False, "Group chat must have at least 2 participants"
        
        # Check for duplicate user IDs
        if len(user_ids) != len(set(user_ids)):
            return False, "Duplicate participants are not allowed"
        
        # Check if all users are active project members
        members = ProjectMember.objects.filter(
            project_id=project_id,
            is_active=True,
            user_id__in=user_ids
        ).select_related('user__organization')
        
        if members.count() != len(user_ids):
            missing_count = len(user_ids) - members.count()
            return False, f"{missing_count} user(s) are not active members of the project"
        
        # Check if all users are in the same organization
        orgs = set(m.user.organization_id for m in members)
        if len(orgs) != 1:
            return False, "All participants must be in the same organization"
        
        return True, None
    
    @staticmethod
    def check_existing_private_chat(user1, user2, project_id):
        """
        Check if a private chat already exists between two users in a project.
        
        Args:
            user1: First user
            user2: Second user
            project_id: Project ID
            
        Returns:
            Chat instance or None
        """
        # Find private chats in the project with exactly these two users
        chats = Chat.objects.filter(
            project_id=project_id,
            chat_type='private'
        ).annotate(
            participant_count=models.Count('participants')
        ).filter(
            participant_count=2,
            participants__user__in=[user1, user2]
        ).distinct()
        
        for chat in chats:
            participant_ids = set(
                chat.participants.values_list('user_id', flat=True)
            )
            if participant_ids == {user1.id, user2.id}:
                return chat
        
        return None
    
    @staticmethod
    def can_user_access_chat(user, chat):
        """
        Check if a user has access to a specific chat.
        
        Args:
            user: User to check
            chat: Chat instance
            
        Returns:
            bool: True if user has access
        """
        # Check if user is an active participant
        return ChatParticipant.objects.filter(
            chat=chat,
            user=user,
            is_active=True
        ).exists()
    
    @staticmethod
    def can_user_send_message(user, chat):
        """
        Check if a user can send a message in a chat.
        
        Args:
            user: User to check
            chat: Chat instance
            
        Returns:
            tuple: (bool: can_send, str: error_message or None)
        """
        # Check if user is an active participant
        is_participant = ChatParticipant.objects.filter(
            chat=chat,
            user=user,
            is_active=True
        ).exists()
        
        if not is_participant:
            return False, "User is not an active participant of this chat"
        
        # Check if user is still a project member
        is_project_member = ProjectMember.objects.filter(
            project=chat.project,
            user=user,
            is_active=True
        ).exists()
        
        if not is_project_member:
            return False, "User is no longer a member of the project"
        
        return True, None
    
    @staticmethod
    def can_add_participant(chat, new_user, requesting_user):
        """
        Check if a user can be added to a chat.
        
        Args:
            chat: Chat instance
            new_user: User to be added
            requesting_user: User requesting the addition
            
        Returns:
            tuple: (bool: can_add, str: error_message or None)
        """
        # Only group chats can have participants added
        if chat.chat_type != 'group':
            return False, "Cannot add participants to private chats"
        
        # Check if requesting user has permission (must be participant or creator)
        is_authorized = (
            chat.created_by == requesting_user or
            ChatParticipant.objects.filter(
                chat=chat,
                user=requesting_user,
                is_active=True
            ).exists()
        )
        
        if not is_authorized:
            return False, "You do not have permission to add participants"
        
        # Check if new user is already a participant
        already_participant = ChatParticipant.objects.filter(
            chat=chat,
            user=new_user
        ).exists()
        
        if already_participant:
            return False, "User is already a participant"
        
        # Check if new user is a project member
        is_project_member = ProjectMember.objects.filter(
            project=chat.project,
            user=new_user,
            is_active=True
        ).exists()
        
        if not is_project_member:
            return False, "User must be a member of the project"
        
        # Check if new user is in the same organization
        if new_user.organization_id != requesting_user.organization_id:
            return False, "User must be in the same organization"
        
        return True, None


# Import models for type checking
from django.db import models

