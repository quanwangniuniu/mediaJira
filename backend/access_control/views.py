from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views import View
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
import json

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view

from .models import Organization, Role, Permission, UserRole, RolePermission

User = get_user_model()


# original asset view
class AssetListView(View):
    def get(self, request):
        return JsonResponse({'assets': []})


class CampaignEditView(View):
    def put(self, request, pk):
        return JsonResponse({'campaign': pk})


# simplified organization view

@api_view(['GET'])
def organizations_list(request):
    """fetch organization list"""
    orgs = Organization.objects.filter(is_deleted=False)
    data = [{'id': org.id, 'name': org.name} for org in orgs]
    return Response(data)


@api_view(['GET'])
def teams_list(request):
    """fetch team list - using teams compeleted by Dev W """
    from teams.models import Team as TeamsModel  # import teams
    
    organization_id = request.query_params.get('organization_id')
    
    # Applied models in teams
    if organization_id:
        teams = TeamsModel.objects.filter(
            organization_id=organization_id,
            deleted_at__isnull=True  # teams used deleted_at instead of is_deleted
        )
    else:
        teams = TeamsModel.objects.filter(deleted_at__isnull=True)
    
    data = []
    for team in teams:
        data.append({
            'id': team.id,
            'name': team.name,
            'organizationId': str(team.organization_id),
            'organization_id': team.organization_id
        })
    
    return Response(data)


@api_view(['GET'])
def roles_list(request):
    """fetch role lists"""
    roles = Role.objects.filter(is_deleted=False).order_by('level')
    data = []
    for role in roles:
        data.append({
            'id': role.id,
            'name': role.name,
            'description': f'Role: {role.name}',
            'rank': role.level,
            'level': role.level,
            'isReadOnly': False
        })
    return Response(data)


@api_view(['GET'])
def permissions_list(request):
    """fetch permission list"""
    permissions = Permission.objects.filter(is_deleted=False)
    data = []
    for perm in permissions:
        # transfer modules' name to the format expected by frontend
        module_map = {
            'ASSET': 'Asset Management',
            'CAMPAIGN': 'Campaign Execution', 
            'BUDGET': 'Budget Approval'
        }
        
        data.append({
            'id': f"{perm.module.lower()}_{perm.action.lower()}",
            'name': f'{perm.action} {perm.module}',
            'description': f'{perm.action} access for {perm.module} module',
            'module': module_map.get(perm.module, perm.module),
            'action': perm.action.capitalize()
        })
    
    return Response(data)


@api_view(['GET'])
def role_permissions_list(request):
    """Fetch rolepermission"""
    role_id = request.query_params.get('role_id')
    
    if role_id:
        role_perms = RolePermission.objects.filter(
            role_id=role_id,
            is_deleted=False
        )
    else:
        role_perms = RolePermission.objects.filter(is_deleted=False)
    
    data = []
    for rp in role_perms:
        data.append({
            'roleId': str(rp.role_id),
            'permissionId': f"{rp.permission.module.lower()}_{rp.permission.action.lower()}",
            'granted': True,
            'role_id': rp.role_id,
            'permission_id': rp.permission_id
        })
    
    return Response(data)


