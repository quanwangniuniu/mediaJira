from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from core.models import Organization, Role
from access_control.models import UserRole
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

class MeViewTests(APITestCase):

    def setUp(self):
        self.me_url = reverse('me')
        
        # Create organization
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        
        # Create user
        self.user = User.objects.create_user(
            email="testuser@test.com",
            password="securepass",
            username="testuser",
            is_verified=True,
            is_active=True,
            organization=self.organization
        )
        
        # Create role
        self.role = Role.objects.create(
            name="Media Buyer",
            organization=self.organization,
            level=30
        )
        
        # Assign role to user
        UserRole.objects.create(user=self.user, role=self.role)
        
        # Generate token
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

    def test_authenticated_user_me(self):
        """Test that authenticated user can access their profile data"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)
        self.assertIn('email', response.data)
        self.assertIn('username', response.data)
        self.assertIn('is_verified', response.data)
        self.assertIn('organization', response.data)
        self.assertIn('roles', response.data)
        
        # Check specific values
        self.assertEqual(response.data['email'], 'testuser@test.com')
        self.assertEqual(response.data['username'], 'testuser')
        self.assertTrue(response.data['is_verified'])
        self.assertEqual(response.data['organization']['id'], self.organization.id)
        self.assertEqual(response.data['organization']['name'], 'Test Organization')
        self.assertIn('Media Buyer', response.data['roles'])

    def test_unauthenticated_user_me(self):
        """Test that unauthenticated user cannot access profile data"""
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_token_me(self):
        """Test that invalid token returns 401"""
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token')
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_without_organization(self):
        """Test user without organization"""
        user_no_org = User.objects.create_user(
            email="noorg@test.com",
            password="securepass",
            username="noorg",
            is_verified=True,
            is_active=True,
            organization=None
        )
        
        refresh = RefreshToken.for_user(user_no_org)
        access_token = str(refresh.access_token)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data['organization'])
        self.assertEqual(response.data['roles'], [])

    def test_user_with_multiple_roles(self):
        """Test user with multiple roles"""
        # Create additional role
        admin_role = Role.objects.create(
            name="Admin",
            organization=self.organization,
            level=10
        )
        
        # Assign additional role
        UserRole.objects.create(user=self.user, role=admin_role)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get(self.me_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        roles = response.data['roles']
        self.assertIn('Media Buyer', roles)
        self.assertIn('Admin', roles)
        self.assertEqual(len(roles), 2) 