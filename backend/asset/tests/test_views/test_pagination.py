from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from asset.models import Asset, AssetVersion, AssetComment
from core.models import Organization, Team, Project
from task.models import Task

User = get_user_model()


class AssetListViewPaginationTest(APITestCase):
    """Test pagination for AssetListView (GET /assets/)"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        

        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )

                # Create test task
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
 
        
        # Create test assets (12 total)
        for i in range(12):
            Asset.objects.create(
                task=self.task,
                owner=self.user,
                team=self.team,
                status=Asset.NOT_SUBMITTED,
                tags=[f'test{i}']
            )
        
        self.client.force_authenticate(user=self.user)
        self.url = reverse('asset:asset-list')
    
    def test_default_pagination_page_size_5(self):
        """Test default pagination with page_size=5"""
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertEqual(len(response.data['results']), 5)  # Default page_size=5
        self.assertEqual(response.data['count'], 12)
        self.assertIsNotNone(response.data['next'])  # Should have next page
        self.assertIsNone(response.data['previous'])  # First page, no previous
    
    def test_custom_page_size_3(self):
        """Test pagination with custom page_size=3"""
        response = self.client.get(f'{self.url}?page_size=3')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
        self.assertEqual(response.data['count'], 12)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])
    
    def test_max_page_size_limit_100(self):
        """Test that page_size is limited by max_page_size=100"""
        response = self.client.get(f'{self.url}?page_size=200')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 100)  # Limited to 100
        self.assertEqual(response.data['count'], 12)
    
    def test_second_page_navigation(self):
        """Test navigation to second page"""
        # Get first page
        first_page_response = self.client.get(self.url)
        self.assertEqual(first_page_response.status_code, status.HTTP_200_OK)
        
        # Get second page using next URL
        next_url = first_page_response.data['next']
        second_page_response = self.client.get(next_url)
        
        self.assertEqual(second_page_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page_response.data['results']), 5)  # Second page has 5 items
        self.assertEqual(second_page_response.data['count'], 12)
        self.assertIsNotNone(second_page_response.data['next'])  # Should have next page
        self.assertIsNotNone(second_page_response.data['previous'])  # Should have previous page
    
    def test_last_page(self):
        """Test navigation to last page"""
        # Get first page
        response = self.client.get(self.url)
        
        # Navigate to last page
        while response.data['next']:
            response = self.client.get(response.data['next'])
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 12)
        self.assertIsNone(response.data['next'])  # No next page
        self.assertIsNotNone(response.data['previous'])  # Should have previous page
        # Last page should have 2 items (12 total - 5 - 5 = 2)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_unauthenticated_user_gets_401(self):
        """Test that unauthenticated user gets 401"""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AssetVersionListViewPaginationTest(APITestCase):
    """Test pagination for AssetVersionListView (GET /assets/{id}/versions/)"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )

        # Create project and task
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test']
        )
        
        # Create test versions (12 total)
        for i in range(12):
            AssetVersion.objects.create(
                asset=self.asset,
                version_number=i + 1,
                uploaded_by=self.user,
                scan_status=AssetVersion.CLEAN
            )
        
        self.client.force_authenticate(user=self.user)
        self.url = reverse('asset:asset-version-list', kwargs={'asset_id': self.asset.pk})
    
    def test_default_pagination_page_size_5(self):
        """Test default pagination with page_size=5"""
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertEqual(len(response.data['results']), 5)  # Default page_size=5
        self.assertEqual(response.data['count'], 12)
        self.assertIsNotNone(response.data['next'])  # Should have next page
        self.assertIsNone(response.data['previous'])  # First page, no previous
    
    def test_custom_page_size_3(self):
        """Test pagination with custom page_size=3"""
        response = self.client.get(f'{self.url}?page_size=3')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
        self.assertEqual(response.data['count'], 12)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])
    
    def test_max_page_size_limit_100(self):
        """Test that page_size is limited by max_page_size=100"""
        response = self.client.get(f'{self.url}?page_size=200')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 100)  # Limited to 100
        self.assertEqual(response.data['count'], 12)
    
    def test_second_page_navigation(self):
        """Test navigation to second page"""
        # Get first page
        first_page_response = self.client.get(self.url)
        self.assertEqual(first_page_response.status_code, status.HTTP_200_OK)
        
        # Get second page using next URL
        next_url = first_page_response.data['next']
        second_page_response = self.client.get(next_url)
        
        self.assertEqual(second_page_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page_response.data['results']), 5)  # Second page has 5 items
        self.assertEqual(second_page_response.data['count'], 12)
        self.assertIsNotNone(second_page_response.data['next'])  # Should have next page
        self.assertIsNotNone(second_page_response.data['previous'])  # Should have previous page
    
    def test_unauthenticated_user_gets_401(self):
        """Test that unauthenticated user gets 401"""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AssetCommentListViewPaginationTest(APITestCase):
    """Test pagination for AssetCommentListView (GET /assets/{id}/comments/)"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )

        # Create project and task
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test']
        )
        
        # Create test comments (12 total)
        for i in range(12):
            AssetComment.objects.create(
                asset=self.asset,
                user=self.user,
                body=f"Test comment {i + 1}"
            )
        
        self.client.force_authenticate(user=self.user)
        self.url = reverse('asset:asset-comment-list', kwargs={'asset_id': self.asset.pk})
    
    def test_default_pagination_page_size_5(self):
        """Test default pagination with page_size=5"""
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertEqual(len(response.data['results']), 5)  # Default page_size=5
        self.assertEqual(response.data['count'], 12)
        self.assertIsNotNone(response.data['next'])  # Should have next page
        self.assertIsNone(response.data['previous'])  # First page, no previous
    
    def test_custom_page_size_3(self):
        """Test pagination with custom page_size=3"""
        response = self.client.get(f'{self.url}?page_size=3')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
        self.assertEqual(response.data['count'], 12)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])
    
    def test_max_page_size_limit_100(self):
        """Test that page_size is limited by max_page_size=100"""
        response = self.client.get(f'{self.url}?page_size=200')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 100)  # Limited to 100
        self.assertEqual(response.data['count'], 12)
    
    def test_second_page_navigation(self):
        """Test navigation to second page"""
        # Get first page
        first_page_response = self.client.get(self.url)
        self.assertEqual(first_page_response.status_code, status.HTTP_200_OK)
        
        # Get second page using next URL
        next_url = first_page_response.data['next']
        second_page_response = self.client.get(next_url)
        
        self.assertEqual(second_page_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page_response.data['results']), 5)  # Second page has 5 items
        self.assertEqual(second_page_response.data['count'], 12)
        self.assertIsNotNone(second_page_response.data['next'])  # Should have next page
        self.assertIsNotNone(second_page_response.data['previous'])  # Should have previous page
    
    def test_unauthenticated_user_gets_401(self):
        """Test that unauthenticated user gets 401"""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class AssetHistoryViewPaginationTest(APITestCase):
    """Test pagination for AssetHistoryView (GET /assets/{id}/history/)"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create test organization and team
        self.organization = Organization.objects.create(
            name="Test Organization"
        )
        self.team = Team.objects.create(
            organization=self.organization,
            name="Test Team"
        )

        # Create project and task
        self.project = Project.objects.create(name="Test Project", organization=self.organization)
        self.task = Task.objects.create(summary="Test Task", type="asset", project=self.project)
        
        # Create test asset
        self.asset = Asset.objects.create(
            task=self.task,
            owner=self.user,
            team=self.team,
            status=Asset.NOT_SUBMITTED,
            tags=['test']
        )
        
        # Create test history items (versions, comments)
        for i in range(4):
            AssetVersion.objects.create(
                asset=self.asset,
                version_number=i + 1,
                uploaded_by=self.user,
                scan_status=AssetVersion.CLEAN
            )
        
        for i in range(4):
            AssetComment.objects.create(
                asset=self.asset,
                user=self.user,
                body=f"Test comment {i + 1}"
            )
        
        self.client.force_authenticate(user=self.user)
        self.url = reverse('asset:asset-history', kwargs={'asset_id': self.asset.pk})
    
    def test_default_pagination_page_size_5(self):
        """Test default pagination with page_size=5"""
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('results', response.data)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertEqual(len(response.data['results']), 5)  # Default page_size=5
        self.assertEqual(response.data['count'], 9)  # 1 asset_created + 4 versions + 4 comments
        self.assertIsNotNone(response.data['next'])  # Should have next page
        self.assertIsNone(response.data['previous'])  # First page, no previous
    
    def test_custom_page_size_3(self):
        """Test pagination with custom page_size=3"""
        response = self.client.get(f'{self.url}?page_size=3')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 3)
        self.assertEqual(response.data['count'], 9)
        self.assertIsNotNone(response.data['next'])
        self.assertIsNone(response.data['previous'])
    
    def test_max_page_size_limit_100(self):
        """Test that page_size is limited by max_page_size=100"""
        response = self.client.get(f'{self.url}?page_size=200')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLessEqual(len(response.data['results']), 100)  # Limited to 100
        self.assertEqual(response.data['count'], 9)
    
    def test_second_page_navigation(self):
        """Test navigation to second page"""
        # Get first page
        first_page_response = self.client.get(self.url)
        self.assertEqual(first_page_response.status_code, status.HTTP_200_OK)
        
        # Get second page using next URL
        next_url = first_page_response.data['next']
        second_page_response = self.client.get(next_url)
        
        self.assertEqual(second_page_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(second_page_response.data['results']), 4)  # Second page has 4 items (9 total - 5 = 4)
        self.assertEqual(second_page_response.data['count'], 9)
        self.assertIsNone(second_page_response.data['next'])  # No next page
        self.assertIsNotNone(second_page_response.data['previous'])  # Should have previous page
    
    def test_unauthenticated_user_gets_401(self):
        """Test that unauthenticated user gets 401"""
        self.client.force_authenticate(user=None)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED) 