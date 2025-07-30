from .models import Team, TeamMember, Organization
from .constants import TeamRole
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction


def add_member(team_id, user_id, role_id=TeamRole.MEMBER):
    """Add a user to a team with a specific role."""
    if not TeamRole.is_valid_role(role_id):
        raise ValidationError("Invalid role_id")
    if TeamMember.objects.filter(team_id=team_id, user_id=user_id).exists():
        raise ValidationError("User is already a member of this team")
    return TeamMember.objects.create(team_id=team_id, user_id=user_id, role_id=role_id)


def remove_member(team_id, user_id):
    """Remove a user from a team."""
    membership = TeamMember.objects.filter(team_id=team_id, user_id=user_id).first()
    if not membership:
        raise ValidationError("User is not a member of this team")
    membership.delete()
    return True


def assign_leader(team_id, user_id):
    """Assign a user as the team leader. Only one leader per team."""
    with transaction.atomic():
        # Remove existing leader
        TeamMember.objects.filter(team_id=team_id, role_id=TeamRole.LEADER).update(role_id=TeamRole.MEMBER)
        # Assign new leader
        membership = TeamMember.objects.filter(team_id=team_id, user_id=user_id).first()
        if not membership:
            membership = TeamMember.objects.create(team_id=team_id, user_id=user_id, role_id=TeamRole.LEADER)
        else:
            membership.role_id = TeamRole.LEADER
            membership.save()
        return membership


def change_member_role(team_id, user_id, new_role_id):
    """Change a team member's role."""
    if not TeamRole.is_valid_role(new_role_id):
        raise ValidationError("Invalid role_id")
    membership = TeamMember.objects.filter(team_id=team_id, user_id=user_id).first()
    if not membership:
        raise ValidationError("User is not a member of this team")
    membership.role_id = new_role_id
    membership.save()
    return membership


def user_can_manage_team(user_id, team_id):
    """Check if the user is the leader of the team (can manage members)."""
    return TeamMember.objects.filter(team_id=team_id, user_id=user_id, role_id=TeamRole.LEADER).exists()


def user_can_modify_team(user_id, team_id):
    """Check if the user can modify the team (LEADER or ADMIN)."""
    # For now, only LEADER can manage; extend if ADMIN role is added
    return TeamMember.objects.filter(team_id=team_id, user_id=user_id, role_id=TeamRole.LEADER).exists()


def is_same_organization(user_id, team_id):
    """Check if the user and the team belong to the same organization."""
    team = Team.objects.filter(id=team_id).first()
    if not team:
        return False
    # Find all teams the user is a member of, get their orgs
    user_team_ids = TeamMember.objects.filter(user_id=user_id).values_list('team_id', flat=True)
    user_org_ids = Team.objects.filter(id__in=user_team_ids).values_list('organization_id', flat=True)
    return team.organization_id in user_org_ids


def is_valid_team_hierarchy(parent_team_id, child_team_id):
    """Check if assigning child_team_id under parent_team_id would create a cycle."""
    # Traverse up from parent_team_id, ensure we never reach child_team_id
    current_id = parent_team_id
    visited = set()
    while current_id:
        if current_id == child_team_id:
            return False  # Cycle detected
        if current_id in visited:
            break
        visited.add(current_id)
        parent = Team.objects.filter(id=current_id).first()
        if parent:
            current_id = parent.parent_team_id
        else:
            break
    return True


def create_team(name, organization_id, desc=None, parent_team_id=None):
    """Create a new team."""
    return Team.objects.create(
        name=name,
        organization_id=organization_id,
        desc=desc,
        parent_team_id=parent_team_id
    )

def update_team(team_id, **kwargs):
    """Update an existing team."""
    team = Team.objects.filter(id=team_id).first()
    if not team:
        raise ValidationError("Team not found")
    for key, value in kwargs.items():
        setattr(team, key, value)
    team.save()
    return team

def delete_team(team_id):
    """Delete a team by ID."""
    team = Team.objects.filter(id=team_id).first()
    if not team:
        raise ValidationError("Team not found")
    team.delete()
    return True


def get_child_teams(parent_team_id):
    """Get all child teams of a parent team."""
    return Team.objects.filter(parent_team_id=parent_team_id)

def get_parent_team(child_team_id):
    """Get the parent team of a given child team."""
    child = Team.objects.filter(id=child_team_id).first()
    if child and child.parent_team_id:
        return Team.objects.filter(id=child.parent_team_id).first()
    return None

def is_team_member(user_id, team_id):
    """Check if a user is a member of a team."""
    return TeamMember.objects.filter(user_id=user_id, team_id=team_id).exists()

def user_is_org_admin(user_id, organization_id):
    """Placeholder: Check if a user is an admin of the organization. Always returns False for now."""
    return False


def is_team_leader(user_id, team_id):
    """Check if a user is the leader of a team."""
    return TeamMember.objects.filter(user_id=user_id, team_id=team_id, role_id=TeamRole.LEADER).exists()

def get_team_leader(team_id):
    """Get the leader (TeamMember) of a team."""
    return TeamMember.objects.filter(team_id=team_id, role_id=TeamRole.LEADER).first()


def get_team_members(team_id):
    """Get all members (TeamMember) of a team."""
    return TeamMember.objects.filter(team_id=team_id)
