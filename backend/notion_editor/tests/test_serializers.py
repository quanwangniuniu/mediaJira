"""
Tests for notion_editor serializers
"""
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from notion_editor.models import Draft, ContentBlock, BlockAction, DraftRevision
from notion_editor.serializers import (
    DraftSerializer, DraftListSerializer, CreateDraftSerializer, UpdateDraftSerializer,
    ContentBlockSerializer, BlockActionSerializer, BlockActionCreateSerializer
)

User = get_user_model()


class DraftSerializerTest(TestCase):
    """Test cases for Draft serializers"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.draft_data = {
            'title': 'Test Draft',
            'user': self.user,
            'status': 'draft',
            'content_blocks': [
                {
                    'type': 'text',
                    'content': 'This is a test block',
                    'id': 'block_1'
                }
            ]
        }
        self.draft = Draft.objects.create(**self.draft_data)
    
    def test_draft_serializer(self):
        """Test DraftSerializer serialization"""
        serializer = DraftSerializer(self.draft)
        data = serializer.data
        
        self.assertEqual(data['id'], self.draft.id)
        self.assertEqual(data['title'], 'Test Draft')
        self.assertEqual(data['user'], self.user.id)
        self.assertEqual(data['status'], 'draft')
        self.assertEqual(data['content_blocks_count'], 1)
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)
        self.assertFalse(data['is_deleted'])
    
    def test_draft_serializer_with_blocks(self):
        """Test DraftSerializer with content blocks"""
        # Create a content block
        content_block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'},
            order=1
        )
        
        # Create a block action
        BlockAction.objects.create(
            block=content_block,
            action_type='edit',
            label='Edit',
            icon='edit'
        )
        
        serializer = DraftSerializer(self.draft)
        data = serializer.data
        
        self.assertEqual(len(data['blocks']), 1)
        self.assertEqual(data['blocks'][0]['block_type'], 'text')
        self.assertEqual(len(data['blocks'][0]['actions']), 1)
        self.assertEqual(data['blocks'][0]['actions'][0]['action_type'], 'edit')
    
    def test_draft_list_serializer(self):
        """Test DraftListSerializer"""
        serializer = DraftListSerializer(self.draft)
        data = serializer.data
        
        self.assertEqual(data['id'], self.draft.id)
        self.assertEqual(data['title'], 'Test Draft')
        self.assertEqual(data['user_email'], 'test@example.com')
        self.assertEqual(data['status'], 'draft')
        self.assertEqual(data['content_blocks_count'], 1)
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)
        # Should not include full content_blocks or blocks
        self.assertNotIn('content_blocks', data)
        self.assertNotIn('blocks', data)
    
    def test_create_draft_serializer(self):
        """Test CreateDraftSerializer"""
        data = {
            'title': 'New Draft',
            'status': 'draft',
            'content_blocks': [
                {
                    'type': 'text',
                    'content': 'New content',
                    'id': 'block_1'
                }
            ]
        }
        
        serializer = CreateDraftSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # Mock request context
        class MockRequest:
            def __init__(self, user):
                self.user = user
        
        serializer.context['request'] = MockRequest(self.user)
        draft = serializer.save()
        
        self.assertEqual(draft.title, 'New Draft')
        self.assertEqual(draft.user, self.user)
        self.assertEqual(draft.status, 'draft')
        self.assertEqual(len(draft.content_blocks), 1)
    
    def test_update_draft_serializer(self):
        """Test UpdateDraftSerializer"""
        data = {
            'title': 'Updated Draft',
            'status': 'published',
            'content_blocks': [
                {
                    'type': 'text',
                    'content': 'Updated content',
                    'id': 'block_1'
                },
                {
                    'type': 'heading',
                    'content': 'New heading',
                    'id': 'block_2'
                }
            ]
        }
        
        serializer = UpdateDraftSerializer(self.draft, data=data)
        self.assertTrue(serializer.is_valid())
        
        updated_draft = serializer.save()
        
        self.assertEqual(updated_draft.title, 'Updated Draft')
        self.assertEqual(updated_draft.status, 'published')
        self.assertEqual(len(updated_draft.content_blocks), 2)
    
    def test_draft_serializer_validation(self):
        """Test DraftSerializer validation"""
        # Test invalid content_blocks structure
        data = {
            'title': 'Test Draft',
            'user': self.user.id,
            'status': 'draft',
            'content_blocks': 'invalid'  # Should be a list
        }
        
        serializer = DraftSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('content_blocks', serializer.errors)
    
    def test_draft_serializer_content_blocks_validation(self):
        """Test content_blocks validation"""
        # Test missing type field
        data = {
            'title': 'Test Draft',
            'user': self.user.id,
            'status': 'draft',
            'content_blocks': [
                {
                    'content': 'Missing type field'
                }
            ]
        }
        
        serializer = DraftSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('content_blocks', serializer.errors)
    
    def test_draft_serializer_content_blocks_validation_missing_content(self):
        """Test content_blocks validation with missing content field"""
        data = {
            'title': 'Test Draft',
            'user': self.user.id,
            'status': 'draft',
            'content_blocks': [
                {
                    'type': 'text'
                    # Missing content field
                }
            ]
        }
        
        serializer = DraftSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('content_blocks', serializer.errors)


class ContentBlockSerializerTest(TestCase):
    """Test cases for ContentBlock serializers"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.draft = Draft.objects.create(
            title='Test Draft',
            user=self.user
        )
        self.content_block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'},
            order=1
        )
    
    def test_content_block_serializer(self):
        """Test ContentBlockSerializer"""
        serializer = ContentBlockSerializer(self.content_block)
        data = serializer.data
        
        self.assertEqual(data['id'], self.content_block.id)
        self.assertEqual(data['draft'], self.draft.id)
        self.assertEqual(data['block_type'], 'text')
        self.assertEqual(data['content'], {'text': 'Test content'})
        self.assertEqual(data['order'], 1)
        self.assertEqual(data['text_content'], 'Test content')
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)
    
    def test_content_block_serializer_with_actions(self):
        """Test ContentBlockSerializer with actions"""
        # Create block actions
        action1 = BlockAction.objects.create(
            block=self.content_block,
            action_type='edit',
            label='Edit',
            icon='edit',
            order=1
        )
        action2 = BlockAction.objects.create(
            block=self.content_block,
            action_type='delete',
            label='Delete',
            icon='trash',
            order=2
        )
        
        serializer = ContentBlockSerializer(self.content_block)
        data = serializer.data
        
        self.assertEqual(len(data['actions']), 2)
        self.assertEqual(data['actions'][0]['action_type'], 'edit')
        self.assertEqual(data['actions'][1]['action_type'], 'delete')
    
    def test_content_block_serializer_rich_text(self):
        """Test ContentBlockSerializer with rich text"""
        rich_text_block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {'text': 'Rich '},
                    {'text': 'text ', 'formatting': ['bold']},
                    {'text': 'content'}
                ]
            },
            order=2
        )
        
        serializer = ContentBlockSerializer(rich_text_block)
        data = serializer.data
        
        self.assertEqual(data['block_type'], 'rich_text')
        self.assertEqual(data['text_content'], 'Rich text content')
    
    def test_content_block_serializer_creation(self):
        """Test ContentBlockSerializer for creation"""
        data = {
            'draft': self.draft.id,
            'block_type': 'heading',
            'content': {'text': 'New heading', 'level': 1},
            'order': 3
        }
        
        serializer = ContentBlockSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        content_block = serializer.save()
        
        self.assertEqual(content_block.draft, self.draft)
        self.assertEqual(content_block.block_type, 'heading')
        self.assertEqual(content_block.content, {'text': 'New heading', 'level': 1})
        self.assertEqual(content_block.order, 3)


