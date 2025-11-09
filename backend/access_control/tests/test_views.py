from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status

from access_control.models import UserRole
from core.models import Organization, Team, Role

User = get_user_model()


class AssignUserRoleTest(TestCase):
    """test assign_user_role API endpoint"""
    
    @classmethod
    def setUpTestData(cls):
        cls.org = Organization.objects.create(name="TestOrg")
        
        cls.user1 = User.objects.create_user(
            username="user1",
            email="user1@test.com",
            password="password123",
            is_active=True
        )
        cls.user2 = User.objects.create_user(
            username="user2",
            email="user2@test.com",
            password="password123",
            is_active=True
        )

        cls.role1 = Role.objects.create(
            organization=cls.org,
            name="Editor",
            level=1
        )
        cls.role2 = Role.objects.create(
            organization=cls.org,
            name="Viewer",
            level=2
        )
        
        cls.team1 = Team.objects.create(
            organization=cls.org,
            name="TeamA"
        )
        cls.team2 = Team.objects.create(
            organization=cls.org,
            name="TeamB"
        )
        
        cls.client = APIClient()
    
    def test_assign_user_role_success(self):
        """Test assign user role success (no team)"""
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {
            'role_id': self.role1.id
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user_role', response.data)
        self.assertEqual(response.data['user_role']['user_id'], self.user1.id)
        self.assertEqual(response.data['user_role']['role_id'], self.role1.id)
        self.assertIsNone(response.data['user_role']['team_id'])
        
        # Validate the record in the database
        user_role = UserRole.objects.get(
            user=self.user1,
            role=self.role1,
            team=None,
            is_deleted=False
        )
        self.assertIsNotNone(user_role)
    
    def test_assign_user_role_with_team(self):
        """test assign user role success (with team)"""
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {
            'role_id': self.role1.id,
            'team_id': self.team1.id
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user_role']['team_id'], self.team1.id)
        
        # Validate the record in the database
        user_role = UserRole.objects.get(
            user=self.user1,
            role=self.role1,
            team=self.team1,
            is_deleted=False
        )
        self.assertIsNotNone(user_role)
    
    def test_assign_user_role_with_validity_period(self):
        """test assign user role with validity period"""
        now = timezone.now()
        valid_from = (now - timedelta(days=1)).isoformat()
        valid_to = (now + timedelta(days=30)).isoformat()
        
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {
            'role_id': self.role1.id,
            'valid_from': valid_from,
            'valid_to': valid_to
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Validate the validity period
        user_role = UserRole.objects.get(
            user=self.user1,
            role=self.role1,
            team=None,
            is_deleted=False
        )
        self.assertIsNotNone(user_role.valid_from)
        self.assertIsNotNone(user_role.valid_to)
    
    def test_assign_user_role_duplicate_conflict(self):
        """test assign user role duplicate conflict (should return 409 conflict)"""
        UserRole.objects.create(
            user=self.user1,
            role=self.role1,
            team=None,
            is_deleted=False
        )
        
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {
            'role_id': self.role1.id
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('already exists', response.data['error'].lower())
    
    def test_assign_user_role_missing_role_id(self):
        """test missing role_id parameter"""
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {}
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('role_id', response.data['error'].lower())
    
    def test_assign_user_role_user_not_found(self):
        """test user not found"""
        url = f'/api/access_control/users/99999/roles/'
        data = {
            'role_id': self.role1.id
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('user', response.data['error'].lower())
    
    def test_assign_user_role_role_not_found(self):
        """test role not found"""
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {
            'role_id': 99999
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('role', response.data['error'].lower())
    
    def test_assign_user_role_team_not_found(self):
        """test team not found"""
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {
            'role_id': self.role1.id,
            'team_id': 99999
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('team', response.data['error'].lower())
    
    def test_assign_user_role_invalid_valid_to(self):
        """test invalid valid_to date"""
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {
            'role_id': self.role1.id,
            'valid_to': 'invalid-date'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('valid_to', response.data['error'].lower())
    
    def test_assign_user_role_same_user_role_different_team(self):
        """test same user and role but different team (should succeed)"""
        # Create a UserRole without team first
        UserRole.objects.create(
            user=self.user1,
            role=self.role1,
            team=None,
            is_deleted=False
        )
        
        # Create a UserRole with team
        url = f'/api/access_control/users/{self.user1.id}/roles/'
        data = {
            'role_id': self.role1.id,
            'team_id': self.team1.id
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify both records exist
        self.assertEqual(
            UserRole.objects.filter(
                user=self.user1,
                role=self.role1,
                is_deleted=False
            ).count(),
            2
        )


class RemoveUserRoleTest(TestCase):
    """Test remove_user_role API endpoint"""
    
    @classmethod
    def setUpTestData(cls):
        cls.org = Organization.objects.create(name="TestOrg")
        
        cls.user1 = User.objects.create_user(
            username="user1",
            email="user1@test.com",
            password="password123",
            is_active=True
        )
        
        cls.role1 = Role.objects.create(
            organization=cls.org,
            name="Editor",
            level=1
        )
        cls.role2 = Role.objects.create(
            organization=cls.org,
            name="Viewer",
            level=2
        )
        
        cls.team1 = Team.objects.create(
            organization=cls.org,
            name="TeamA"
        )
        
        cls.client = APIClient()
    
    def test_remove_user_role_success_no_team(self):
        """Test remove user role success (no team)"""
        # Create a UserRole first
        user_role = UserRole.objects.create(
            user=self.user1,
            role=self.role1,
            team=None,
            is_deleted=False
        )
        user_role_id = user_role.id
        
        url = f'/api/access_control/users/{self.user1.id}/roles/{self.role1.id}/?team_id='
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('removed', response.data['message'].lower())
        
        # Verify the record is permanently deleted
        with self.assertRaises(UserRole.DoesNotExist):
            UserRole.objects.get(id=user_role_id)
    
    def test_remove_user_role_success_with_team(self):
        """Test remove user role success (with team)"""
        # Create a UserRole with team first
        user_role = UserRole.objects.create(
            user=self.user1,
            role=self.role1,
            team=self.team1,
            is_deleted=False
        )
        user_role_id = user_role.id
        
        url = f'/api/access_control/users/{self.user1.id}/roles/{self.role1.id}/?team_id={self.team1.id}'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the record is permanently deleted
        with self.assertRaises(UserRole.DoesNotExist):
            UserRole.objects.get(id=user_role_id)
    
    def test_remove_user_role_missing_team_parameter(self):
        """Test missing team_id parameter"""
        UserRole.objects.create(
            user=self.user1,
            role=self.role1,
            team=None,
            is_deleted=False
        )
        
        url = f'/api/access_control/users/{self.user1.id}/roles/{self.role1.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('team_id', response.data['error'].lower())
    
    def test_remove_user_role_user_not_found(self):
        """Test user not found"""
        url = f'/api/access_control/users/99999/roles/{self.role1.id}/?team_id='
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('user', response.data['error'].lower())
    
    def test_remove_user_role_role_not_found(self):
        """Test role not found"""
        url = f'/api/access_control/users/{self.user1.id}/roles/99999/?team_id='
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('role', response.data['error'].lower())
    
    def test_remove_user_role_team_not_found(self):
        """Test team not found"""
        url = f'/api/access_control/users/{self.user1.id}/roles/{self.role1.id}/?team_id=99999'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('team', response.data['error'].lower())
    
    def test_remove_user_role_userrole_not_found(self):
        """Test UserRole not found"""
        url = f'/api/access_control/users/{self.user1.id}/roles/{self.role1.id}/?team_id='
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('userrole', response.data['error'].lower())
    
    def test_remove_user_role_different_team(self):
        """Test removing UserRole with different team (should fail)"""
        # Create a UserRole with team
        UserRole.objects.create(
            user=self.user1,
            role=self.role1,
            team=self.team1,
            is_deleted=False
        )
        
        # Try to remove UserRole without team (should fail)
        url = f'/api/access_control/users/{self.user1.id}/roles/{self.role1.id}/?team_id='
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

