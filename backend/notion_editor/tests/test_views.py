"""
Tests for notion_editor views and API endpoints
"""
import json
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from notion_editor.models import Draft, ContentBlock, BlockAction

User = get_user_model()


class DraftViewSetTest(TransactionTestCase):
    """Test cases for DraftViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        self.draft = Draft.objects.create(
            title='Test Draft',
            user=self.user,
            status='draft',
            content_blocks=[
                {
                    'type': 'text',
                    'content': 'Test content',
                    'id': 'block_1'
                }
            ]
        )
        self.content_block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'},
            order=1
        )
    
    def tearDown(self):
        """Clean up test data"""
        Draft.objects.all().delete()
        User.objects.all().delete()
    
    def test_list_drafts_authenticated(self):
        """Test listing drafts for authenticated user"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Draft')
        self.assertEqual(response.data['results'][0]['user_email'], 'test@example.com')
    
    def test_list_drafts_unauthenticated(self):
        """Test listing drafts without authentication"""
        url = reverse('notion_editor:draft-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_drafts_user_isolation(self):
        """Test that users only see their own drafts"""
        # Create draft for other user
        Draft.objects.create(
            title='Other Draft',
            user=self.other_user,
            status='draft'
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['title'], 'Test Draft')
    
    def test_retrieve_draft(self):
        """Test retrieving a specific draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-detail', kwargs={'pk': self.draft.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Draft')
        self.assertEqual(response.data['content_blocks_count'], 1)
        self.assertEqual(len(response.data['blocks']), 1)
    
    def test_retrieve_draft_other_user(self):
        """Test retrieving draft from another user"""
        self.client.force_authenticate(user=self.other_user)
        url = reverse('notion_editor:draft-detail', kwargs={'pk': self.draft.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_draft(self):
        """Test creating a new draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-list')
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
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Draft')
        # User field might not be included in CreateDraftSerializer response
        # Check that the draft was created successfully
        self.assertEqual(len(response.data['content_blocks']), 1)
    
    def test_update_draft(self):
        """Test updating a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-detail', kwargs={'pk': self.draft.pk})
        data = {
            'title': 'Updated Draft',
            'status': 'published',
            'content_blocks': [
                {
                    'type': 'text',
                    'content': 'Updated content',
                    'id': 'block_1'
                }
            ]
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Draft')
        self.assertEqual(response.data['status'], 'published')
    
    def test_partial_update_draft(self):
        """Test partially updating a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-detail', kwargs={'pk': self.draft.pk})
        data = {
            'title': 'Partially Updated Draft'
        }
        
        response = self.client.patch(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Partially Updated Draft')
        self.assertEqual(response.data['status'], 'draft')  # Should remain unchanged
    
    def test_delete_draft(self):
        """Test soft deleting a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-detail', kwargs={'pk': self.draft.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify soft delete
        self.draft.refresh_from_db()
        self.assertTrue(self.draft.is_deleted)
        
        # Should not appear in list
        list_url = reverse('notion_editor:draft-list')
        list_response = self.client.get(list_url)
        self.assertEqual(list_response.data['count'], 0)
        self.assertEqual(len(list_response.data['results']), 0)
    
    def test_add_block_to_draft(self):
        """Test adding a block to a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-add-block', kwargs={'pk': self.draft.pk})
        data = {
            'type': 'heading',
            'content': 'New heading',
            'level': 1
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('block_id', response.data)
        self.assertIn('content_block_id', response.data)
        self.assertEqual(response.data['message'], 'Block added successfully')
        
        # Verify block was added
        self.draft.refresh_from_db()
        self.assertEqual(len(self.draft.content_blocks), 2)
        self.assertEqual(self.draft.content_blocks[1]['type'], 'heading')
    
    def test_update_block_in_draft(self):
        """Test updating a block in a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-update-block', kwargs={'pk': self.draft.pk})
        block_id = self.draft.content_blocks[0]['id']
        data = {
            'block_id': block_id,
            'block_data': {
                'type': 'text',
                'content': 'Updated content',
                'id': block_id
            }
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Block updated successfully')
        
        # Verify block was updated
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.content_blocks[0]['content'], 'Updated content')
    
    def test_delete_block_from_draft(self):
        """Test deleting a block from a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-delete-block', kwargs={'pk': self.draft.pk})
        block_id = self.draft.content_blocks[0]['id']
        data = {
            'block_id': block_id
        }
        
        response = self.client.delete(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Block deleted successfully')
        
        # Verify block was deleted
        self.draft.refresh_from_db()
        self.assertEqual(len(self.draft.content_blocks), 0)
    
    def test_add_block_invalid_data(self):
        """Test adding block with invalid data"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-add-block', kwargs={'pk': self.draft.pk})
        data = 'invalid data'  # Should be a dictionary
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_update_block_missing_data(self):
        """Test updating block with missing data"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-update-block', kwargs={'pk': self.draft.pk})
        data = {
            'block_id': 'some_id'
            # Missing block_data
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_delete_block_missing_data(self):
        """Test deleting block with missing data"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-delete-block', kwargs={'pk': self.draft.pk})
        data = {}  # Missing block_id
        
        response = self.client.delete(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)


class ContentBlockViewSetTest(TransactionTestCase):
    """Test cases for ContentBlockViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser2',
            email='other2@example.com',
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
    
    def tearDown(self):
        """Clean up test data"""
        Draft.objects.all().delete()
        User.objects.all().delete()
    
    def test_list_content_blocks(self):
        """Test listing content blocks"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:contentblock-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['block_type'], 'text')
        self.assertEqual(response.data['results'][0]['text_content'], 'Test content')
    
    def test_list_content_blocks_user_isolation(self):
        """Test that users only see their own content blocks"""
        # Create draft and block for other user
        other_draft = Draft.objects.create(
            title='Other Draft',
            user=self.other_user
        )
        ContentBlock.objects.create(
            draft=other_draft,
            block_type='text',
            content={'text': 'Other content'},
            order=1
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:contentblock-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['text_content'], 'Test content')
    
    def test_retrieve_content_block(self):
        """Test retrieving a specific content block"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:contentblock-detail', kwargs={'pk': self.content_block.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['block_type'], 'text')
        self.assertEqual(response.data['text_content'], 'Test content')
        self.assertEqual(response.data['draft'], self.draft.id)
    
    def test_create_content_block(self):
        """Test creating a new content block"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:contentblock-list')
        data = {
            'draft': self.draft.id,
            'block_type': 'heading',
            'content': {'text': 'New heading', 'level': 1},
            'order': 2
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['block_type'], 'heading')
        self.assertEqual(response.data['draft'], self.draft.id)
    
    def test_create_content_block_other_user_draft(self):
        """Test creating content block for another user's draft"""
        other_draft = Draft.objects.create(
            title='Other Draft',
            user=self.other_user
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:contentblock-list')
        data = {
            'draft': other_draft.id,
            'block_type': 'text',
            'content': {'text': 'Unauthorized content'},
            'order': 1
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_update_content_block(self):
        """Test updating a content block"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:contentblock-detail', kwargs={'pk': self.content_block.pk})
        data = {
            'draft': self.draft.id,
            'block_type': 'rich_text',
            'content': {'text': 'Updated content', 'formatting': ['bold']},
            'order': 1
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['block_type'], 'rich_text')
    
    def test_delete_content_block(self):
        """Test deleting a content block"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:contentblock-detail', kwargs={'pk': self.content_block.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify block was deleted
        self.assertFalse(ContentBlock.objects.filter(pk=self.content_block.pk).exists())


class BlockActionViewSetTest(TransactionTestCase):
    """Test cases for BlockActionViewSet"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser3',
            email='test3@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser3',
            email='other3@example.com',
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
            action_type='edit',
            label='Edit',
            icon='edit',
            order=1
        )
    
    def tearDown(self):
        """Clean up test data"""
        Draft.objects.all().delete()
        User.objects.all().delete()
    
    def test_list_block_actions(self):
        """Test listing block actions"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:blockaction-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['action_type'], 'edit')
        self.assertEqual(response.data['results'][0]['label'], 'Edit')
    
    def test_list_block_actions_user_isolation(self):
        """Test that users only see their own block actions"""
        # Create draft, block, and action for other user
        other_draft = Draft.objects.create(
            title='Other Draft',
            user=self.other_user
        )
        other_block = ContentBlock.objects.create(
            draft=other_draft,
            block_type='text',
            content={'text': 'Other content'},
            order=1
        )
        BlockAction.objects.create(
            block=other_block,
            action_type='delete',
            label='Delete',
            order=1
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:blockaction-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['action_type'], 'edit')
    
    def test_retrieve_block_action(self):
        """Test retrieving a specific block action"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:blockaction-detail', kwargs={'pk': self.block_action.pk})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['action_type'], 'edit')
        self.assertEqual(response.data['label'], 'Edit')
        self.assertEqual(response.data['icon'], 'edit')
    
    def test_create_block_action(self):
        """Test creating a new block action"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:blockaction-list')
        data = {
            'block': self.content_block.id,
            'action_type': 'preview',
            'label': 'Preview',
            'icon': 'eye',
            'is_enabled': True,
            'order': 2
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['action_type'], 'preview')
        self.assertEqual(response.data['label'], 'Preview')
    
    def test_create_block_action_other_user_block(self):
        """Test creating block action for another user's block"""
        other_draft = Draft.objects.create(
            title='Other Draft',
            user=self.other_user
        )
        other_block = ContentBlock.objects.create(
            draft=other_draft,
            block_type='text',
            content={'text': 'Other content'},
            order=1
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:blockaction-list')
        data = {
            'block': other_block.id,
            'action_type': 'edit',
            'label': 'Edit'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('non_field_errors', response.data)
    
    def test_update_block_action(self):
        """Test updating a block action"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:blockaction-detail', kwargs={'pk': self.block_action.pk})
        data = {
            'block': self.content_block.id,
            'action_type': 'edit',
            'label': 'Edit Block',
            'icon': 'edit-alt',
            'is_enabled': True,
            'order': 1
        }
        
        response = self.client.put(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['label'], 'Edit Block')
        self.assertEqual(response.data['icon'], 'edit-alt')
    
    def test_delete_block_action(self):
        """Test deleting a block action"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:blockaction-detail', kwargs={'pk': self.block_action.pk})
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify action was deleted
        self.assertFalse(BlockAction.objects.filter(pk=self.block_action.pk).exists())


class DraftBlocksViewTest(TransactionTestCase):
    """Test cases for DraftBlocksView"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser4',
            email='test4@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser4',
            email='other4@example.com',
            password='testpass123'
        )
        self.draft = Draft.objects.create(
            title='Test Draft',
            user=self.user
        )
        self.content_block1 = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'First block'},
            order=1
        )
        self.content_block2 = ContentBlock.objects.create(
            draft=self.draft,
            block_type='heading',
            content={'text': 'Second block', 'level': 1},
            order=2
        )
    
    def tearDown(self):
        """Clean up test data"""
        Draft.objects.all().delete()
        User.objects.all().delete()
    
    def test_get_draft_blocks(self):
        """Test getting blocks for a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-blocks', kwargs={'draft_id': self.draft.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['draft_id'], self.draft.id)
        self.assertEqual(response.data['draft_title'], 'Test Draft')
        self.assertEqual(len(response.data['blocks']), 2)
        self.assertEqual(response.data['blocks'][0]['block_type'], 'text')
        self.assertEqual(response.data['blocks'][1]['block_type'], 'heading')
    
    def test_get_draft_blocks_other_user(self):
        """Test getting blocks for another user's draft"""
        self.client.force_authenticate(user=self.other_user)
        url = reverse('notion_editor:draft-blocks', kwargs={'draft_id': self.draft.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_draft_blocks_nonexistent(self):
        """Test getting blocks for non-existent draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:draft-blocks', kwargs={'draft_id': 99999})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ExportDraftViewTest(TransactionTestCase):
    """Test cases for ExportDraftView"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser5',
            email='test5@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser5',
            email='other5@example.com',
            password='testpass123'
        )
        self.draft = Draft.objects.create(
            title='Test Draft',
            user=self.user,
            status='draft',
            content_blocks=[
                {
                    'type': 'text',
                    'content': 'Test content',
                    'id': 'block_1'
                }
            ]
        )
    
    def tearDown(self):
        """Clean up test data"""
        Draft.objects.all().delete()
        User.objects.all().delete()
    
    def test_export_draft(self):
        """Test exporting a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:export-draft', kwargs={'draft_id': self.draft.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/json')
        self.assertIn('attachment', response['Content-Disposition'])
        self.assertIn('Test Draft_export.json', response['Content-Disposition'])
        
        # Parse response content
        content = json.loads(response.content)
        self.assertEqual(content['title'], 'Test Draft')
        self.assertEqual(content['status'], 'draft')
        self.assertEqual(len(content['content_blocks']), 1)
        self.assertIn('created_at', content)
        self.assertIn('updated_at', content)
        self.assertIn('exported_at', content)
    
    def test_export_draft_other_user(self):
        """Test exporting another user's draft"""
        self.client.force_authenticate(user=self.other_user)
        url = reverse('notion_editor:export-draft', kwargs={'draft_id': self.draft.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_export_draft_nonexistent(self):
        """Test exporting non-existent draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:export-draft', kwargs={'draft_id': 99999})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class DuplicateDraftViewTest(TransactionTestCase):
    """Test cases for DuplicateDraftView"""
    
    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser6',
            email='test6@example.com',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            username='otheruser6',
            email='other6@example.com',
            password='testpass123'
        )
        self.draft = Draft.objects.create(
            title='Test Draft',
            user=self.user,
            status='draft',
            content_blocks=[
                {
                    'type': 'text',
                    'content': 'Test content',
                    'id': 'block_1'
                }
            ]
        )
        self.content_block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content'},
            order=1
        )
        self.block_action = BlockAction.objects.create(
            block=self.content_block,
            action_type='edit',
            label='Edit',
            icon='edit',
            order=1
        )
    
    def tearDown(self):
        """Clean up test data"""
        Draft.objects.all().delete()
        User.objects.all().delete()
    
    def test_duplicate_draft(self):
        """Test duplicating a draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:duplicate-draft', kwargs={'draft_id': self.draft.id})
        data = {
            'title': 'Duplicated Draft'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Duplicated Draft')
        self.assertEqual(response.data['user'], self.user.id)
        self.assertEqual(response.data['status'], 'draft')
        
        # Verify original draft still exists
        self.assertTrue(Draft.objects.filter(pk=self.draft.id).exists())
        
        # Verify new draft was created
        new_draft = Draft.objects.get(title='Duplicated Draft')
        self.assertEqual(new_draft.user, self.user)
        self.assertEqual(len(new_draft.content_blocks), 1)
        
        # Verify content blocks were duplicated
        new_blocks = new_draft.blocks.all()
        self.assertEqual(new_blocks.count(), 1)
        self.assertEqual(new_blocks[0].block_type, 'text')
        
        # Verify block actions were duplicated
        new_actions = new_blocks[0].actions.all()
        self.assertEqual(new_actions.count(), 1)
        self.assertEqual(new_actions[0].action_type, 'edit')
    
    def test_duplicate_draft_default_title(self):
        """Test duplicating a draft with default title"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:duplicate-draft', kwargs={'draft_id': self.draft.id})
        data = {}  # No title provided
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test Draft (Copy)')
    
    def test_duplicate_draft_other_user(self):
        """Test duplicating another user's draft"""
        self.client.force_authenticate(user=self.other_user)
        url = reverse('notion_editor:duplicate-draft', kwargs={'draft_id': self.draft.id})
        data = {
            'title': 'Unauthorized Copy'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_duplicate_draft_nonexistent(self):
        """Test duplicating non-existent draft"""
        self.client.force_authenticate(user=self.user)
        url = reverse('notion_editor:duplicate-draft', kwargs={'draft_id': 99999})
        data = {
            'title': 'Copy of Nonexistent'
        }
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
