"""
Tests for notion_editor custom admin views (API-based)
"""
import json
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from notion_editor.models import Draft, ContentBlock, BlockAction

User = get_user_model()


class CustomAdminTestCase(TestCase):
    """Base test case for custom admin tests"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_staff=True,
            is_superuser=True
        )
        self.client = Client()
        
        # Create test data
        self.draft = Draft.objects.create(
            title='Test Draft',
            user=self.user,
            status='draft',
            content_blocks=[
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
        )
        
        # Create structured content blocks
        self.content_block = ContentBlock.objects.create(
            draft=self.draft,
            block_type='text',
            content={'text': 'Test content block'},
            order=1
        )
        
        # Create block action
        self.block_action = BlockAction.objects.create(
            block=self.content_block,
            action_type='edit',
            label='Edit',
            icon='edit-icon',
            order=1
        )


class CustomAdminViewsTest(CustomAdminTestCase):
    """Test custom admin API views"""
    
    def test_draft_list_api_requires_staff(self):
        """Test that draft list API requires staff permission"""
        # Test unauthenticated access
        url = reverse('notion_editor:ops_draft_list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)  # Redirect to login
        
        # Test non-staff user
        self.client.login(username='testuser', password='testpass123')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 302)  # Redirect to login
        
        # Test staff user
        self.client.force_login(self.admin_user)
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
    
    def test_draft_list_api_functionality(self):
        """Test draft list API functionality"""
        self.client.force_login(self.admin_user)
        url = reverse('notion_editor:ops_draft_list')
        
        # Test basic list
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn('drafts', data)
        self.assertIn('page', data)
        self.assertIn('total_count', data)
        self.assertEqual(len(data['drafts']), 1)
        self.assertEqual(data['drafts'][0]['title'], 'Test Draft')
        
        # Test search functionality
        response = self.client.get(url, {'q': 'Test'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['drafts']), 1)
        
        # Test search with no results
        response = self.client.get(url, {'q': 'NonExistent'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['drafts']), 0)
        
        # Test status filter
        response = self.client.get(url, {'status': 'draft'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['drafts']), 1)
        
        response = self.client.get(url, {'status': 'published'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['drafts']), 0)
    
    def test_draft_detail_api(self):
        """Test draft detail API"""
        self.client.force_login(self.admin_user)
        url = reverse('notion_editor:ops_draft_detail', args=[self.draft.id])
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn('draft', data)
        draft_data = data['draft']
        self.assertEqual(draft_data['id'], self.draft.id)
        self.assertEqual(draft_data['title'], 'Test Draft')
        self.assertEqual(draft_data['status'], 'draft')
        self.assertIn('user', draft_data)
        self.assertIn('content_blocks', draft_data)
        self.assertIn('structured_blocks', draft_data)
        
        # Test 404 for non-existent draft
        url = reverse('notion_editor:ops_draft_detail', args=[99999])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)
    
    def test_draft_action_api(self):
        """Test draft action API"""
        self.client.force_login(self.admin_user)
        
        # Test publish action
        url = reverse('notion_editor:ops_draft_action', args=[self.draft.id, 'publish'])
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertTrue(data['success'])
        self.assertIn('message', data)
        self.assertEqual(data['draft']['status'], 'published')
        
        # Verify draft was actually updated
        self.draft.refresh_from_db()
        self.assertEqual(self.draft.status, 'published')
        
        # Test archive action
        url = reverse('notion_editor:ops_draft_action', args=[self.draft.id, 'archive'])
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['draft']['status'], 'archived')
        
        # Test restore action
        url = reverse('notion_editor:ops_draft_action', args=[self.draft.id, 'restore'])
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data['draft']['status'], 'draft')
        
        # Test delete action
        url = reverse('notion_editor:ops_draft_action', args=[self.draft.id, 'delete'])
        response = self.client.post(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data['draft']['is_deleted'])
        
        # Test invalid action
        url = reverse('notion_editor:ops_draft_action', args=[self.draft.id, 'invalid'])
        response = self.client.post(url)
        self.assertEqual(response.status_code, 400)
        
        # Test GET method not allowed
        url = reverse('notion_editor:ops_draft_action', args=[self.draft.id, 'publish'])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 405)
    
    def test_content_block_list_api(self):
        """Test content block list API"""
        self.client.force_login(self.admin_user)
        url = reverse('notion_editor:ops_block_list')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn('blocks', data)
        self.assertIn('page', data)
        self.assertIn('total_count', data)
        self.assertEqual(len(data['blocks']), 1)
        
        block_data = data['blocks'][0]
        self.assertEqual(block_data['id'], self.content_block.id)
        self.assertEqual(block_data['block_type'], 'text')
        self.assertEqual(block_data['draft_title'], 'Test Draft')
        
        # Test block type filter
        response = self.client.get(url, {'block_type': 'text'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['blocks']), 1)
        
        response = self.client.get(url, {'block_type': 'heading'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['blocks']), 0)
    
    def test_admin_dashboard_api(self):
        """Test admin dashboard API"""
        self.client.force_login(self.admin_user)
        url = reverse('notion_editor:ops_dashboard')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertIn('stats', data)
        self.assertIn('recent_drafts', data)
        
        stats = data['stats']
        self.assertEqual(stats['total_drafts'], 1)
        self.assertEqual(stats['draft_drafts'], 1)
        self.assertEqual(stats['published_drafts'], 0)
        self.assertEqual(stats['archived_drafts'], 0)
        self.assertEqual(stats['total_blocks'], 1)
        self.assertEqual(stats['total_actions'], 1)
        
        recent_drafts = data['recent_drafts']
        self.assertEqual(len(recent_drafts), 1)
        self.assertEqual(recent_drafts[0]['title'], 'Test Draft')
    
    def test_draft_simple_view(self):
        """Test simple HTML view"""
        self.client.force_login(self.admin_user)
        url = reverse('notion_editor:ops_draft_simple_view', args=[self.draft.id])
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/html; charset=utf-8')
        
        # Check that HTML contains draft information
        content = response.content.decode('utf-8')
        self.assertIn('Test Draft', content)
        self.assertIn('testuser', content)
        self.assertIn('draft', content)
        self.assertIn('Content Blocks', content)


class CustomAdminPermissionTest(CustomAdminTestCase):
    """Test permissions for custom admin views"""
    
    def test_all_views_require_staff(self):
        """Test that all custom admin views require staff permission"""
        views_to_test = [
            ('notion_editor:ops_draft_list', []),
            ('notion_editor:ops_draft_detail', [self.draft.id]),
            ('notion_editor:ops_block_list', []),
            ('notion_editor:ops_dashboard', []),
            ('notion_editor:ops_draft_simple_view', [self.draft.id]),
        ]
        
        for view_name, args in views_to_test:
            url = reverse(view_name, args=args)
            
            # Test unauthenticated access
            response = self.client.get(url)
            self.assertEqual(response.status_code, 302, f"View {view_name} should redirect unauthenticated users")
            
            # Test non-staff user
            self.client.login(username='testuser', password='testpass123')
            response = self.client.get(url)
            self.assertEqual(response.status_code, 302, f"View {view_name} should redirect non-staff users")
            
            # Test staff user
            self.client.force_login(self.admin_user)
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200, f"View {view_name} should allow staff users")
            
            self.client.logout()


class CustomAdminIntegrationTest(CustomAdminTestCase):
    """Integration tests for custom admin functionality"""
    
    def test_complete_workflow(self):
        """Test complete admin workflow"""
        self.client.force_login(self.admin_user)
        
        # 1. Check dashboard
        dashboard_url = reverse('notion_editor:ops_dashboard')
        response = self.client.get(dashboard_url)
        self.assertEqual(response.status_code, 200)
        
        # 2. List drafts
        list_url = reverse('notion_editor:ops_draft_list')
        response = self.client.get(list_url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data['drafts']), 1)
        
        # 3. View draft details
        detail_url = reverse('notion_editor:ops_draft_detail', args=[self.draft.id])
        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, 200)
        
        # 4. Publish draft
        action_url = reverse('notion_editor:ops_draft_action', args=[self.draft.id, 'publish'])
        response = self.client.post(action_url)
        self.assertEqual(response.status_code, 200)
        
        # 5. Verify draft is published
        response = self.client.get(detail_url)
        data = response.json()
        self.assertEqual(data['draft']['status'], 'published')
        
        # 6. Check dashboard stats updated
        response = self.client.get(dashboard_url)
        data = response.json()
        self.assertEqual(data['stats']['published_drafts'], 1)
        self.assertEqual(data['stats']['draft_drafts'], 0)
    
    def test_pagination_and_filtering(self):
        """Test pagination and filtering work together"""
        self.client.force_login(self.admin_user)
        
        # Create additional test data
        for i in range(25):
            Draft.objects.create(
                title=f'Draft {i}',
                user=self.user,
                status='draft' if i % 2 == 0 else 'published'
            )
        
        list_url = reverse('notion_editor:ops_draft_list')
        
        # Test pagination
        response = self.client.get(list_url)
        data = response.json()
        self.assertEqual(len(data['drafts']), 20)  # First page
        self.assertTrue(data['has_next'])
        
        # Test second page
        response = self.client.get(list_url, {'page': 2})
        data = response.json()
        self.assertEqual(len(data['drafts']), 6)  # Remaining items
        self.assertFalse(data['has_next'])
        
        # Test filtering with pagination
        response = self.client.get(list_url, {'status': 'published'})
        data = response.json()
        self.assertEqual(len(data['drafts']), 12)  # 12 published drafts
