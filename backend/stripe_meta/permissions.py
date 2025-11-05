from rest_framework.authentication import BaseAuthentication
from rest_framework.permissions import BasePermission
from django.contrib.auth import get_user_model
import jwt
import json
import base64
from cryptography.fernet import Fernet
from datetime import datetime, timedelta, timezone
from django.conf import settings

User = get_user_model()

def generate_organization_access_token(user):
    """
    Generate an encrypted access token containing user_id and organization slug.
    Only generates token if user belongs to an organization.
    """
    if not user.organization:
        return None
    
    # Create the sensitive payload
    sensitive_data = {
        'user_id': user.id,
        'organization_slug': user.organization.slug,
    }
    
    # Encrypt the sensitive data
    encryption_key = settings.ORGANIZATION_ACCESS_TOKEN_ENCRYPTION_KEY.encode()
    fernet = Fernet(encryption_key)
    encrypted_data = fernet.encrypt(json.dumps(sensitive_data).encode())
    
    # Create JWT payload with encrypted data
    payload = {
        'encrypted_data': base64.b64encode(encrypted_data).decode(),
        'exp': datetime.now(timezone.utc) + timedelta(hours=24),  # 24 hour expiration
        'iat': datetime.now(timezone.utc),
        'type': 'access'
    }
    
    # Use Django's SECRET_KEY for signing
    secret_key = settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY
    token = jwt.encode(payload, secret_key, algorithm='HS256')
    
    return token

def decode_organization_access_token(token):
    """
    Decode and validate an encrypted organization access token.
    Returns the decrypted payload if valid, None if invalid.
    """
    try:
        secret_key = settings.ORGANIZATION_ACCESS_TOKEN_SECRET_KEY
        payload = jwt.decode(token, secret_key, algorithms=['HS256'])
        
        # Validate token type
        if payload.get('type') != 'access':
            return None
        
        # Decrypt the sensitive data
        encrypted_data = payload.get('encrypted_data')
        if not encrypted_data:
            return None
            
        encryption_key = settings.ORGANIZATION_ACCESS_TOKEN_ENCRYPTION_KEY.encode()
        fernet = Fernet(encryption_key)
        decrypted_data = fernet.decrypt(base64.b64decode(encrypted_data))
        sensitive_data = json.loads(decrypted_data.decode())
        
        # Merge decrypted data with JWT payload
        result = {**payload, **sensitive_data}
        return result
        
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    except Exception:
        return None

class HasValidOrganizationToken(BasePermission):
    """
    Permission class that checks if the user has a valid organization token
    that matches their authenticated user ID and organization.
    """
    def has_permission(self, request, view):
        # Check if user is authenticated
        if not request.user.is_authenticated:
            return False
        
        # Check for organization access token in specific header
        org_token = request.META.get('HTTP_X_ORGANIZATION_TOKEN')
        if not org_token:
            return False
            
        # Decode and validate the organization token
        payload = decode_organization_access_token(org_token)
        if not payload:
            return False
        
        # Validate that the token's user_id matches the authenticated user's ID
        if request.user.id != payload['user_id']:
            return False
            
        # Validate that the token's organization_slug matches the user's organization
        if not request.user.organization:
            return False
            
        if request.user.organization.slug != payload['organization_slug']:
            return False
            
        # Store organization info in request for use in views
        request.organization = request.user.organization
        
        return True
