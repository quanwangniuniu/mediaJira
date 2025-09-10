/**
 * Team Role Constants
 * 
 * These constants match the backend TeamRole class in core/models.py
 * The values represent role levels/priorities: LEADER (2) > MEMBER (3)
 */

export const TEAM_ROLES = {
  LEADER: 2,
  MEMBER: 3,
} as const;

export type TeamRoleValue = typeof TEAM_ROLES[keyof typeof TEAM_ROLES];

/**
 * Get role name by role ID
 * @param roleId - The role ID
 * @returns The role name or 'Unknown' if not found
 */
export const getTeamRoleName = (roleId: number): string => {
  const roleMap: Record<number, string> = {
    [TEAM_ROLES.LEADER]: 'Team Leader',
    [TEAM_ROLES.MEMBER]: 'Member',
  };
  return roleMap[roleId] || 'Unknown';
};

/**
 * Check if a role ID is valid
 * @param roleId - The role ID to validate
 * @returns True if the role ID is valid
 */
export const isValidTeamRole = (roleId: number): boolean => {
  return Object.values(TEAM_ROLES).includes(roleId as TeamRoleValue);
};

