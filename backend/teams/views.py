# campaigns/team_api/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.shortcuts import get_object_or_404
import json
from core.models import Team, TeamMember, TeamRole


    


@method_decorator(csrf_exempt, name='dispatch')
class TeamMemberAPIView(View):
    """Base view for team member operations"""
    
    def dispatch(self, request, *args, **kwargs):
        """Handle JSON parsing for all methods"""
        if request.content_type == 'application/json' and request.body:
            try:
                request.json = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({
                    'error': 'Invalid JSON in request body',
                    'code': 'INVALID_JSON'
                }, status=400)
        else:
            request.json = {}
        
        return super().dispatch(request, *args, **kwargs)

@method_decorator(csrf_exempt, name='dispatch')
class TeamMembersView(TeamMemberAPIView):
    """Handle team member operations: GET list, POST add member"""
    
    def get(self, request, team_id):
        """GET /teams/:id/members - List team members"""
        team = get_object_or_404(Team, id=team_id, is_deleted=False)
        
        # Query TeamMember using team relationship
        memberships = TeamMember.objects.filter(team=team)
        
        members = []
        for membership in memberships:
            member_data = {
                'user_id': membership.user.id,
                'team_id': membership.team.id,
                'role_id': membership.role_id,
                'role_name': TeamRole.get_role_name(membership.role_id),
                'created_at': membership.created_at.isoformat(),
                'updated_at': membership.updated_at.isoformat()
            }
            members.append(member_data)
        
        return JsonResponse({
            'team_id': team.id,
            'team_name': team.name,
            'members': members,
            'member_count': len(members)
        })
    
    def post(self, request, team_id):
        """POST /teams/:id/members - Add user to team"""
        team = get_object_or_404(Team, id=team_id, is_deleted=False)
        
        # Validate required fields
        user_id = request.json.get('user_id')
        role_id = request.json.get('role_id', TeamRole.MEMBER)  # Default to MEMBER
        
        if not user_id:
            return JsonResponse({
                'error': 'user_id is required',
                'code': 'MISSING_USER_ID'
            }, status=400)
        
        # Validate role
        if not TeamRole.is_valid_role(role_id):
            return JsonResponse({
                'error': 'Invalid role_id',
                'code': 'INVALID_ROLE',
                'details': {
                    'provided_role_id': role_id,
                    'valid_roles': [TeamRole.LEADER, TeamRole.MEMBER]
                }
            }, status=400)
        
        # Check for duplicate membership
        from core.models import CustomUser
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'error': 'User not found',
                'code': 'USER_NOT_FOUND'
            }, status=404)
        
        existing_membership = TeamMember.objects.filter(
            user=user,
            team=team
        ).first()
        
        if existing_membership:
            return JsonResponse({
                'error': 'User is already a member of this team',
                'code': 'USER_ALREADY_MEMBER',
                'details': {
                    'user_id': user_id,
                    'team_id': team_id,
                    'existing_role': existing_membership.role_id
                }
            }, status=409)
        
        # Create new membership
        try:
            membership = TeamMember.objects.create(
                user=user,
                team=team,
                role_id=role_id
            )
            
            return JsonResponse({
                'message': 'User added to team successfully',
                'membership': {
                    'user_id': membership.user.id,
                    'team_id': membership.team.id,
                    'role_id': membership.role_id,
                    'role_name': TeamRole.get_role_name(membership.role_id),
                    'created_at': membership.created_at.isoformat()
                }
            }, status=201)
            
        except Exception as e:
            return JsonResponse({
                'error': 'Failed to add user to team',
                'code': 'ADD_MEMBER_FAILED',
                'details': str(e)
            }, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class TeamMemberDetailView(TeamMemberAPIView):
    """Handle individual team member operations: PATCH update role, DELETE remove member"""
    
    def patch(self, request, team_id, user_id):
        """PATCH /teams/:id/members/:user_id - Update member role"""
        team = get_object_or_404(Team, id=team_id, is_deleted=False)
        
        # Validate role_id in request
        role_id = request.json.get('role_id')
        if not role_id:
            return JsonResponse({
                'error': 'role_id is required',
                'code': 'MISSING_ROLE_ID'
            }, status=400)
        
        if not TeamRole.is_valid_role(role_id):
            return JsonResponse({
                'error': 'Invalid role_id',
                'code': 'INVALID_ROLE',
                'details': {
                    'provided_role_id': role_id,
                    'valid_roles': [TeamRole.LEADER, TeamRole.MEMBER]
                }
            }, status=400)
        
        # Find and update membership
        from core.models import CustomUser
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'error': 'User not found',
                'code': 'USER_NOT_FOUND'
            }, status=404)
        
        membership = TeamMember.objects.filter(
            user=user,
            team=team
        ).first()
        
        if not membership:
            return JsonResponse({
                'error': 'User is not a member of this team',
                'code': 'USER_NOT_MEMBER'
            }, status=404)
        
        # Update role
        membership.role_id = role_id
        membership.save()
        
        return JsonResponse({
            'message': 'Member role updated successfully',
            'membership': {
                'user_id': membership.user.id,
                'team_id': membership.team.id,
                'role_id': membership.role_id,
                'role_name': TeamRole.get_role_name(membership.role_id),
                'updated_at': membership.updated_at.isoformat()
            }
        })
    
    def delete(self, request, team_id, user_id):
        """DELETE /teams/:id/members/:user_id - Remove member from team"""
        team = get_object_or_404(Team, id=team_id, is_deleted=False)
        
        from core.models import CustomUser
        try:
            user = CustomUser.objects.get(id=user_id)
        except CustomUser.DoesNotExist:
            return JsonResponse({
                'error': 'User not found',
                'code': 'USER_NOT_FOUND'
            }, status=404)
        
        membership = TeamMember.objects.filter(
            user=user,
            team=team
        ).first()
        
        if not membership:
            return JsonResponse({
                'error': 'User is not a member of this team',
                'code': 'USER_NOT_MEMBER'
            }, status=404)
        
        # Remove membership
        membership.delete()
        
        return JsonResponse({
            'message': 'User removed from team successfully'
        }, status=200)

