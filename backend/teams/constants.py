# campaigns/team_api/constants.py
"""
Team role constants for team member management
"""

class TeamRole:
    """Team-level role constants"""
    LEADER = 2
    MEMBER = 3
    
    CHOICES = [
        (LEADER, 'Team Leader'),
        (MEMBER, 'Member'),
    ]
    
    @classmethod
    def get_role_name(cls, role_id):
        """Get role name by ID"""
        role_map = dict(cls.CHOICES)
        return role_map.get(role_id, 'Unknown')
    
    @classmethod
    def is_valid_role(cls, role_id):
        """Check if role ID is valid"""
        return role_id in [cls.LEADER, cls.MEMBER]
    
    @classmethod
    def can_manage_team(cls, role_id):
        """Check if role can manage team members"""
        return role_id == cls.LEADER