class BlockActionSerializerTest(TestCase):
    """Test cases for BlockAction serializers"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.draft = Draft.objects.create(
            title='Test Draft',
            user=self.user
        )
        self.content_block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'},
            order=1
        )
        self.block_action = BlockAction.objects.create(
            block=self.content_block,
            action_type='preview',
            label='Preview',
            icon='eye',
            is_enabled=True,
            order=1
        )
    
    def test_block_action_serializer(self):
        """Test BlockActionSerializer"""
        serializer = BlockActionSerializer(self.block_action)
        data = serializer.data
        
        self.assertEqual(data['id'], self.block_action.id)
        self.assertEqual(data['action_type'], 'preview')
        self.assertEqual(data['label'], 'Preview')
        self.assertEqual(data['icon'], 'eye')
        self.assertTrue(data['is_enabled'])
        self.assertEqual(data['order'], 1)
        self.assertIn('created_at', data)
    
    def test_block_action_create_serializer(self):
        """Test BlockActionCreateSerializer"""
        data = {
            'block': self.content_block.id,
            'action_type': 'save',
            'label': 'Save',
            'icon': 'save',
            'is_enabled': True,
            'order': 2
        }
        
        serializer = BlockActionCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # Mock request context
        class MockRequest:
            def __init__(self, user):
                self.user = user
        
        serializer.context['request'] = MockRequest(self.user)
        block_action = serializer.save()
        
        self.assertEqual(block_action.block, self.content_block)
        self.assertEqual(block_action.action_type, 'save')
        self.assertEqual(block_action.label, 'Save')
        self.assertEqual(block_action.icon, 'save')
        self.assertTrue(block_action.is_enabled)
        self.assertEqual(block_action.order, 2)
    
    def test_block_action_create_serializer_validation(self):
        """Test BlockActionCreateSerializer validation"""
        # Create another user's draft and block
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        other_draft = Draft.objects.create(
            title='Other Draft',
            user=other_user
        )
        other_block = ContentBlock.objects.create(
            draft=other_draft,
            block_type='text',
            content={'text': 'Other content'},
            order=1
        )
        
        data = {
            'block': other_block.id,
            'action_type': 'edit',
            'label': 'Edit'
        }
        
        serializer = BlockActionCreateSerializer(data=data)
        
        # Mock request context with different user
        class MockRequest:
            def __init__(self, user):
                self.user = user
        
        serializer.context['request'] = MockRequest(self.user)
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('non_field_errors', serializer.errors)


class SerializerIntegrationTest(TestCase):
    """Integration tests for serializers working together"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_full_serialization_workflow(self):
        """Test complete serialization workflow"""
        # Create draft with content blocks
        draft_data = {
            'title': 'Integration Test Draft',
            'user': self.user,
            'status': 'draft',
            'content_blocks': [
                {
                    'type': 'text',
                    'content': 'First block',
                    'id': 'block_1'
                },
                {
                    'type': 'rich_text',
                    'content': {
                        'text': 'Rich text content',
                        'formatting': ['bold']
                    },
                    'id': 'block_2'
                }
            ]
        }
        draft = Draft.objects.create(**draft_data)
        
        # Create structured content blocks
        content_block1 = ContentBlock.objects.create(
            draft=draft,
            block_type='text',
            content={'text': 'First block'},
            order=1
        )
        content_block2 = ContentBlock.objects.create(
            draft=draft,
            block_type='rich_text',
            content={
                'text': 'Rich text content',
                'formatting': ['bold']
            },
            order=2
        )
        
        # Create block actions
        action1 = BlockAction.objects.create(
            block=content_block1,
            action_type='edit',
            label='Edit',
            icon='edit',
            order=1
        )
        action2 = BlockAction.objects.create(
            block=content_block2,
            action_type='preview',
            label='Preview',
            icon='eye',
            order=1
        )
        
        # Serialize the complete structure
        draft_serializer = DraftSerializer(draft)
        draft_data = draft_serializer.data
        
        # Verify serialization
        self.assertEqual(draft_data['title'], 'Integration Test Draft')
        self.assertEqual(draft_data['content_blocks_count'], 2)
        self.assertEqual(len(draft_data['blocks']), 2)
        
        # Verify content blocks
        self.assertEqual(draft_data['blocks'][0]['block_type'], 'text')
        self.assertEqual(draft_data['blocks'][0]['text_content'], 'First block')
        self.assertEqual(len(draft_data['blocks'][0]['actions']), 1)
        
        self.assertEqual(draft_data['blocks'][1]['block_type'], 'rich_text')
        self.assertEqual(len(draft_data['blocks'][1]['actions']), 1)
        
        # Verify actions
        self.assertEqual(draft_data['blocks'][0]['actions'][0]['action_type'], 'edit')
        self.assertEqual(draft_data['blocks'][1]['actions'][0]['action_type'], 'preview')
    
    def test_serializer_validation_edge_cases(self):
        """Test serializer validation with edge cases"""
        # Test empty content_blocks
        data = {
            'title': 'Empty Draft',
            'user': self.user.id,
            'status': 'draft',
            'content_blocks': []
        }
        
        serializer = DraftSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # Test content_blocks with empty objects
        data = {
            'title': 'Empty Blocks Draft',
            'user': self.user.id,
            'status': 'draft',
            'content_blocks': [
                {
                    'type': 'text',
                    'content': ''
                }
            ]
        }
        
        serializer = DraftSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        # Test content_blocks with complex nested content
        data = {
            'title': 'Complex Draft',
            'user': self.user.id,
            'status': 'draft',
            'content_blocks': [
                {
                    'type': 'rich_text',
                    'content': {
                        'content': [
                            {'text': 'Hello '},
                            {'text': 'world', 'formatting': ['bold', 'italic']},
                            {'text': '!'}
                        ]
                    }
                }
            ]
        }
        
        serializer = DraftSerializer(data=data)
        self.assertTrue(serializer.is_valid())


