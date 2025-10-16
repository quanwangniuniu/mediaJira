"""
Comprehensive tests for notion_editor models
"""
import json
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from notion_editor.models import Draft, ContentBlock, BlockAction

User = get_user_model()


class DraftModelTest(TestCase):
    """Test cases for Draft model"""
    
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
                },
                {
                    'type': 'rich_text',
                    'content': {
                        'text': 'Rich text content',
                        'formatting': ['bold', 'italic']
                    },
                    'id': 'block_2'
                }
            ]
        }
    
    def test_draft_creation(self):
        """Test basic draft creation"""
        draft = Draft.objects.create(**self.draft_data)
        
        self.assertEqual(draft.title, 'Test Draft')
        self.assertEqual(draft.user, self.user)
        self.assertEqual(draft.status, 'draft')
        self.assertFalse(draft.is_deleted)
        self.assertIsInstance(draft.content_blocks, list)
        self.assertEqual(len(draft.content_blocks), 2)
    
    def test_draft_str_representation(self):
        """Test string representation of draft"""
        draft = Draft.objects.create(**self.draft_data)
        self.assertEqual(str(draft), 'Test Draft')
    
    def test_draft_timestamps(self):
        """Test automatic timestamp creation"""
        draft = Draft.objects.create(**self.draft_data)
        
        self.assertIsNotNone(draft.created_at)
        self.assertIsNotNone(draft.updated_at)
        # Allow for microsecond differences due to database precision
        self.assertAlmostEqual(draft.created_at.timestamp(), draft.updated_at.timestamp(), delta=1)
    
    def test_draft_status_choices(self):
        """Test draft status choices"""
        valid_statuses = ['draft', 'published', 'archived']
        
        for status in valid_statuses:
            draft = Draft.objects.create(
                title=f'Test Draft {status}',
                user=self.user,
                status=status
            )
            self.assertEqual(draft.status, status)
    
    def test_draft_ordering(self):
        """Test draft ordering by updated_at"""
        draft1 = Draft.objects.create(
            title='First Draft',
            user=self.user
        )
        draft2 = Draft.objects.create(
            title='Second Draft',
            user=self.user
        )
        
        drafts = Draft.objects.all()
        self.assertEqual(drafts[0], draft2)  # Most recently updated first
        self.assertEqual(drafts[1], draft1)
    
    def test_get_content_blocks_count(self):
        """Test content blocks count method"""
        draft = Draft.objects.create(**self.draft_data)
        self.assertEqual(draft.get_content_blocks_count(), 2)
        
        # Test with empty content_blocks
        draft_empty = Draft.objects.create(
            title='Empty Draft',
            user=self.user,
            content_blocks=[]
        )
        self.assertEqual(draft_empty.get_content_blocks_count(), 0)
    
    def test_add_content_block(self):
        """Test adding content blocks"""
        draft = Draft.objects.create(
            title='Test Draft',
            user=self.user
        )
        
        new_block = {
            'type': 'heading',
            'content': 'New Heading',
            'level': 1
        }
        
        block_id = draft.add_content_block(new_block)
        
        self.assertIsNotNone(block_id)
        self.assertEqual(len(draft.content_blocks), 1)
        self.assertEqual(draft.content_blocks[0]['id'], block_id)
        self.assertEqual(draft.content_blocks[0]['type'], 'heading')
    
    def test_update_content_block(self):
        """Test updating content blocks"""
        draft = Draft.objects.create(**self.draft_data)
        original_block_id = draft.content_blocks[0]['id']
        
        updated_block = {
            'type': 'text',
            'content': 'Updated content',
            'id': original_block_id
        }
        
        success = draft.update_content_block(original_block_id, updated_block)
        
        self.assertTrue(success)
        self.assertEqual(draft.content_blocks[0]['content'], 'Updated content')
    
    def test_update_nonexistent_content_block(self):
        """Test updating non-existent content block"""
        draft = Draft.objects.create(**self.draft_data)
        
        updated_block = {
            'type': 'text',
            'content': 'Updated content'
        }
        
        success = draft.update_content_block('nonexistent_id', updated_block)
        self.assertFalse(success)
    
    def test_delete_content_block(self):
        """Test deleting content blocks"""
        draft = Draft.objects.create(**self.draft_data)
        original_count = len(draft.content_blocks)
        block_id = draft.content_blocks[0]['id']
        
        success = draft.delete_content_block(block_id)
        
        self.assertTrue(success)
        self.assertEqual(len(draft.content_blocks), original_count - 1)
    
    def test_delete_nonexistent_content_block(self):
        """Test deleting non-existent content block"""
        draft = Draft.objects.create(**self.draft_data)
        
        success = draft.delete_content_block('nonexistent_id')
        self.assertFalse(success)
    
    def test_draft_user_relationship(self):
        """Test draft-user relationship"""
        draft = Draft.objects.create(**self.draft_data)
        
        # Test forward relationship
        self.assertEqual(draft.user, self.user)
        
        # Test reverse relationship
        self.assertIn(draft, self.user.notion_drafts.all())
    
    def test_draft_soft_delete(self):
        """Test soft delete functionality"""
        draft = Draft.objects.create(**self.draft_data)
        
        # Soft delete
        draft.is_deleted = True
        draft.save()
        
        # Should not appear in default queryset (DraftViewSet filters out deleted)
        # But Draft.objects.all() includes all objects
        self.assertIn(draft, Draft.objects.all())
        
        # Should appear in deleted filter
        self.assertIn(draft, Draft.objects.filter(is_deleted=True))
        
        # Should not appear in non-deleted filter
        self.assertNotIn(draft, Draft.objects.filter(is_deleted=False))


