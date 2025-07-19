# campaigns/team_api/views.py
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views import View
from django.shortcuts import get_object_or_404
import json
from .models import Team, TeamMember
from .constants import TeamRole


    


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
        team = get_object_or_404(Team, id=team_id, deleted_at__isnull=True)
        
        # Query TeamMember using team_id since we don't have ForeignKey relationships
        memberships = TeamMember.objects.filter(team_id=team_id)
        
        members = []
        for membership in memberships:
            member_data = {
                'user_id': membership.user_id,
                'team_id': membership.team_id,
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
        team = get_object_or_404(Team, id=team_id, deleted_at__isnull=True)
        
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
        existing_membership = TeamMember.objects.filter(
            user_id=user_id,
            team_id=team_id
        ).first()
        
        if existing_membership:
            return JsonResponse({
                'error': 'User is already a member of this team',
                'code': 'USER_ALREADY_MEMBER',
                'details': {
                    'user_id': user_id,
                    'team_id': team_id,
                    'existing_role': TeamRole.get_role_name(existing_membership.role_id)
                }
            }, status=400)
        
        # Create new membership
        membership = TeamMember.objects.create(
            user_id=user_id,
            team_id=team_id,
            role_id=role_id
        )
        
        return JsonResponse({
            'user_id': membership.user_id,
            'team_id': membership.team_id,
            'role_id': membership.role_id,
            'role_name': TeamRole.get_role_name(membership.role_id),
            'created_at': membership.created_at.isoformat(),
            'updated_at': membership.updated_at.isoformat()
        }, status=201)

@method_decorator(csrf_exempt, name='dispatch')
class TeamMemberDetailView(TeamMemberAPIView):
    """Handle individual team member operations: PATCH role, DELETE member"""
    
    def patch(self, request, team_id, user_id):
        """PATCH /teams/:id/members/:userId - Change user role in team"""
        team = get_object_or_404(Team, id=team_id, deleted_at__isnull=True)
        
        # Get existing membership
        membership = get_object_or_404(
            TeamMember,
            user_id=user_id,
            team_id=team_id
        )
        
        # Get new role from request
        new_role_id = request.json.get('role_id')
        
        if not new_role_id:
            return JsonResponse({
                'error': 'role_id is required',
                'code': 'MISSING_ROLE_ID'
            }, status=400)
        
        # Validate role
        if not TeamRole.is_valid_role(new_role_id):
            return JsonResponse({
                'error': 'Invalid role_id',
                'code': 'INVALID_ROLE',
                'details': {
                    'provided_role_id': new_role_id,
                    'valid_roles': [TeamRole.LEADER, TeamRole.MEMBER]
                }
            }, status=400)
        
        # Update role
        old_role_id = membership.role_id
        membership.role_id = new_role_id
        membership.save()
        
        return JsonResponse({
            'user_id': membership.user_id,
            'team_id': membership.team_id,
            'role_id': membership.role_id,
            'role_name': TeamRole.get_role_name(membership.role_id),
            'previous_role_id': old_role_id,
            'previous_role_name': TeamRole.get_role_name(old_role_id),
            'updated_at': membership.updated_at.isoformat()
        })
    
    def delete(self, request, team_id, user_id):
        """DELETE /teams/:id/members/:userId - Remove user from team"""
        team = get_object_or_404(Team, id=team_id, deleted_at__isnull=True)
        
        # Get existing membership
        membership = get_object_or_404(
            TeamMember,
            user_id=user_id,
            team_id=team_id
        )
        
        # Store info for response
        removed_member = {
            'user_id': membership.user_id,
            'team_id': membership.team_id,
            'role_id': membership.role_id,
            'role_name': TeamRole.get_role_name(membership.role_id)
        }
        
        # Delete membership
        membership.delete()
        
        return JsonResponse({
            'message': 'User removed from team successfully',
            'removed_member': removed_member
        })

# Additional helper view for team details with members
@method_decorator(csrf_exempt, name='dispatch')
class TeamDetailView(View):
    """GET /teams/:id - Get team details with members"""
    
    def get(self, request, team_id):
        """Get detailed team information with members"""
        team = get_object_or_404(Team, id=team_id, deleted_at__isnull=True)
        
        # Get team members using team_id filter
        memberships = TeamMember.objects.filter(team_id=team_id)
        members = []
        for membership in memberships:
            member_data = {
                'user_id': membership.user_id,
                'role_id': membership.role_id,
                'role_name': TeamRole.get_role_name(membership.role_id),
                'created_at': membership.created_at.isoformat()
            }
            members.append(member_data)
        
        # Get child teams using parent_team_id filter
        child_teams = Team.objects.filter(parent_team_id=team_id, deleted_at__isnull=True)
        child_team_list = []
        for child in child_teams:
            child_data = {
                'id': child.id,
                'name': child.name,
                'organization_id': child.organization_id,
                'desc': child.desc,
                'parent_team_id': child.parent_team_id,
                'is_parent': child.is_parent,
                'created_at': child.created_at.isoformat(),
                'updated_at': child.updated_at.isoformat()
            }
            child_team_list.append(child_data)
        
        return JsonResponse({
            'id': team.id,
            'name': team.name,
            'organization_id': team.organization_id,
            'desc': team.desc,
            'parent_team_id': team.parent_team_id,
            'is_parent': team.is_parent,
            'created_at': team.created_at.isoformat(),
            'updated_at': team.updated_at.isoformat(),
            'members': members,
            'child_teams': child_team_list,
            'member_count': len(members),
            'child_team_count': len(child_team_list)
        })