from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from chat.models import Chat, ChatParticipant, Message, MessageStatus, ChatType
from core.models import Organization, Team, TeamMember, Project, ProjectMember

User = get_user_model()


class ChatModelTest(TestCase):
    """Test cases for Chat model creation and methods"""
    
    def setUp(self):
        # Create test organization
        self.organization = Organization.objects.create(name="Test Org")
        
        # Create test teams
        self.team1 = Team.objects.create(
            organization=self.organization,
            name="Team 1"
        )
        self.team2 = Team.objects.create(
            organization=self.organization,
            name="Team 2"
        )
        
        # Create test project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        # Create test users
        self.user1 = User.objects.create_user(
            email='user1@test.com',
            username='user1',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            email='user2@test.com',
            username='user2',
            password='testpass123'
        )
        self.user3 = User.objects.create_user(
            email='user3@test.com',
            username='user3',
            password='testpass123'
        )
        
        # Create team memberships
        TeamMember.objects.create(user=self.user1, team=self.team1)
        TeamMember.objects.create(user=self.user2, team=self.team1)
        TeamMember.objects.create(user=self.user3, team=self.team2)
        
        # Create project memberships
        ProjectMember.objects.create(
            user=self.user1,
            project=self.project,
            is_active=True
        )
        ProjectMember.objects.create(
            user=self.user2,
            project=self.project,
            is_active=True
        )
    
    def test_private_chat_creation(self):
        """Test creating a private chat"""
        chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
        
        self.assertEqual(chat.project, self.project)
        self.assertEqual(chat.type, ChatType.PRIVATE)
        self.assertIsNone(chat.name)
        self.assertIsNotNone(chat.created_at)
        self.assertIsNotNone(chat.updated_at)
        self.assertFalse(chat.is_deleted)
    
    def test_group_chat_creation(self):
        """Test creating a group chat with name"""
        chat = Chat.objects.create(
            project=self.project,
            type=ChatType.GROUP,
            name="Test Group Chat"
        )
        
        self.assertEqual(chat.type, ChatType.GROUP)
        self.assertEqual(chat.name, "Test Group Chat")
    
    def test_chat_string_representation(self):
        """Test chat string representation"""
        private_chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
        self.assertIn("Private Chat", str(private_chat))
        
        group_chat = Chat.objects.create(
            project=self.project,
            type=ChatType.GROUP,
            name="My Group"
        )
        self.assertIn("Group: My Group", str(group_chat))
    
    def test_can_users_chat_same_team(self):
        """Test that users in the same team can chat"""
        can_chat, reason = Chat.can_users_chat(self.user1, self.user2)
        self.assertTrue(can_chat)
        self.assertEqual(reason, "same_team")
    
    def test_can_users_chat_same_project(self):
        """Test that users in the same project can chat"""
        # user1 and user2 are in same project but different scenario
        can_chat, reason = Chat.can_users_chat(self.user1, self.user2)
        self.assertTrue(can_chat)
        # Will be same_team in this case since they're in team1
    
    def test_cannot_chat_no_common_team_or_project(self):
        """Test that users with no common team or project cannot chat"""
        # user3 is in team2, user1 is in team1
        # user3 is not in project
        can_chat, reason = Chat.can_users_chat(self.user1, self.user3)
        self.assertFalse(can_chat)
        self.assertEqual(reason, "no_common_team_or_project")
    
    def test_get_participant_users(self):
        """Test getting participant users from a chat"""
        chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
        
        ChatParticipant.objects.create(chat=chat, user=self.user1)
        ChatParticipant.objects.create(chat=chat, user=self.user2)
        
        participants = chat.get_participant_users()
        self.assertEqual(len(participants), 2)
        self.assertIn(self.user1, participants)
        self.assertIn(self.user2, participants)
    
    def test_is_user_participant(self):
        """Test checking if user is a participant"""
        chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
        
        ChatParticipant.objects.create(chat=chat, user=self.user1)
        
        self.assertTrue(chat.is_user_participant(self.user1))
        self.assertFalse(chat.is_user_participant(self.user2))


