from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import jwt
from django.conf import settings
from cryptography.fernet import Fernet
import base64
import json


from stripe_meta.permissions import (
    generate_organization_access_token,
    decode_organization_access_token
)
from core.models import Organization

User = get_user_model()


class OrganizationAccessTokenTest(TestCase):
    """Test cases for organization access token functionality"""
    
    def setUp(self):
        self.organization = Organization.objects.create(
            name="Test Organization",
            slug="test-org"
        )
        
        self.user = User.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            organization=self.organization
        )
    
    def test_generate_organization_access_token(self):
        """Test generating organization access token"""
        token = generate_organization_access_token(self.user)
        
        self.assertIsNotNone(token)
        self.assertIsInstance(token, str)
        # Token should be a JWT with 3 parts (header.payload.signature)
        self.assertEqual(len(token.split('.')), 3)
    
    def test_decode_organization_access_token_valid(self):
        """Test decoding valid organization access token"""
        token = generate_organization_access_token(self.user)
        
        payload = decode_organization_access_token(token)
        
        self.assertIsNotNone(payload)
        self.assertEqual(payload['user_id'], self.user.id)
        self.assertEqual(payload['organization_slug'], self.organization.slug)
        self.assertIn('exp', payload)
        self.assertIn('iat', payload)
    
    def test_decode_organization_access_token_invalid(self):
        """Test decoding invalid organization access token"""
        invalid_token = "invalid.token.here"
        
        payload = decode_organization_access_token(invalid_token)
        
        self.assertIsNone(payload)
    
    def test_decode_organization_access_token_expired(self):
        """Test decoding expired organization access token"""
        # Create a token and manually make it expired
        token = generate_organization_access_token(self.user)
        
        # Decode the token and modify its expiration
        payload = jwt.decode(token, settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY, algorithms=['HS256'], options={"verify_exp": False})
        payload['exp'] = int((timezone.now() - timedelta(days=1)).timestamp())
        expired_token = jwt.encode(payload, settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY, algorithm='HS256')
        
        result = decode_organization_access_token(expired_token)
        
        self.assertIsNone(result)
    
    def test_decode_organization_access_token_wrong_signature(self):
        """Test decoding token with wrong signature"""
        # Create a token normally
        token = generate_organization_access_token(self.user)
        
        # Try to decode with wrong secret
        try:
            payload = jwt.decode(token, 'wrong_secret', algorithms=['HS256'])
            # If we get here, the test should fail
            self.fail("Expected JWT decode to fail with wrong secret")
        except jwt.InvalidTokenError:
            # This is expected - the token should be invalid with wrong secret
            pass
        
        # The decode_organization_access_token should return None for invalid tokens
        result = decode_organization_access_token(token)
        # This might not be None if the token is still valid with the correct secret
        # Let's create a token with wrong signature by modifying it
        payload = jwt.decode(token, settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY, algorithms=['HS256'], options={"verify_signature": False})
        wrong_sig_token = jwt.encode(payload, 'wrong_secret', algorithm='HS256')
        
        result = decode_organization_access_token(wrong_sig_token)
        self.assertIsNone(result)