@api_view(['POST'])
def update_role_permissions(request, role_id):
    """Updated permission of a specific role"""
    try:
        # check if the role exist or not
        role = get_object_or_404(Role, id=role_id, is_deleted=False)
        
        # fetch request data
        permissions_data = request.data.get('permissions', [])
        
        if not permissions_data:
            return Response({'error': 'No permissions data provided'}, status=400)
        
        # start to updating permissions
        success_count = 0
        error_count = 0
        
        for perm_data in permissions_data:
            permission_id = perm_data.get('permission_id') or perm_data.get('permissionId')
            granted = perm_data.get('granted', True)
            
            if not permission_id:
                error_count += 1
                continue
            
            # decode permission_id (format: "asset_view" -> module=ASSET, action=VIEW)
            try:
                if isinstance(permission_id, str) and '_' in permission_id:
                    module_part, action_part = permission_id.split('_', 1)
                    module = module_part.upper()
                    action = action_part.upper()
                else:
                    # if the ID is interger format，search by id
                    permission = Permission.objects.get(id=permission_id, is_deleted=False)
                    module = permission.module
                    action = permission.action
            except (ValueError, Permission.DoesNotExist):
                error_count += 1
                continue
            
            try:
                # Search by permission
                permission = Permission.objects.get(
                    module=module, 
                    action=action, 
                    is_deleted=False
                )
                
                if granted:
                    # Add permission（if not exist）
                    role_perm, created = RolePermission.objects.get_or_create(
                        role=role,
                        permission=permission,
                        defaults={'created_at': timezone.now()}
                    )
                    if created or role_perm.is_deleted:
                        role_perm.is_deleted = False
                        role_perm.updated_at = timezone.now()
                        role_perm.save()
                        success_count += 1
                else:
                    # remove permission
                    try:
                        role_perm = RolePermission.objects.get(
                            role=role,
                            permission=permission
                        )
                        role_perm.is_deleted = True
                        role_perm.updated_at = timezone.now()
                        role_perm.save()
                        success_count += 1
                    except RolePermission.DoesNotExist:
                        # permission does not exist
                        success_count += 1
                        
            except Permission.DoesNotExist:
                error_count += 1
                continue
        
        return Response({
            'message': f'Permissions updated successfully. {success_count} updated, {error_count} errors.',
            'success_count': success_count,
            'error_count': error_count
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
def copy_role_permissions(request, to_role_id):
    """copy role permissions"""
    try:
        from_role_id = request.data.get('from_role_id')
        
        if not from_role_id:
            return Response({'error': 'from_role_id is required'}, status=400)
        
        # check if the two roles both exist
        from_role = get_object_or_404(Role, id=from_role_id, is_deleted=False)
        to_role = get_object_or_404(Role, id=to_role_id, is_deleted=False)
        
        # fetch all permissions of the roles
        source_permissions = RolePermission.objects.filter(
            role=from_role,
            is_deleted=False
        )
        
        # Temporarily delete the permissions of the role
        existing_permissions = RolePermission.objects.filter(
            role=to_role,
            is_deleted=False
        )
        existing_permissions.update(is_deleted=True, updated_at=timezone.now())
        
        # copy permissions
        copied_count = 0
        for source_perm in source_permissions:
            role_perm, created = RolePermission.objects.get_or_create(
                role=to_role,
                permission=source_perm.permission,
                defaults={'created_at': timezone.now()}
            )
            
            if created or role_perm.is_deleted:
                role_perm.is_deleted = False
                role_perm.updated_at = timezone.now()
                role_perm.save()
                copied_count += 1
        
        return Response({
            'message': f'Successfully copied {copied_count} permissions from {from_role.name} to {to_role.name}',
            'copied_count': copied_count
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def user_permissions(request, user_id):
    """Fetch user permissions"""
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)
    
    # fetch existed userrole
    now = timezone.now()
    active_roles = UserRole.objects.filter(
        user=user,
        valid_from__lte=now,
        is_deleted=False
    ).filter(
        Q(valid_to__isnull=True) | Q(valid_to__gte=now)
    ).values_list('role_id', flat=True)
    
    if not active_roles:
        return Response([])
    
    # fetch permissions of these roles
    permissions = Permission.objects.filter(
        permission_roles__role_id__in=active_roles,
        permission_roles__is_deleted=False,
        is_deleted=False
    ).distinct()
    
    data = []
    for perm in permissions:
        data.append({
            'id': perm.id,
            'module': perm.module,
            'action': perm.action
        })
    
    return Response(data)


@api_view(['POST']) 
def check_permission(request):
    """Check users' permissions"""
    user_id = request.data.get('user_id') or request.data.get('userId')
    module = request.data.get('module')
    action = request.data.get('action')
    
    if not all([user_id, module, action]):
        return Response({'error': 'Missing required fields'}, status=400)
    
    try:
        user = User.objects.get(id=user_id, is_active=True)
    except User.DoesNotExist:
        return Response({'allowed': False, 'reason': 'User not found'})
    
    # updated later
    return Response({'allowed': True})