class ChatParticipantModelTest(TestCase):
    """Test cases for ChatParticipant model"""
    
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            email='test@test.com',
            username='testuser',
            password='testpass123'
        )
        self.chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
    
    def test_participant_creation(self):
        """Test creating a chat participant"""
        participant = ChatParticipant.objects.create(
            chat=self.chat,
            user=self.user
        )
        
        self.assertEqual(participant.chat, self.chat)
        self.assertEqual(participant.user, self.user)
        self.assertTrue(participant.is_active)
        self.assertIsNotNone(participant.joined_at)
        self.assertIsNone(participant.last_read_at)
    
    def test_participant_unique_constraint(self):
        """Test that a user can only participate once per chat"""
        ChatParticipant.objects.create(chat=self.chat, user=self.user)
        
        with self.assertRaises(Exception):
            ChatParticipant.objects.create(chat=self.chat, user=self.user)
    
    def test_get_unread_count_never_read(self):
        """Test unread count when user has never read messages"""
        participant = ChatParticipant.objects.create(
            chat=self.chat,
            user=self.user
        )
        
        other_user = User.objects.create_user(
            email='other@test.com',
            username='otheruser',
            password='testpass123'
        )
        
        # Create 3 messages from other user
        for i in range(3):
            Message.objects.create(
                chat=self.chat,
                sender=other_user,
                content=f"Message {i}"
            )
        
        # Should have 3 unread messages
        self.assertEqual(participant.get_unread_count(), 3)
    
    def test_get_unread_count_with_last_read(self):
        """Test unread count with last_read_at set"""
        participant = ChatParticipant.objects.create(
            chat=self.chat,
            user=self.user
        )
        
        other_user = User.objects.create_user(
            email='other@test.com',
            username='otheruser',
            password='testpass123'
        )
        
        # Create old message
        old_message = Message.objects.create(
            chat=self.chat,
            sender=other_user,
            content="Old message"
        )
        
        # Set last_read_at to after old message
        participant.last_read_at = timezone.now()
        participant.save()
        
        # Create new message
        Message.objects.create(
            chat=self.chat,
            sender=other_user,
            content="New message"
        )
        
        # Should have 1 unread message
        self.assertEqual(participant.get_unread_count(), 1)


class MessageModelTest(TestCase):
    """Test cases for Message model"""
    
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            email='test@test.com',
            username='testuser',
            password='testpass123'
        )
        self.chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
    
    def test_message_creation(self):
        """Test creating a message"""
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            content="Hello, World!"
        )
        
        self.assertEqual(message.chat, self.chat)
        self.assertEqual(message.sender, self.user)
        self.assertEqual(message.content, "Hello, World!")
        self.assertIsNotNone(message.created_at)
        self.assertFalse(message.is_deleted)
    
    def test_message_string_representation(self):
        """Test message string representation"""
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            content="Test message"
        )
        
        self.assertIn(self.user.email, str(message))
        self.assertIn("Test message", str(message))
    
    def test_message_long_content_preview(self):
        """Test that long messages are truncated in string representation"""
        long_content = "A" * 100
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            content=long_content
        )
        
        # String representation should truncate to 50 chars + '...'
        self.assertIn("...", str(message))


class MessageStatusModelTest(TestCase):
    """Test cases for MessageStatus model"""
    
    def setUp(self):
        self.organization = Organization.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.sender = User.objects.create_user(
            email='sender@test.com',
            username='sender',
            password='testpass123'
        )
        self.recipient = User.objects.create_user(
            email='recipient@test.com',
            username='recipient',
            password='testpass123'
        )
        self.chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
        self.message = Message.objects.create(
            chat=self.chat,
            sender=self.sender,
            content="Test message"
        )
    
    def test_message_status_creation(self):
        """Test creating a message status"""
        status = MessageStatus.objects.create(
            message=self.message,
            user=self.recipient
        )
        
        self.assertEqual(status.message, self.message)
        self.assertEqual(status.user, self.recipient)
        self.assertEqual(status.status, 'sent')
        self.assertIsNone(status.delivered_at)
        self.assertIsNone(status.read_at)
    
    def test_message_status_unique_constraint(self):
        """Test that each user can only have one status per message"""
        MessageStatus.objects.create(
            message=self.message,
            user=self.recipient
        )
        
        with self.assertRaises(Exception):
            MessageStatus.objects.create(
                message=self.message,
                user=self.recipient
            )
    
    def test_mark_as_delivered(self):
        """Test marking message as delivered"""
        status = MessageStatus.objects.create(
            message=self.message,
            user=self.recipient,
            status='sent'
        )
        
        status.mark_as_delivered()
        status.refresh_from_db()
        
        self.assertEqual(status.status, 'delivered')
        self.assertIsNotNone(status.delivered_at)
        self.assertIsNone(status.read_at)
    
    def test_mark_as_read(self):
        """Test marking message as read"""
        status = MessageStatus.objects.create(
            message=self.message,
            user=self.recipient,
            status='sent'
        )
        
        status.mark_as_read()
        status.refresh_from_db()
        
        self.assertEqual(status.status, 'read')
        self.assertIsNotNone(status.delivered_at)
        self.assertIsNotNone(status.read_at)
    
    def test_mark_as_read_sets_delivered_at(self):
        """Test that marking as read also sets delivered_at if not set"""
        status = MessageStatus.objects.create(
            message=self.message,
            user=self.recipient,
            status='sent'
        )
        
        status.mark_as_read()
        status.refresh_from_db()
        
        # Both should be set
        self.assertIsNotNone(status.delivered_at)
        self.assertIsNotNone(status.read_at)
        # They should be the same since it went directly to read
        self.assertEqual(status.delivered_at, status.read_at)
    
    def test_get_status_for_user(self):
        """Test getting status for a specific user"""
        MessageStatus.objects.create(
            message=self.message,
            user=self.recipient,
            status='delivered'
        )
        
        status = self.message.get_status_for_user(self.recipient)
        self.assertEqual(status, 'delivered')
        
        # Non-existent status
        other_user = User.objects.create_user(
            email='other@test.com',
            username='other',
            password='testpass123'
        )
        status = self.message.get_status_for_user(other_user)
        self.assertIsNone(status)

