"""
Team services using core models through compatibility layer
This maintains the existing API while using the new core models
"""

from .compatibility import (
    add_member,
    remove_member,
    assign_leader,
    change_member_role,
    user_can_manage_team,
    user_can_modify_team,
    is_same_organization,
    is_valid_team_hierarchy,
    create_team,
    update_team,
    delete_team,
    get_child_teams,
    get_parent_team,
    is_team_member,
    user_is_org_admin,
    is_team_leader,
    get_team_leader,
    get_team_members,
    TeamRole
)

# Re-export all functions for backward compatibility
__all__ = [
    'add_member',
    'remove_member', 
    'assign_leader',
    'change_member_role',
    'user_can_manage_team',
    'user_can_modify_team',
    'is_same_organization',
    'is_valid_team_hierarchy',
    'create_team',
    'update_team',
    'delete_team',
    'get_child_teams',
    'get_parent_team',
    'is_team_member',
    'user_is_org_admin',
    'is_team_leader',
    'get_team_leader',
    'get_team_members',
    'TeamRole'
]
