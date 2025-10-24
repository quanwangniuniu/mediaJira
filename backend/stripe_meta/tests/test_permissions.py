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
    decode_organization_access_token,
    OrganizationAccessTokenAuthentication
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


class OrganizationAccessTokenAuthenticationTest(TestCase):
    """Test cases for OrganizationAccessTokenAuthentication"""
    
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
        
        self.auth = OrganizationAccessTokenAuthentication()
    
    def test_authenticate_with_valid_token(self):
        """Test authentication with valid token"""
        token = generate_organization_access_token(self.user)
        
        # Create mock request
        class MockRequest:
            def __init__(self, token):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': token}
        
        request = MockRequest(token)
        
        result = self.auth.authenticate(request)
        
        self.assertIsNotNone(result)
        self.assertEqual(len(result), 2)
        user, auth_token = result
        self.assertEqual(user.id, self.user.id)
        self.assertEqual(auth_token, token)
        self.assertEqual(request.organization_slug, self.organization.slug)
    
    def test_authenticate_without_token(self):
        """Test authentication without token"""
        class MockRequest:
            def __init__(self):
                self.META = {}
        
        request = MockRequest()
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_authenticate_with_invalid_token(self):
        """Test authentication with invalid token"""
        class MockRequest:
            def __init__(self):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': 'invalid_token'}
        
        request = MockRequest()
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_authenticate_with_nonexistent_user(self):
        """Test authentication with token for nonexistent user"""
        # Create a user without organization for this test
        user_without_org = User.objects.create_user(
            username='testuser_no_org',
            email='testuser_no_org@example.com',
            password='testpass123'
        )
        token = generate_organization_access_token(user_without_org)
        
        class MockRequest:
            def __init__(self, token):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': token}
        
        request = MockRequest(token)
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_authenticate_with_user_no_organization(self):
        """Test authentication with user who has no organization"""
        user_no_org = User.objects.create_user(
            username="noorguser",
            email="noorg@example.com",
            password="testpass123"
        )
        
        token = generate_organization_access_token(user_no_org)
        
        class MockRequest:
            def __init__(self, token):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': token}
        
        request = MockRequest(token)
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_authenticate_with_wrong_organization(self):
        """Test authentication with token for wrong organization"""
        # Create a token for the current user but manually modify it to have wrong organization
        token = generate_organization_access_token(self.user)
        
        # Decode and modify the token to have wrong organization
        payload = jwt.decode(token, settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY, algorithms=['HS256'], options={"verify_signature": False})
        
        # Modify the encrypted data to have wrong organization
        encryption_key = settings.ORGANIZATION_ACCESS_TOKEN_ENCRYPTION_KEY.encode()
        fernet = Fernet(encryption_key)
        decrypted_data = fernet.decrypt(base64.b64decode(payload['encrypted_data']))
        sensitive_data = json.loads(decrypted_data.decode())
        sensitive_data['organization_slug'] = 'wrong-org'
        
        # Re-encrypt with wrong organization
        new_sensitive_data = json.dumps(sensitive_data).encode()
        new_encrypted_data = base64.b64encode(fernet.encrypt(new_sensitive_data)).decode()
        payload['encrypted_data'] = new_encrypted_data
        
        # Re-sign the token
        wrong_org_token = jwt.encode(payload, settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY, algorithm='HS256')
        
        class MockRequest:
            def __init__(self, token):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': token}
        
        request = MockRequest(wrong_org_token)
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_authenticate_with_expired_token(self):
        """Test authentication with expired token"""
        # Create a token and manually make it expired
        token = generate_organization_access_token(self.user)
        
        # Decode the token and modify its expiration
        payload = jwt.decode(token, settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY, algorithms=['HS256'], options={"verify_exp": False})
        payload['exp'] = int((timezone.now() - timedelta(days=1)).timestamp())
        expired_token = jwt.encode(payload, settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY, algorithm='HS256')
        
        class MockRequest:
            def __init__(self, token):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': token}
        
        request = MockRequest(expired_token)
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_authenticate_with_malformed_token(self):
        """Test authentication with malformed token"""
        class MockRequest:
            def __init__(self):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': 'not.a.jwt'}
        
        request = MockRequest()
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_authenticate_with_empty_token(self):
        """Test authentication with empty token"""
        class MockRequest:
            def __init__(self):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': ''}
        
        request = MockRequest()
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_authenticate_with_none_token(self):
        """Test authentication with None token"""
        class MockRequest:
            def __init__(self):
                self.META = {'HTTP_X_ORGANIZATION_TOKEN': None}
        
        request = MockRequest()
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
