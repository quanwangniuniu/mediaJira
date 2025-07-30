"""
Compatibility layer for teams app to use core models
This allows existing teams code to work with the new core models
"""

from core.models import Organization, Team, TeamMember, TeamRole, CustomUser
from django.core.exceptions import ValidationError
from django.db import transaction


# Re-export TeamRole for backward compatibility
__all__ = ['Organization', 'Team', 'TeamMember', 'TeamRole']


# Compatibility functions that maintain the old API
def add_member(team_id, user_id, role_id=TeamRole.MEMBER):
    """Add a user to a team with a specific role."""
    if not TeamRole.is_valid_role(role_id):
        raise ValidationError("Invalid role_id")
    
    try:
        team = Team.objects.get(id=team_id)
        user = CustomUser.objects.get(id=user_id)
    except (Team.DoesNotExist, CustomUser.DoesNotExist):
        raise ValidationError("Team or User not found")
    
    if TeamMember.objects.filter(user=user, team=team).exists():
        raise ValidationError("User is already a member of this team")
    
    return TeamMember.objects.create(user=user, team=team, role_id=role_id)


def remove_member(team_id, user_id):
    """Remove a user from a team."""
    try:
        team = Team.objects.get(id=team_id)
        user = CustomUser.objects.get(id=user_id)
    except (Team.DoesNotExist, CustomUser.DoesNotExist):
        raise ValidationError("Team or User not found")
    
    membership = TeamMember.objects.filter(user=user, team=team).first()
    if not membership:
        raise ValidationError("User is not a member of this team")
    
    membership.delete()
    return True


def assign_leader(team_id, user_id):
    """Assign a user as the team leader. Only one leader per team."""
    with transaction.atomic():
        try:
            team = Team.objects.get(id=team_id)
            user = CustomUser.objects.get(id=user_id)
        except (Team.DoesNotExist, CustomUser.DoesNotExist):
            raise ValidationError("Team or User not found")
        
        # Remove existing leader
        TeamMember.objects.filter(team=team, role_id=TeamRole.LEADER).update(role_id=TeamRole.MEMBER)
        
        # Assign new leader
        membership, created = TeamMember.objects.get_or_create(
            user=user, 
            team=team,
            defaults={'role_id': TeamRole.LEADER}
        )
        if not created:
            membership.role_id = TeamRole.LEADER
            membership.save()
        
        return membership


def change_member_role(team_id, user_id, new_role_id):
    """Change a team member's role."""
    if not TeamRole.is_valid_role(new_role_id):
        raise ValidationError("Invalid role_id")
    
    try:
        team = Team.objects.get(id=team_id)
        user = CustomUser.objects.get(id=user_id)
    except (Team.DoesNotExist, CustomUser.DoesNotExist):
        raise ValidationError("Team or User not found")
    
    membership = TeamMember.objects.filter(user=user, team=team).first()
    if not membership:
        raise ValidationError("User is not a member of this team")
    
    membership.role_id = new_role_id
    membership.save()
    return membership


def user_can_manage_team(user_id, team_id):
    """Check if the user is the leader of the team (can manage members)."""
    try:
        team = Team.objects.get(id=team_id)
        user = CustomUser.objects.get(id=user_id)
    except (Team.DoesNotExist, CustomUser.DoesNotExist):
        return False
    
    return TeamMember.objects.filter(
        user=user, 
        team=team, 
        role_id=TeamRole.LEADER
    ).exists()


def user_can_modify_team(user_id, team_id):
    """Check if the user can modify the team (LEADER or ADMIN)."""
    return user_can_manage_team(user_id, team_id)


def is_same_organization(user_id, team_id):
    """Check if the user and the team belong to the same organization."""
    try:
        team = Team.objects.get(id=team_id)
        user = CustomUser.objects.get(id=user_id)
    except (Team.DoesNotExist, CustomUser.DoesNotExist):
        return False
    
    # Check if user's organization matches team's organization
    return user.organization == team.organization


def is_valid_team_hierarchy(parent_team_id, child_team_id):
    """Check if assigning child_team_id under parent_team_id would create a cycle."""
    try:
        parent_team = Team.objects.get(id=parent_team_id)
        child_team = Team.objects.get(id=child_team_id)
    except Team.DoesNotExist:
        return False
    
    # Traverse up from parent_team, ensure we never reach child_team
    current_team = parent_team
    visited = set()
    
    while current_team:
        if current_team.id == child_team_id:
            return False  # Cycle detected
        if current_team.id in visited:
            break
        visited.add(current_team.id)
        current_team = current_team.parent
    
    return True


def create_team(name, organization_id, desc=None, parent_team_id=None):
    """Create a new team."""
    try:
        organization = Organization.objects.get(id=organization_id)
    except Organization.DoesNotExist:
        raise ValidationError("Organization not found")
    
    parent_team = None
    if parent_team_id:
        try:
            parent_team = Team.objects.get(id=parent_team_id)
        except Team.DoesNotExist:
            raise ValidationError("Parent team not found")
    
    return Team.objects.create(
        name=name,
        organization=organization,
        desc=desc,
        parent=parent_team
    )


def update_team(team_id, **kwargs):
    """Update an existing team."""
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        raise ValidationError("Team not found")
    
    for key, value in kwargs.items():
        if hasattr(team, key):
            setattr(team, key, value)
    
    team.save()
    return team


def delete_team(team_id):
    """Delete a team by ID."""
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        raise ValidationError("Team not found")
    
    team.delete()
    return True


def get_child_teams(parent_team_id):
    """Get all child teams of a parent team."""
    try:
        parent_team = Team.objects.get(id=parent_team_id)
    except Team.DoesNotExist:
        return Team.objects.none()
    
    return Team.objects.filter(parent=parent_team)


def get_parent_team(child_team_id):
    """Get the parent team of a given child team."""
    try:
        child_team = Team.objects.get(id=child_team_id)
    except Team.DoesNotExist:
        return None
    
    return child_team.parent


def is_team_member(user_id, team_id):
    """Check if a user is a member of a team."""
    try:
        team = Team.objects.get(id=team_id)
        user = CustomUser.objects.get(id=user_id)
    except (Team.DoesNotExist, CustomUser.DoesNotExist):
        return False
    
    return TeamMember.objects.filter(user=user, team=team).exists()


def user_is_org_admin(user_id, organization_id):
    """Placeholder: Check if a user is an admin of the organization."""
    return False


def is_team_leader(user_id, team_id):
    """Check if a user is the leader of a team."""
    try:
        team = Team.objects.get(id=team_id)
        user = CustomUser.objects.get(id=user_id)
    except (Team.DoesNotExist, CustomUser.DoesNotExist):
        return False
    
    return TeamMember.objects.filter(
        user=user, 
        team=team, 
        role_id=TeamRole.LEADER
    ).exists()


def get_team_leader(team_id):
    """Get the leader (TeamMember) of a team."""
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        return None
    
    return TeamMember.objects.filter(team=team, role_id=TeamRole.LEADER).first()


def get_team_members(team_id):
    """Get all members (TeamMember) of a team."""
    try:
        team = Team.objects.get(id=team_id)
    except Team.DoesNotExist:
        return TeamMember.objects.none()
    
    return TeamMember.objects.filter(team=team) 