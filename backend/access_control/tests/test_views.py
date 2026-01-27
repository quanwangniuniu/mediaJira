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


class RolesListTest(TestCase):
    """Test roles_list API endpoint"""
    
    @classmethod
    def setUpTestData(cls):
        cls.org1 = Organization.objects.create(name="Org1")
        cls.org2 = Organization.objects.create(name="Org2")
        
        # System roles (no organization)
        cls.system_role1 = Role.objects.create(
            name="Super Admin",
            level=1,
            organization=None
        )
        cls.system_role2 = Role.objects.create(
            name="Admin",
            level=2,
            organization=None
        )
        
        # Organization roles
        cls.org_role1 = Role.objects.create(
            organization=cls.org1,
            name="Editor",
            level=3
        )
        cls.org_role2 = Role.objects.create(
            organization=cls.org1,
            name="Viewer",
            level=4
        )
        cls.org_role3 = Role.objects.create(
            organization=cls.org2,
            name="Viewer",
            level=3
        )
        
        # Deleted role (should not appear in results)
        cls.deleted_role = Role.objects.create(
            organization=cls.org1,
            name="Deleted Role",
            level=5,
            is_deleted=True
        )
        
        cls.client = APIClient()
    
    def test_get_all_roles(self):
        """Test GET all roles (no organization_id filter)"""
        url = '/api/access_control/roles/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # Should return all non-deleted roles (including seeded roles)
        self.assertEqual(len(response.data), Role.objects.filter(is_deleted=False).count())
        
        # Check that deleted role is not included
        role_ids = [role['id'] for role in response.data]
        self.assertNotIn(self.deleted_role.id, role_ids)
    
    def test_get_roles_by_organization(self):
        """Test GET roles filtered by organization_id"""
        url = f'/api/access_control/roles/?organization_id={self.org1.id}'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        # Should return 2 roles for org1
        self.assertEqual(len(response.data), 2)
        
        # Verify all returned roles belong to org1
        for role in response.data:
            self.assertEqual(role['organization_id'], self.org1.id)
    
    def test_get_roles_invalid_organization_id(self):
        """Test GET roles with invalid organization_id"""
        url = '/api/access_control/roles/?organization_id=invalid'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        self.assertIn('organization_id', response.data['error'].lower())
    
    def test_get_roles_nonexistent_organization(self):
        """Test GET roles with non-existent organization_id"""
        url = '/api/access_control/roles/?organization_id=99999'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
    
    def test_create_system_role(self):
        """Test POST create system role (no organization)"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'New System Role',
            'level': 5
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New System Role')
        self.assertEqual(response.data['level'], 5)
        self.assertIsNone(response.data['organization_id'])
        
        # Verify in database
        role = Role.objects.get(id=response.data['id'])
        self.assertEqual(role.name, 'New System Role')
        self.assertIsNone(role.organization)
    
    def test_create_organization_role(self):
        """Test POST create organization role"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'New Org Role',
            'level': 6,
            'organization_id': self.org1.id
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Org Role')
        self.assertEqual(response.data['level'], 6)
        self.assertEqual(response.data['organization_id'], self.org1.id)
        
        # Verify in database
        role = Role.objects.get(id=response.data['id'])
        self.assertEqual(role.organization, self.org1)
    
    def test_create_role_missing_name(self):
        """Test POST create role without name"""
        url = '/api/access_control/roles/'
        data = {
            'level': 5
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('name', response.data['error'].lower())
    
    def test_create_role_missing_level(self):
        """Test POST create role without level"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'Test Role'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('level', response.data['error'].lower())
    
    def test_create_role_negative_level(self):
        """Test POST create role with negative level"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'Test Role',
            'level': -1
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('level', response.data['error'].lower())
        self.assertIn('positive', response.data['error'].lower())
    
    def test_create_role_invalid_level_type(self):
        """Test POST create role with invalid level type"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'Test Role',
            'level': 'invalid'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('level', response.data['error'].lower())
    
    def test_create_role_invalid_organization_id(self):
        """Test POST create role with invalid organization_id"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'Test Role',
            'level': 5,
            'organization_id': 'invalid'
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('organization_id', response.data['error'].lower())
    
    def test_create_role_nonexistent_organization(self):
        """Test POST create role with non-existent organization_id"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'Test Role',
            'level': 5,
            'organization_id': 99999
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_create_role_duplicate_name_same_org(self):
        """Test POST create role with duplicate name in same organization"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'Editor',  # Already exists in org1
            'level': 5,
            'organization_id': self.org1.id
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('already exists', response.data['error'].lower())
    
    def test_create_role_duplicate_name_different_org(self):
        """Test POST create role with duplicate name in different organization (should succeed)"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'Editor',  # Exists in org1, but we're creating for org2
            'level': 5,
            'organization_id': self.org2.id
        }
        response = self.client.post(url, data, format='json')
        
        # Should succeed because it's a different organization
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_create_role_duplicate_name_system(self):
        """Test POST create role with duplicate name for system role"""
        url = '/api/access_control/roles/'
        data = {
            'name': 'Super Admin',  # Already exists as system role
            'level': 5
        }
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('already exists', response.data['error'].lower())


class RoleDetailTest(TestCase):
    """Test role_detail API endpoint"""
    
    @classmethod
    def setUpTestData(cls):
        cls.org1 = Organization.objects.create(name="Org1")
        cls.org2 = Organization.objects.create(name="Org2")
        
        cls.system_role = Role.objects.create(
            name="System Role",
            level=1,
            organization=None
        )
        
        cls.org_role = Role.objects.create(
            organization=cls.org1,
            name="Org Role",
            level=2
        )
        
        cls.client = APIClient()
    
    def test_update_role_name(self):
        """Test PUT update role name"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'name': 'Updated Role Name'
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Role Name')
        
        # Verify in database
        self.org_role.refresh_from_db()
        self.assertEqual(self.org_role.name, 'Updated Role Name')
    
    def test_update_role_level(self):
        """Test PUT update role level"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'level': 10
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['level'], 10)
        
        # Verify in database
        self.org_role.refresh_from_db()
        self.assertEqual(self.org_role.level, 10)
    
    def test_update_role_name_and_level(self):
        """Test PUT update both name and level"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'name': 'Updated Name',
            'level': 15
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Name')
        self.assertEqual(response.data['level'], 15)
        
        # Verify in database
        self.org_role.refresh_from_db()
        self.assertEqual(self.org_role.name, 'Updated Name')
        self.assertEqual(self.org_role.level, 15)
    
    def test_update_role_organization_to_system(self):
        """Test PUT change organization role to system role"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'organization_id': None  # JSON will serialize this as null
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['organization_id'])
        
        # Verify in database
        self.org_role.refresh_from_db()
        self.assertIsNone(self.org_role.organization)
    
    def test_update_role_system_to_organization(self):
        """Test PUT change system role to organization role"""
        url = f'/api/access_control/roles/{self.system_role.id}/'
        data = {
            'organization_id': self.org1.id
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['organization_id'], self.org1.id)
        
        # Verify in database
        self.system_role.refresh_from_db()
        self.assertEqual(self.system_role.organization, self.org1)
    
    def test_update_role_change_organization(self):
        """Test PUT change role from one organization to another"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'organization_id': self.org2.id
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['organization_id'], self.org2.id)
        
        # Verify in database
        self.org_role.refresh_from_db()
        self.assertEqual(self.org_role.organization, self.org2)
    
    def test_update_role_not_found(self):
        """Test PUT update non-existent role"""
        url = '/api/access_control/roles/99999/'
        data = {
            'name': 'Test'
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found', response.data['error'].lower())
    
    def test_update_role_negative_level(self):
        """Test PUT update role with negative level"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'level': -1
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('level', response.data['error'].lower())
        self.assertIn('positive', response.data['error'].lower())
    
    def test_update_role_invalid_level_type(self):
        """Test PUT update role with invalid level type"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'level': 'invalid'
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('level', response.data['error'].lower())
    
    def test_update_role_invalid_organization_id(self):
        """Test PUT update role with invalid organization_id"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'organization_id': 'invalid'
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('organization_id', response.data['error'].lower())
    
    def test_update_role_nonexistent_organization(self):
        """Test PUT update role with non-existent organization_id"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'organization_id': 99999
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_update_role_duplicate_name_same_org(self):
        """Test PUT update role with duplicate name in same organization"""
        # Create another role in org1
        other_role = Role.objects.create(
            organization=self.org1,
            name="Other Role",
            level=3
        )
        
        url = f'/api/access_control/roles/{other_role.id}/'
        data = {
            'name': 'Org Role'  # Same name as self.org_role in org1
        }
        response = self.client.put(url, data, content_type='application/json')
        
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn('already exists', response.data['error'].lower())
    
    def test_update_role_duplicate_name_different_org(self):
        """Test PUT update role with duplicate name in different organization (should succeed)"""
        url = f'/api/access_control/roles/{self.org_role.id}/'
        data = {
            'name': 'Org Role',  # Keep same name but change org
            'organization_id': self.org2.id
        }
        response = self.client.put(url, data, content_type='application/json')
        
        # Should succeed because it's a different organization
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_delete_role_success(self):
        """Test DELETE role (permanent delete)"""
        role_id = self.org_role.id
        role_name = self.org_role.name
        url = f'/api/access_control/roles/{role_id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('deleted', response.data['message'].lower())
        self.assertIn(role_name, response.data['message'])
        
        # Verify role is permanently deleted from database
        with self.assertRaises(Role.DoesNotExist):
            Role.objects.get(id=role_id)
        
        # Verify role is not returned in GET requests
        get_url = '/api/access_control/roles/'
        get_response = self.client.get(get_url)
        role_ids = [role['id'] for role in get_response.data]
        self.assertNotIn(role_id, role_ids)
    
    def test_delete_role_not_found(self):
        """Test DELETE non-existent role"""
        url = '/api/access_control/roles/99999/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found', response.data['error'].lower())
    
    def test_delete_already_deleted_role(self):
        """Test DELETE already soft-deleted role"""
        # Soft delete the role first (mark as deleted but not removed from DB)
        self.org_role.is_deleted = True
        self.org_role.save()
        
        url = f'/api/access_control/roles/{self.org_role.id}/'
        response = self.client.delete(url)
        
        # Should return 404 because get_object_or_404 filters by is_deleted=False
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('not found', response.data['error'].lower())
        
        # Verify the role still exists in database (soft deleted, not hard deleted)
        role = Role.objects.get(id=self.org_role.id)
        self.assertTrue(role.is_deleted)