# Additional helper view for team details with members
@method_decorator(csrf_exempt, name='dispatch')
class TeamDetailView(View):
    """GET /teams/:id - Get team details with members"""
    
    def get(self, request, team_id):
        """Get detailed team information with members"""
        team = get_object_or_404(Team, id=team_id, is_deleted=False)
        
        # Get team members using team relationship
        memberships = TeamMember.objects.filter(team=team)
        members = []
        for membership in memberships:
            member_data = {
                'user_id': membership.user.id,
                'role_id': membership.role_id,
                'role_name': TeamRole.get_role_name(membership.role_id),
                'created_at': membership.created_at.isoformat()
            }
            members.append(member_data)
        
        # Get child teams using parent relationship
        child_teams = Team.objects.filter(parent=team, is_deleted=False)
        child_team_list = []
        for child in child_teams:
            child_data = {
                'id': child.id,
                'name': child.name,
                'organization_id': child.organization.id,
                'desc': child.desc,
                'parent_team_id': child.parent.id if child.parent else None,
                'is_parent': child.is_parent,
                'created_at': child.created_at.isoformat(),
                'updated_at': child.updated_at.isoformat()
            }
            child_team_list.append(child_data)
        
        return JsonResponse({
            'team': {
                'id': team.id,
                'name': team.name,
                'organization_id': team.organization.id,
                'organization_name': team.organization.name,
                'desc': team.desc,
                'parent_team_id': team.parent.id if team.parent else None,
                'is_parent': team.is_parent,
                'created_at': team.created_at.isoformat(),
                'updated_at': team.updated_at.isoformat()
            },
            'members': members,
            'member_count': len(members),
            'child_teams': child_team_list,
            'child_team_count': len(child_team_list)
        })