class ContentBlockModelTest(TestCase):
    """Test cases for ContentBlock model"""
    
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
    
    def test_content_block_creation(self):
        """Test basic content block creation"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'},
            order=1
        )
        
        self.assertEqual(block.draft, self.draft)
        self.assertEqual(block.block_type, 'text')
        self.assertEqual(block.content, {'text': 'Test content'})
        self.assertEqual(block.order, 1)
    
    def test_content_block_str_representation(self):
        """Test string representation of content block"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'}
        )
        expected = f"Plain Text block in {self.draft.title}"
        self.assertEqual(str(block), expected)
    
    def test_content_block_types(self):
        """Test all content block types"""
        block_types = [
            ('text', 'Plain Text'),
            ('rich_text', 'Rich Text'),
            ('heading', 'Heading'),
            ('list', 'List'),
            ('quote', 'Quote'),
            ('code', 'Code Block'),
            ('divider', 'Divider'),
        ]
        
        for block_type, display_name in block_types:
            block = ContentBlock.objects.create(
                draft=self.draft,
                block_type=block_type,
                content={'test': 'data'}
            )
            self.assertEqual(block.block_type, block_type)
            self.assertEqual(block.get_block_type_display(), display_name)
    
    def test_content_block_ordering(self):
        """Test content block ordering"""
        block1 = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'First block'},
            order=2
        )
        block2 = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Second block'},
            order=1
        )
        
        blocks = ContentBlock.objects.all()
        self.assertEqual(blocks[0], block2)  # Lower order first
        self.assertEqual(blocks[1], block1)
    
    def test_get_text_content_plain_text(self):
        """Test text content extraction for plain text blocks"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Plain text content'}
        )
        
        self.assertEqual(block.get_text_content(), 'Plain text content')
    
    def test_get_text_content_rich_text(self):
        """Test text content extraction for rich text blocks"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {'text': 'Rich '},
                    {'text': 'text ', 'formatting': ['bold']},
                    {'text': 'content'}
                ]
            }
        )

        self.assertEqual(block.get_text_content(), 'Rich text content')

    def test_get_text_content_notion_format(self):
        """Test text content extraction for Notion-style rich text blocks"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Some words ',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        },
                        'plain_text': 'Some words ',
                        'href': None
                    },
                    {
                        'type': 'text',
                        'text': {
                            'content': 'in bold',
                            'link': None
                        },
                        'annotations': {
                            'bold': True,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        },
                        'plain_text': 'in bold',
                        'href': None
                    }
                ]
            }
        )

        self.assertEqual(block.get_text_content(), 'Some words in bold')
    
    def test_get_text_content_other_types(self):
        """Test text content extraction for other block types"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='heading',
            content={'text': 'Heading content', 'level': 1}
        )
        
        self.assertEqual(block.get_text_content(), "{'text': 'Heading content', 'level': 1}")
    
    def test_content_block_draft_relationship(self):
        """Test content block-draft relationship"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'}
        )
        
        # Test forward relationship
        self.assertEqual(block.draft, self.draft)
        
        # Test reverse relationship
        self.assertIn(block, self.draft.blocks.all())


class BlockActionModelTest(TestCase):
    """Test cases for BlockAction model"""
    
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
        self.block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'}
        )
    
    def test_block_action_creation(self):
        """Test basic block action creation"""
        action = BlockAction.objects.create(
            block=self.block,
            action_type='preview',
            label='Preview',
            icon='eye',
            is_enabled=True,
            order=1
        )
        
        self.assertEqual(action.block, self.block)
        self.assertEqual(action.action_type, 'preview')
        self.assertEqual(action.label, 'Preview')
        self.assertEqual(action.icon, 'eye')
        self.assertTrue(action.is_enabled)
        self.assertEqual(action.order, 1)
    
    def test_block_action_str_representation(self):
        """Test string representation of block action"""
        action = BlockAction.objects.create(
            block=self.block,
            action_type='preview',
            label='Preview'
        )
        expected = f"Preview action for {self.block}"
        self.assertEqual(str(action), expected)
    
    def test_block_action_types(self):
        """Test all block action types"""
        action_types = [
            ('preview', 'Preview'),
            ('save', 'Save'),
            ('delete', 'Delete'),
            ('edit', 'Edit'),
            ('duplicate', 'Duplicate'),
            ('move_up', 'Move Up'),
            ('move_down', 'Move Down'),
        ]
        
        for action_type, display_name in action_types:
            action = BlockAction.objects.create(
                block=self.block,
                action_type=action_type,
                label=f'{display_name} Action'
            )
            self.assertEqual(action.action_type, action_type)
            self.assertEqual(action.get_action_type_display(), display_name)
    
    def test_block_action_ordering(self):
        """Test block action ordering"""
        action1 = BlockAction.objects.create(
            block=self.block,
            action_type='preview',
            label='Preview',
            order=2
        )
        action2 = BlockAction.objects.create(
            block=self.block,
            action_type='save',
            label='Save',
            order=1
        )
        
        actions = BlockAction.objects.all()
        self.assertEqual(actions[0], action2)  # Lower order first
        self.assertEqual(actions[1], action1)
    
    def test_block_action_unique_constraint(self):
        """Test unique constraint on block and action_type"""
        BlockAction.objects.create(
            block=self.block,
            action_type='preview',
            label='Preview'
        )
        
        # Should raise IntegrityError for duplicate action_type on same block
        with self.assertRaises(IntegrityError):
            BlockAction.objects.create(
                block=self.block,
                action_type='preview',
                label='Another Preview'
            )
    
    def test_block_action_block_relationship(self):
        """Test block action-block relationship"""
        action = BlockAction.objects.create(
            block=self.block,
            action_type='preview',
            label='Preview'
        )
        
        # Test forward relationship
        self.assertEqual(action.block, self.block)
        
        # Test reverse relationship
        self.assertIn(action, self.block.actions.all())
    
    def test_block_action_defaults(self):
        """Test block action default values"""
        action = BlockAction.objects.create(
            block=self.block,
            action_type='preview',
            label='Preview'
        )
        
        self.assertTrue(action.is_enabled)  # Default True
        self.assertEqual(action.order, 0)  # Default 0
        self.assertEqual(action.icon, '')  # Default empty string


class ModelIntegrationTest(TestCase):
    """Integration tests for all models working together"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_full_workflow(self):
        """Test complete workflow from draft creation to block actions"""
        # Create draft
        draft = Draft.objects.create(
            title='Integration Test Draft',
            user=self.user,
            status='draft'
        )
        
        # Add content blocks to draft
        block1_data = {
            'type': 'text',
            'content': 'First block content',
            'id': 'block_1'
        }
        block2_data = {
            'type': 'rich_text',
            'content': {
                'text': 'Rich text content',
                'formatting': ['bold']
            },
            'id': 'block_2'
        }
        
        draft.add_content_block(block1_data)
        draft.add_content_block(block2_data)
        
        # Create structured content blocks
        content_block1 = ContentBlock.objects.create(
            draft=draft,
            block_type='text',
            content={'text': 'First block content'},
            order=1
        )
        content_block2 = ContentBlock.objects.create(
            draft=draft,
            block_type='rich_text',
            content={
                'content': [
                    {'text': 'Rich text content'}
                ]
            },
            order=2
        )
        
        # Add actions to blocks
        action1 = BlockAction.objects.create(
            block=content_block1,
            action_type='edit',
            label='Edit',
            icon='edit',
            order=1
        )
        action2 = BlockAction.objects.create(
            block=content_block1,
            action_type='delete',
            label='Delete',
            icon='trash',
            order=2
        )
        action3 = BlockAction.objects.create(
            block=content_block2,
            action_type='preview',
            label='Preview',
            icon='eye',
            order=1
        )
        
        # Verify relationships
        self.assertEqual(draft.blocks.count(), 2)
        self.assertEqual(content_block1.actions.count(), 2)
        self.assertEqual(content_block2.actions.count(), 1)
        
        # Verify data integrity
        self.assertEqual(draft.get_content_blocks_count(), 2)
        self.assertEqual(content_block1.get_text_content(), 'First block content')
        # For rich text, the content structure is different
        self.assertEqual(content_block2.get_text_content(), 'Rich text content')
        
        # Test cascade deletion
        draft.delete()
        self.assertEqual(ContentBlock.objects.count(), 0)
        self.assertEqual(BlockAction.objects.count(), 0)
    
    def test_user_draft_relationship(self):
        """Test user-draft relationship with multiple drafts"""
        # Create multiple drafts for the same user
        draft1 = Draft.objects.create(
            title='Draft 1',
            user=self.user,
            status='draft'
        )
        draft2 = Draft.objects.create(
            title='Draft 2',
            user=self.user,
            status='published'
        )
        
        # Create another user with their own draft
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        other_draft = Draft.objects.create(
            title='Other Draft',
            user=other_user,
            status='draft'
        )
        
        # Verify user-draft relationships
        self.assertEqual(self.user.notion_drafts.count(), 2)
        self.assertEqual(other_user.notion_drafts.count(), 1)
        
        # Verify draft isolation
        self.assertIn(draft1, self.user.notion_drafts.all())
        self.assertIn(draft2, self.user.notion_drafts.all())
        self.assertNotIn(other_draft, self.user.notion_drafts.all())
    
    def test_content_block_ordering_within_draft(self):
        """Test content block ordering within a draft"""
        draft = Draft.objects.create(
            title='Ordering Test Draft',
            user=self.user
        )
        
        # Create blocks in reverse order
        block3 = ContentBlock.objects.create(
            draft=draft,
            block_type='text',
            content={'text': 'Third block'},
            order=3
        )
        block1 = ContentBlock.objects.create(
            draft=draft,
            block_type='text',
            content={'text': 'First block'},
            order=1
        )
        block2 = ContentBlock.objects.create(
            draft=draft,
            block_type='text',
            content={'text': 'Second block'},
            order=2
        )
        
        # Verify ordering
        blocks = draft.blocks.all()
        self.assertEqual(blocks[0], block1)
        self.assertEqual(blocks[1], block2)
        self.assertEqual(blocks[2], block3)
    
    def test_soft_delete_functionality(self):
        """Test soft delete functionality across models"""
        draft = Draft.objects.create(
            title='Soft Delete Test',
            user=self.user
        )
        
        content_block = ContentBlock.objects.create(
            draft=draft,
            block_type='text',
            content={'text': 'Test content'}
        )
        
        action = BlockAction.objects.create(
            block=content_block,
            action_type='delete',
            label='Delete'
        )
        
        # Soft delete the draft
        draft.is_deleted = True
        draft.save()
        
        # Verify soft delete
        self.assertTrue(draft.is_deleted)
        self.assertNotIn(draft, Draft.objects.filter(is_deleted=False))
        self.assertIn(draft, Draft.objects.filter(is_deleted=True))
        
        # Related objects should still exist
        self.assertEqual(ContentBlock.objects.count(), 1)
        self.assertEqual(BlockAction.objects.count(), 1)


