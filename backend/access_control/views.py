from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views import View
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.db import transaction
import json

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import api_view

from .models import Organization, Role, Permission, UserRole, RolePermission, ModuleApprover, Team

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
    """fetch team list - using core models """
    from core.models import Team
    
    organization_id = request.query_params.get('organization_id')
    
    # Use core models
    if organization_id:
        teams = Team.objects.filter(
            organization_id=organization_id,
            is_deleted=False
        )
    else:
        teams = Team.objects.filter(is_deleted=False)
    
    data = []
    for team in teams:
        data.append({
            'id': team.id,
            'name': team.name,
            'organizationId': str(team.organization.id),
            'organization_id': team.organization.id
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


@api_view(['GET'])
def approver_list(request):
    """fetch all users that can be configured as approvers"""
    try:
        users = User.objects.all().values('id', 'username', 'email')
        return Response(list(users))
    except Exception as e:
        print(f"[approver_list] Exception: {e}")
        import traceback; traceback.print_exc()
        return Response({'error': str(e)}, status=500)

@api_view(['GET', 'POST'])
def approver_detail(request, permission_id):
    try:
        permission = get_object_or_404(Permission, id=permission_id)
        User = get_user_model()
        if request.method == 'GET':
            approvers = PermissionApprover.objects.filter(permission=permission)
            users = User.objects.filter(id__in=approvers.values_list('user_id', flat=True)).values('id', 'username', 'email')
            return Response(list(users))
        elif request.method == 'POST':
            user_ids = request.data.get('user_ids', [])
            # delete approver not in user_id
            PermissionApprover.objects.filter(permission=permission).exclude(user_id__in=user_ids).delete()
            # add new approvers
            for user_id in user_ids:
                PermissionApprover.objects.get_or_create(permission=permission, user_id=user_id)
            return Response({'status': 'success'})
    except Exception as e:
        print(f"[approver_detail] Exception: {e}")
        import traceback; traceback.print_exc()
        return Response({'error': str(e)}, status=500)

@api_view(['DELETE'])
def approver_remove(request, permission_id, user_id):
    try:
        permission = get_object_or_404(Permission, id=permission_id)
        PermissionApprover.objects.filter(permission=permission, user_id=user_id).delete()
        return Response({'status': 'deleted'})
    except Exception as e:
        print(f"[approver_remove] Exception: {e}")
        import traceback; traceback.print_exc()
        return Response({'error': str(e)}, status=500)

@api_view(['GET', 'POST'])
def module_approver_detail(request, module):
    module = module.upper()
    User = get_user_model()
    if request.method == 'GET':
        approvers = ModuleApprover.objects.filter(module=module)

        # if no approvers, return empty list
        if not approvers.exists():
            return Response([])

        users = User.objects.filter(id__in=approvers.values_list('user_id', flat=True)).values('id', 'username', 'email')
        return Response(list(users))
    elif request.method == 'POST':
        user_ids = request.data.get('user_ids', [])
        ModuleApprover.objects.filter(module=module).exclude(user_id__in=user_ids).delete()
        for user_id in user_ids:
            ModuleApprover.objects.get_or_create(module=module, user_id=user_id)
        return Response({'status': 'success'})

@api_view(['DELETE'])
def module_approver_remove(request, module, user_id):
    module = module.upper()
    ModuleApprover.objects.filter(module=module, user_id=user_id).delete()
    return Response({'status': 'deleted'})

@api_view(['POST'])
def assign_user_role(request, user_id: int):
    """
    Assign an existing role to a user (optional binding team)
    Body: { "role_id": int, "team_id": int|null, "valid_from": isoString?, "valid_to": isoString? }
    Rules:
      - If the same (user, role, team) exists and is soft deleted, it will be restored (is_deleted=False), and the validity period will be updated
      - If a non-deleted record exists, return 409 conflict (to avoid duplicate assignment)
    """
    role_id = request.data.get('role_id')
    team_id = request.data.get('team_id', None)
    valid_from = request.data.get('valid_from', None)
    valid_to = request.data.get('valid_to', None)

    if not role_id:
        return Response({"error": "role_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    # Basic entity validation
    user = get_object_or_404(User, id=user_id, is_active=True)
    role = get_object_or_404(Role, id=role_id, is_deleted=False)
    team = None
    if team_id is not None:
        team = get_object_or_404(Team, id=team_id, is_deleted=False)

    # Handle validity period
    now = timezone.now()
    try:
        parsed_from = timezone.datetime.fromisoformat(valid_from) if valid_from else now
        if parsed_from.tzinfo is None:
            parsed_from = parsed_from.replace(tzinfo=timezone.get_current_timezone())
    except Exception:
        parsed_from = now

    parsed_to = None
    if valid_to:
        try:
            parsed_to = timezone.datetime.fromisoformat(valid_to)
            if parsed_to.tzinfo is None:
                parsed_to = parsed_to.replace(tzinfo=timezone.get_current_timezone())
        except Exception:
            return Response({"error": "valid_to must be ISO datetime"}, status=400)

    with transaction.atomic():
        # Check if there is a UserRole with the same (user, role, team)
        existing = UserRole.objects.filter(user=user, role=role, team=team).first()

        if existing:
            if existing.is_deleted:
                # Restore the UserRole
                existing.is_deleted = False
                existing.valid_from = parsed_from
                existing.valid_to = parsed_to
                existing.save(update_fields=['is_deleted', 'valid_from', 'valid_to', 'updated_at'])
                status_code = status.HTTP_200_OK
                created = False
            else:
                # A valid mapping already exists
                return Response({
                    "error": "UserRole already exists",
                    "detail": {"user_id": user.id, "role_id": role.id, "team_id": team.id if team else None}
                }, status=status.HTTP_409_CONFLICT)
        else:
            # Create a new UserRole
            ur = UserRole.objects.create(
                user=user,
                role=role,
                team=team,
                valid_from=parsed_from,
                valid_to=parsed_to
            )
            existing = ur
            status_code = status.HTTP_201_CREATED
            created = True

    return Response({
        "message": "user role assigned" if created else "user role restored",
        "user_role": {
            "user_id": existing.user_id,
            "role_id": existing.role_id,
            "team_id": existing.team_id,
            "valid_from": existing.valid_from,
            "valid_to": existing.valid_to
        }
    }, status=status_code)

@api_view(['DELETE'])
def remove_user_role(request, user_id: int, role_id: int):
    """
    Remove a user role (soft delete)
    Query conditions:
      - Must pass team_id, or explicitly specify no team (team_id is empty string "")
    """
    team_id = request.query_params.get('team_id', None)
    user = get_object_or_404(User, id=user_id, is_active=True)
    role = get_object_or_404(Role, id=role_id, is_deleted=False)
    
    # Validate team parameter
    if team_id == "":
        # Explicitly delete the UserRole record with team=None
        team = None
    elif team_id is None:
        # Ambiguous request - it is required to provide a team_id or an empty string to target team=None
        return Response({"error": "team_id is required (use empty to target team=None)"}, status=400)
    else:
        team = get_object_or_404(Team, id=team_id, is_deleted=False)

    ur = UserRole.objects.filter(user=user, role=role, team=team, is_deleted=False).first()
    if not ur:
        return Response({"error": "UserRole not found"}, status=status.HTTP_404_NOT_FOUND)

    ur.is_deleted = True
    ur.valid_to = timezone.now()
    ur.save(update_fields=['is_deleted', 'valid_to', 'updated_at'])

    return Response(status=status.HTTP_204_NO_CONTENT)
