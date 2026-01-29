import logging
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from core.models import Project, Organization, Team, TeamMember, ProjectMember
from chat.models import Chat, ChatParticipant, Message, MessageStatus, ChatType

User = get_user_model()
logger = logging.getLogger(__name__)


class ChatAPITest(TestCase):
    """Test Chat API endpoints"""
    
    def setUp(self):
        """Set up test data"""
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
        self.user3 = User.objects.create_user(
            email='user3@example.com',
            username='user3',
            password='testpass123'
        )
        
        # Create test organization
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        
        # Create test team
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        # Add users to team
        TeamMember.objects.create(user=self.user1, team=self.team)
        TeamMember.objects.create(user=self.user2, team=self.team)
        
        # Add users to project
        ProjectMember.objects.create(user=self.user1, project=self.project, role='Team Leader', is_active=True)
        ProjectMember.objects.create(user=self.user2, project=self.project, role='member', is_active=True)
        
        # Setup API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)
    
    def test_create_private_chat(self):
        """Test creating a private chat"""
        url = reverse('chat-list')
        data = {
            'project': self.project.id,
            'type': ChatType.PRIVATE,
            'participant_ids': [self.user2.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['type'], ChatType.PRIVATE)
        self.assertEqual(response.data['project'], self.project.id)
        self.assertEqual(len(response.data['participants']), 2)
        
        # Verify chat was created
        chat = Chat.objects.get(id=response.data['id'])
        self.assertEqual(chat.type, ChatType.PRIVATE)
        self.assertEqual(chat.participants.filter(is_active=True).count(), 2)
    
    def test_create_group_chat(self):
        """Test creating a group chat"""
        # Add user3 to project
        ProjectMember.objects.create(user=self.user3, project=self.project, role='member', is_active=True)
        
        url = reverse('chat-list')
        data = {
            'project': self.project.id,
            'type': ChatType.GROUP,
            'name': 'Test Group',
            'participant_ids': [self.user2.id, self.user3.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['type'], ChatType.GROUP)
        self.assertEqual(response.data['name'], 'Test Group')
        self.assertEqual(len(response.data['participants']), 3)  # user1, user2, user3
    
    def test_create_group_chat_without_name(self):
        """Test creating a group chat without a name fails"""
        url = reverse('chat-list')
        data = {
            'project': self.project.id,
            'type': ChatType.GROUP,
            'participant_ids': [self.user2.id]
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', str(response.data))
    
    def test_create_private_chat_with_non_project_member(self):
        """Test creating a private chat with user not in project fails"""
        url = reverse('chat-list')
        data = {
            'project': self.project.id,
            'type': ChatType.PRIVATE,
            'participant_ids': [self.user3.id]  # user3 not in project
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_chats(self):
        """Test listing user's chats"""
        # Create a chat
        chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user2, is_active=True)
        
        url = reverse('chat-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_retrieve_chat(self):
        """Test retrieving a specific chat"""
        # Create a chat
        chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user2, is_active=True)
        
        url = reverse('chat-detail', kwargs={'pk': chat.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], chat.id)
        self.assertEqual(len(response.data['participants']), 2)
    
    def test_retrieve_chat_without_permission(self):
        """Test retrieving a chat user is not part of fails"""
        # Create a chat without user1
        chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=chat, user=self.user2, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user3, is_active=True)
        
        url = reverse('chat-detail', kwargs={'pk': chat.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_add_participant_to_group_chat(self):
        """Test adding a participant to a group chat"""
        # Add user3 to project
        ProjectMember.objects.create(user=self.user3, project=self.project, role='member', is_active=True)
        
        # Create a group chat
        chat = Chat.objects.create(project=self.project, type=ChatType.GROUP, name='Test Group')
        ChatParticipant.objects.create(chat=chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user2, is_active=True)
        
        url = reverse('chat-add-participant', kwargs={'pk': chat.id})
        data = {'user_id': self.user3.id}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(chat.participants.filter(is_active=True).count(), 3)
    
    def test_add_participant_to_private_chat_fails(self):
        """Test adding a participant to a private chat fails"""
        # Create a private chat
        chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user2, is_active=True)
        
        url = reverse('chat-add-participant', kwargs={'pk': chat.id})
        data = {'user_id': self.user3.id}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_remove_participant_from_group_chat(self):
        """Test removing a participant from a group chat"""
        # Create a group chat
        chat = Chat.objects.create(project=self.project, type=ChatType.GROUP, name='Test Group')
        ChatParticipant.objects.create(chat=chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user2, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user3, is_active=True)
        
        url = reverse('chat-remove-participant', kwargs={'pk': chat.id})
        data = {'user_id': self.user3.id}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify participant was soft-deleted
        participant = ChatParticipant.objects.get(chat=chat, user=self.user3)
        self.assertFalse(participant.is_active)
    
    def test_leave_chat(self):
        """Test user leaving a chat"""
        # Create a chat
        chat = Chat.objects.create(project=self.project, type=ChatType.GROUP, name='Test Group')
        ChatParticipant.objects.create(chat=chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user2, is_active=True)
        
        url = reverse('chat-detail', kwargs={'pk': chat.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify user left the chat
        participant = ChatParticipant.objects.get(chat=chat, user=self.user1)
        self.assertFalse(participant.is_active)
    
    def test_mark_chat_as_read(self):
        """Test marking all messages in a chat as read"""
        # Create a chat
        chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=chat, user=self.user2, is_active=True)
        
        # Create a message
        message = Message.objects.create(chat=chat, sender=self.user2, content='Test message')
        MessageStatus.objects.create(message=message, user=self.user1, status='sent')
        
        url = reverse('chat-mark-as-read', kwargs={'pk': chat.id})
        response = self.client.post(url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify message status was updated
        msg_status = MessageStatus.objects.get(message=message, user=self.user1)
        self.assertEqual(msg_status.status, 'read')
        self.assertIsNotNone(msg_status.read_at)


class MessageAPITest(TestCase):
    """Test Message API endpoints"""
    
    def setUp(self):
        """Set up test data"""
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
        
        # Create test organization
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        
        # Create test team
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        # Add users to team and project
        TeamMember.objects.create(user=self.user1, team=self.team)
        TeamMember.objects.create(user=self.user2, team=self.team)
        ProjectMember.objects.create(user=self.user1, project=self.project, role='Team Leader', is_active=True)
        ProjectMember.objects.create(user=self.user2, project=self.project, role='member', is_active=True)
        
        # Create a chat
        self.chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=self.chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=self.chat, user=self.user2, is_active=True)
        
        # Setup API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)
    
    def test_send_message(self):
        """Test sending a message"""
        url = reverse('message-list')
        data = {
            'chat': self.chat.id,
            'content': 'Hello, this is a test message!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['content'], 'Hello, this is a test message!')
        self.assertEqual(response.data['sender']['id'], self.user1.id)
        self.assertEqual(response.data['chat'], self.chat.id)
        
        # Verify message was created
        message = Message.objects.get(id=response.data['id'])
        self.assertEqual(message.content, 'Hello, this is a test message!')
        self.assertEqual(message.sender, self.user1)
        
        # Verify message status was created for recipient
        msg_status = MessageStatus.objects.filter(message=message, user=self.user2)
        self.assertEqual(msg_status.count(), 1)
    
    def test_send_empty_message_fails(self):
        """Test sending an empty message fails"""
        url = reverse('message-list')
        data = {
            'chat': self.chat.id,
            'content': ''
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_send_message_to_unauthorized_chat(self):
        """Test sending a message to a chat user is not part of fails"""
        # Create another chat without user1
        other_chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=other_chat, user=self.user2, is_active=True)
        
        url = reverse('message-list')
        data = {
            'chat': other_chat.id,
            'content': 'Hello!'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_messages(self):
        """Test listing messages for a chat"""
        # Create some messages
        Message.objects.create(chat=self.chat, sender=self.user1, content='Message 1')
        Message.objects.create(chat=self.chat, sender=self.user2, content='Message 2')
        Message.objects.create(chat=self.chat, sender=self.user1, content='Message 3')
        
        url = reverse('message-list')
        response = self.client.get(url, {'chat_id': self.chat.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
    
    def test_list_messages_without_chat_id(self):
        """Test listing messages without chat_id fails"""
        url = reverse('message-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_list_messages_with_cursor_pagination(self):
        """Test cursor-based pagination for messages"""
        # Create messages
        msg1 = Message.objects.create(chat=self.chat, sender=self.user1, content='Message 1')
        msg2 = Message.objects.create(chat=self.chat, sender=self.user2, content='Message 2')
        msg3 = Message.objects.create(chat=self.chat, sender=self.user1, content='Message 3')
        
        # Get messages before msg3
        url = reverse('message-list')
        response = self.client.get(url, {
            'chat_id': self.chat.id,
            'before': msg3.created_at.isoformat(),
            'page_size': 2
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_retrieve_message(self):
        """Test retrieving a specific message"""
        message = Message.objects.create(chat=self.chat, sender=self.user1, content='Test message')
        
        url = reverse('message-detail', kwargs={'pk': message.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], message.id)
        self.assertEqual(response.data['content'], 'Test message')
    
    def test_mark_message_as_read(self):
        """Test marking a message as read"""
        message = Message.objects.create(chat=self.chat, sender=self.user2, content='Test message')
        MessageStatus.objects.create(message=message, user=self.user1, status='sent')
        
        url = reverse('message-mark-as-read', kwargs={'pk': message.id})
        response = self.client.post(url, {}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify message status was updated
        msg_status = MessageStatus.objects.get(message=message, user=self.user1)
        self.assertEqual(msg_status.status, 'read')
        self.assertIsNotNone(msg_status.read_at)
    
    def test_get_unread_count(self):
        """Test getting unread message count"""
        # Create messages from user2
        msg1 = Message.objects.create(chat=self.chat, sender=self.user2, content='Message 1')
        msg2 = Message.objects.create(chat=self.chat, sender=self.user2, content='Message 2')
        
        MessageStatus.objects.create(message=msg1, user=self.user1, status='sent')
        MessageStatus.objects.create(message=msg2, user=self.user1, status='sent')
        
        url = reverse('message-unread-count')
        response = self.client.get(url, {'chat_id': self.chat.id})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['unread_count'], 2)


class AttachmentAPITest(TestCase):
    """Test Attachment API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from chat.models import MessageAttachment
        
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
        
        # Create test organization
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        
        # Create test team
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )
        
        # Create test project
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        # Add users to team and project
        TeamMember.objects.create(user=self.user1, team=self.team)
        TeamMember.objects.create(user=self.user2, team=self.team)
        ProjectMember.objects.create(user=self.user1, project=self.project, role='owner', is_active=True)
        ProjectMember.objects.create(user=self.user2, project=self.project, role='member', is_active=True)
        
        # Create a chat
        self.chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=self.chat, user=self.user1, is_active=True)
        ChatParticipant.objects.create(chat=self.chat, user=self.user2, is_active=True)
        
        # Setup API client
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)
    
    def test_upload_attachment(self):
        """Test uploading an attachment"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        test_file = SimpleUploadedFile(
            'test.txt',
            b'Test file content',
            content_type='text/plain'
        )
        
        url = reverse('attachment-list')
        response = self.client.post(url, {'file': test_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['original_filename'], 'test.txt')
        self.assertEqual(response.data['file_type'], 'document')
        self.assertIn('file_url', response.data)
        self.assertIn('file_size_display', response.data)
    
    def test_upload_image(self):
        """Test uploading an image attachment"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        
        # Create a minimal PNG file
        image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR'
        image_file = SimpleUploadedFile(
            'test.png',
            image_content,
            content_type='image/png'
        )
        
        url = reverse('attachment-list')
        response = self.client.post(url, {'file': image_file}, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['file_type'], 'image')
    
    def test_get_attachment(self):
        """Test retrieving an attachment"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from chat.models import MessageAttachment
        
        attachment = MessageAttachment.objects.create(
            uploader=self.user1,
            file=SimpleUploadedFile('test.txt', b'content'),
            file_type='document',
            file_size=7,
            original_filename='test.txt',
            mime_type='text/plain'
        )
        
        url = reverse('attachment-detail', kwargs={'pk': attachment.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], attachment.id)
    
    def test_delete_unlinked_attachment(self):
        """Test deleting an unlinked attachment"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from chat.models import MessageAttachment
        
        attachment = MessageAttachment.objects.create(
            uploader=self.user1,
            file=SimpleUploadedFile('test.txt', b'content'),
            file_type='document',
            file_size=7,
            original_filename='test.txt',
            mime_type='text/plain',
            message=None  # Unlinked
        )
        
        url = reverse('attachment-detail', kwargs={'pk': attachment.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(MessageAttachment.objects.filter(id=attachment.id).exists())
    
    def test_cannot_delete_linked_attachment(self):
        """Test that linked attachments cannot be deleted"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from chat.models import MessageAttachment
        
        message = Message.objects.create(
            chat=self.chat,
            sender=self.user1,
            content='Test'
        )
        
        attachment = MessageAttachment.objects.create(
            uploader=self.user1,
            message=message,  # Linked to message
            file=SimpleUploadedFile('test.txt', b'content'),
            file_type='document',
            file_size=7,
            original_filename='test.txt',
            mime_type='text/plain'
        )
        
        url = reverse('attachment-detail', kwargs={'pk': attachment.id})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Attachment should still exist
        self.assertTrue(MessageAttachment.objects.filter(id=attachment.id).exists())
    
    def test_send_message_with_attachments(self):
        """Test sending a message with attachments"""
        from django.core.files.uploadedfile import SimpleUploadedFile
        from chat.models import MessageAttachment
        
        # Create unlinked attachment
        attachment = MessageAttachment.objects.create(
            uploader=self.user1,
            file=SimpleUploadedFile('test.txt', b'content'),
            file_type='document',
            file_size=7,
            original_filename='test.txt',
            mime_type='text/plain',
            message=None
        )
        
        url = reverse('message-list')
        response = self.client.post(url, {
            'chat': self.chat.id,
            'content': 'Message with attachment',
            'attachment_ids': [attachment.id]
        }, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify attachment is linked
        attachment.refresh_from_db()
        self.assertEqual(attachment.message.id, response.data['id'])
        self.assertEqual(len(response.data['attachments']), 1)