class NotionStyleContentTest(TestCase):
    """Test cases for Notion-style content formatting and validation"""

    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.draft = Draft.objects.create(
            title='Notion Style Test Draft',
            user=self.user
        )

    def test_notion_content_validation_valid(self):
        """Test validation of valid Notion-style content"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Some words ',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        },
                        'plain_text': 'Some words ',
                        'href': None
                    }
                ]
            }
        )

        is_valid, error_msg = block.validate_notion_content()
        self.assertTrue(is_valid)
        self.assertIsNone(error_msg)

    def test_notion_content_validation_invalid_structure(self):
        """Test validation of invalid Notion-style content structure"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': 'This should be a list'
            }
        )

        is_valid, error_msg = block.validate_notion_content()
        self.assertFalse(is_valid)
        self.assertIn('content', error_msg.lower())

    def test_notion_content_validation_missing_text_field(self):
        """Test validation with missing text field in Notion format"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        # Missing 'text' field
                        'annotations': {
                            'bold': False
                        }
                    }
                ]
            }
        )

        is_valid, error_msg = block.validate_notion_content()
        self.assertFalse(is_valid)
        self.assertIsNotNone(error_msg)

    def test_notion_content_validation_invalid_annotations(self):
        """Test validation with invalid annotations"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Test',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'invalid_annotation': True  # Invalid annotation
                        }
                    }
                ]
            }
        )

        is_valid, error_msg = block.validate_notion_content()
        self.assertFalse(is_valid)
        self.assertIn('invalid_annotation', error_msg)

    def test_notion_formatted_html_basic(self):
        """Test HTML formatting for basic Notion content"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Plain text',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertEqual(html, 'Plain text')

    def test_notion_formatted_html_bold(self):
        """Test HTML formatting with bold annotation"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Bold text',
                            'link': None
                        },
                        'annotations': {
                            'bold': True,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('<strong>Bold text</strong>', html)

    def test_notion_formatted_html_italic(self):
        """Test HTML formatting with italic annotation"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Italic text',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': True,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('<em>Italic text</em>', html)

    def test_notion_formatted_html_multiple_annotations(self):
        """Test HTML formatting with multiple annotations"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Formatted text',
                            'link': None
                        },
                        'annotations': {
                            'bold': True,
                            'italic': True,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('<strong>', html)
        self.assertIn('<em>', html)
        self.assertIn('Formatted text', html)

    def test_notion_formatted_html_code(self):
        """Test HTML formatting with code annotation"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'code snippet',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': True,
                            'color': 'default'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('<code>code snippet</code>', html)

    def test_notion_formatted_html_strikethrough(self):
        """Test HTML formatting with strikethrough annotation"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Strikethrough text',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': True,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('<s>Strikethrough text</s>', html)

    def test_notion_formatted_html_underline(self):
        """Test HTML formatting with underline annotation"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Underlined text',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': True,
                            'code': False,
                            'color': 'default'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('<u>Underlined text</u>', html)

    def test_notion_formatted_html_color(self):
        """Test HTML formatting with color annotation"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Colored text',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'red'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('style="color: red;"', html)
        self.assertIn('Colored text', html)

    def test_notion_formatted_html_with_link(self):
        """Test HTML formatting with link"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Link text',
                            'link': 'https://example.com'
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        },
                        'href': 'https://example.com'
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('<a href="https://example.com">Link text</a>', html)

    def test_notion_formatted_html_mixed_content(self):
        """Test HTML formatting with mixed content"""
        block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='rich_text',
            content={
                'content': [
                    {
                        'type': 'text',
                        'text': {
                            'content': 'Normal ',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    },
                    {
                        'type': 'text',
                        'text': {
                            'content': 'bold ',
                            'link': None
                        },
                        'annotations': {
                            'bold': True,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    },
                    {
                        'type': 'text',
                        'text': {
                            'content': 'italic ',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': True,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    },
                    {
                        'type': 'text',
                        'text': {
                            'content': 'text',
                            'link': None
                        },
                        'annotations': {
                            'bold': False,
                            'italic': False,
                            'strikethrough': False,
                            'underline': False,
                            'code': False,
                            'color': 'default'
                        }
                    }
                ]
            }
        )

        html = block.get_notion_formatted_html()
        self.assertIn('Normal', html)
        self.assertIn('<strong>bold </strong>', html)  # Note: includes trailing space from content
        self.assertIn('<em>italic </em>', html)  # Note: includes trailing space from content
        self.assertIn('text', html)
