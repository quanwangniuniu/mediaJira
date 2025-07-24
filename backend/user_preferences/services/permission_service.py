# user_preferences/services/permission_service.py
from django.contrib.auth import get_user_model
from access_control.models import UserRole, RolePermission
from core.models import Permission
from django.conf import settings

User = get_user_model()

class PermissionService:
    @staticmethod
    def get_user_permissions(user_id):
        """Get user permissions using API"""
        try:
            # Import requests only when needed to avoid import errors
            import requests

            # Call the permission API
            api_url = f"http://localhost/api/access_control/users/{user_id}/permissions/"
            print(f"=== DEBUG INFO ===")
            print(f"User ID: {user_id}")
            print(f"Calling API: {api_url}")
            
            response = requests.get(api_url)
            print(f"Response status: {response.status_code}")
            print(f"==================")
            
            if response.status_code == 200:
                data = response.json()
                print(f"API response data: {data}")
                # API returns format: [{"id": 1, "module": "CAMPAIGN", "action": "VIEW"}, ...]
                permissions = []
                for perm in data:
                    permissions.append(f"{perm['module']}:{perm['action']}")
                return permissions
            else:
                # Print error details
                print(f"API call failed with status {response.status_code}")
                return PermissionService._get_permissions_via_orm(user_id)
                
        except Exception as e:
            # When there is a network error, fall back to ORM query
            print(f"API call failed: {e}, falling back to ORM")
            return PermissionService._get_permissions_via_orm(user_id)

    @staticmethod
    def _get_permissions_via_orm(user_id):
        """Fallback method: Get all permissions of the user using direct ORM query"""
        user = User.objects.get(id=user_id)
        
        # Get all roles of the user
        user_roles = UserRole.objects.filter(
            user=user,
            valid_to__isnull=True  # Current valid role
        )
        
        # Get all permissions of these roles
        permissions = set()
        for user_role in user_roles:
            role_permissions = RolePermission.objects.filter(role=user_role.role)
            for role_perm in role_permissions:
                permissions.add(f"{role_perm.permission.module}:{role_perm.permission.action}")
        
        return list(permissions)