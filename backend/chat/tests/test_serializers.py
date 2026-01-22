import logging
from io import BytesIO
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIRequestFactory
from core.models import Project, Organization
from chat.models import Chat, ChatParticipant, Message, MessageAttachment, ChatType
from chat.serializers import (
    MessageAttachmentSerializer,
    AttachmentUploadSerializer,
    MessageWithAttachmentsSerializer,
    MessageCreateWithAttachmentsSerializer,
    ChatSerializer,
    ChatListSerializer,
    MessageSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class MessageAttachmentSerializerTest(TestCase):
    """Test cases for MessageAttachmentSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        self.chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
        ChatParticipant.objects.create(chat=self.chat, user=self.user, is_active=True)
        
        self.message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            content='Test message with attachment'
        )
        
        # Create a test attachment
        self.attachment = MessageAttachment.objects.create(
            message=self.message,
            uploader=self.user,
            file=SimpleUploadedFile('test.txt', b'test content'),
            file_type='document',
            file_size=12,
            original_filename='test.txt',
            mime_type='text/plain'
        )
        
        # Create request factory
        self.factory = APIRequestFactory()
    
    def test_serializer_fields(self):
        """Test that serializer returns correct fields"""
        request = self.factory.get('/')
        request.user = self.user
        
        serializer = MessageAttachmentSerializer(
            self.attachment,
            context={'request': request}
        )
        data = serializer.data
        
        self.assertIn('id', data)
        self.assertIn('message', data)
        self.assertIn('file_type', data)
        self.assertIn('file_url', data)
        self.assertIn('thumbnail_url', data)
        self.assertIn('file_size', data)
        self.assertIn('file_size_display', data)
        self.assertIn('original_filename', data)
        self.assertIn('mime_type', data)
        self.assertIn('created_at', data)
    
    def test_file_url_is_absolute(self):
        """Test that file_url returns an absolute URL"""
        request = self.factory.get('/')
        request.user = self.user
        
        serializer = MessageAttachmentSerializer(
            self.attachment,
            context={'request': request}
        )
        data = serializer.data
        
        self.assertIsNotNone(data['file_url'])
        self.assertTrue(data['file_url'].startswith('http'))
    
    def test_file_size_display_format(self):
        """Test that file_size_display is human readable"""
        request = self.factory.get('/')
        request.user = self.user
        
        serializer = MessageAttachmentSerializer(
            self.attachment,
            context={'request': request}
        )
        data = serializer.data
        
        # 12 bytes should be displayed as "12 B"
        self.assertEqual(data['file_size_display'], '12 B')


class AttachmentUploadSerializerTest(TestCase):
    """Test cases for AttachmentUploadSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        self.factory = APIRequestFactory()
    
    def test_upload_image(self):
        """Test uploading an image file"""
        # Create a simple PNG image
        image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
        image_file = SimpleUploadedFile(
            'test.png',
            image_content,
            content_type='image/png'
        )
        
        request = self.factory.post('/')
        request.user = self.user
        
        serializer = AttachmentUploadSerializer(
            data={'file': image_file},
            context={'request': request}
        )
        
        self.assertTrue(serializer.is_valid(), serializer.errors)
        attachment = serializer.save()
        
        self.assertEqual(attachment.uploader, self.user)
        self.assertEqual(attachment.file_type, 'image')
        self.assertEqual(attachment.original_filename, 'test.png')
        self.assertEqual(attachment.mime_type, 'image/png')
        self.assertGreater(attachment.file_size, 0)
    
    def test_upload_document(self):
        """Test uploading a document file"""
        doc_file = SimpleUploadedFile(
            'test.pdf',
            b'%PDF-1.4 test content',
            content_type='application/pdf'
        )
        
        request = self.factory.post('/')
        request.user = self.user
        
        serializer = AttachmentUploadSerializer(
            data={'file': doc_file},
            context={'request': request}
        )
        
        self.assertTrue(serializer.is_valid(), serializer.errors)
        attachment = serializer.save()
        
        self.assertEqual(attachment.file_type, 'document')
        self.assertEqual(attachment.mime_type, 'application/pdf')
    
    def test_upload_video(self):
        """Test uploading a video file"""
        video_file = SimpleUploadedFile(
            'test.mp4',
            b'video content',
            content_type='video/mp4'
        )
        
        request = self.factory.post('/')
        request.user = self.user
        
        serializer = AttachmentUploadSerializer(
            data={'file': video_file},
            context={'request': request}
        )
        
        self.assertTrue(serializer.is_valid(), serializer.errors)
        attachment = serializer.save()
        
        self.assertEqual(attachment.file_type, 'video')


class MessageWithAttachmentsSerializerTest(TestCase):
    """Test cases for MessageWithAttachmentsSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        self.chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
        ChatParticipant.objects.create(chat=self.chat, user=self.user, is_active=True)
        
        self.message = Message.objects.create(
            chat=self.chat,
            sender=self.user,
            content='Test message'
        )
        
        # Create attachments
        self.attachment1 = MessageAttachment.objects.create(
            message=self.message,
            uploader=self.user,
            file=SimpleUploadedFile('file1.txt', b'content1'),
            file_type='document',
            file_size=8,
            original_filename='file1.txt',
            mime_type='text/plain'
        )
        self.attachment2 = MessageAttachment.objects.create(
            message=self.message,
            uploader=self.user,
            file=SimpleUploadedFile('file2.txt', b'content2'),
            file_type='document',
            file_size=8,
            original_filename='file2.txt',
            mime_type='text/plain'
        )
        
        self.factory = APIRequestFactory()
    
    def test_includes_attachments(self):
        """Test that serializer includes attachments"""
        request = self.factory.get('/')
        request.user = self.user
        
        serializer = MessageWithAttachmentsSerializer(
            self.message,
            context={'request': request}
        )
        data = serializer.data
        
        self.assertIn('attachments', data)
        self.assertEqual(len(data['attachments']), 2)
    
    def test_attachment_details(self):
        """Test that attachment details are correct"""
        request = self.factory.get('/')
        request.user = self.user
        
        serializer = MessageWithAttachmentsSerializer(
            self.message,
            context={'request': request}
        )
        data = serializer.data
        
        attachment_data = data['attachments'][0]
        self.assertIn('file_url', attachment_data)
        self.assertIn('original_filename', attachment_data)


class MessageCreateWithAttachmentsSerializerTest(TestCase):
    """Test cases for MessageCreateWithAttachmentsSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(name="Test Org")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        self.chat = Chat.objects.create(
            project=self.project,
            type=ChatType.PRIVATE
        )
        ChatParticipant.objects.create(chat=self.chat, user=self.user, is_active=True)
        
        # Create unlinked attachment
        self.unlinked_attachment = MessageAttachment.objects.create(
            message=None,  # Unlinked
            uploader=self.user,
            file=SimpleUploadedFile('unlinked.txt', b'content'),
            file_type='document',
            file_size=7,
            original_filename='unlinked.txt',
            mime_type='text/plain'
        )
        
        self.factory = APIRequestFactory()
    
    def test_create_message_with_content(self):
        """Test creating a message with text content"""
        request = self.factory.post('/')
        request.user = self.user
        
        serializer = MessageCreateWithAttachmentsSerializer(
            data={
                'chat': self.chat.id,
                'content': 'Test message content'
            },
            context={'request': request}
        )
        
        self.assertTrue(serializer.is_valid(), serializer.errors)
        message = serializer.save()
        
        self.assertEqual(message.content, 'Test message content')
        self.assertEqual(message.sender, self.user)
    
    def test_create_message_with_attachments(self):
        """Test creating a message with attachments"""
        request = self.factory.post('/')
        request.user = self.user
        
        serializer = MessageCreateWithAttachmentsSerializer(
            data={
                'chat': self.chat.id,
                'content': 'Message with attachment',
                'attachment_ids': [self.unlinked_attachment.id]
            },
            context={'request': request}
        )
        
        self.assertTrue(serializer.is_valid(), serializer.errors)
        message = serializer.save()
        
        # Refresh attachment from DB
        self.unlinked_attachment.refresh_from_db()
        
        self.assertEqual(message.attachments.count(), 1)
        self.assertEqual(self.unlinked_attachment.message, message)
    
    def test_require_content_or_attachments(self):
        """Test that either content or attachments is required"""
        request = self.factory.post('/')
        request.user = self.user
        
        serializer = MessageCreateWithAttachmentsSerializer(
            data={
                'chat': self.chat.id,
                'content': '',
                'attachment_ids': []
            },
            context={'request': request}
        )
        
        self.assertFalse(serializer.is_valid())
    
    def test_non_participant_cannot_send(self):
        """Test that non-participant cannot send message"""
        other_user = User.objects.create_user(
            email='other@example.com',
            username='other',
            password='testpass123'
        )
        
        request = self.factory.post('/')
        request.user = other_user
        
        serializer = MessageCreateWithAttachmentsSerializer(
            data={
                'chat': self.chat.id,
                'content': 'Test'
            },
            context={'request': request}
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('chat', serializer.errors)