class DraftRevisionSerializerTest(TestCase):
    """Tests for DraftRevision serializers recently added."""
    def setUp(self):
        self.user = User.objects.create_user(
            username='revuser',
            email='rev@example.com',
            password='revpass123'
        )
        self.draft = Draft.objects.create(
            title='Rev Test',
            user=self.user,
            status='draft',
            content_blocks=[]
        )
        self.revision = DraftRevision.objects.create(
            draft=self.draft,
            title='Rev 1',
            status='draft',
            content_blocks=[{'type': 'text', 'content': 'r1'}],
            created_by=self.user,
            change_summary='init'
        )

    def test_draft_revision_serializer(self):
        from notion_editor.serializers import DraftRevisionSerializer as DRSerializer
        ser = DRSerializer(self.revision)
        data = ser.data
        self.assertEqual(data['draft'], self.draft.id)
        self.assertEqual(data['title'], 'Rev 1')
        self.assertEqual(data['status'], 'draft')
        self.assertIn('revision_number', data)
        self.assertEqual(data['created_by'], self.user.id)
        self.assertEqual(data['created_by_email'], 'rev@example.com')
        self.assertIn('content_preview', data)

    def test_draft_revision_list_serializer(self):
        from notion_editor.serializers import DraftRevisionListSerializer as DRList
        ser = DRList(self.revision)
        data = ser.data
        self.assertEqual(data['id'], self.revision.id)
        self.assertEqual(data['title'], 'Rev 1')
        self.assertIn('created_by_email', data)
        self.assertIn('revision_number', data)
