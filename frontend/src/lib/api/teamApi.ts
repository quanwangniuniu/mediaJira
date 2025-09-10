/**
 * Team API client for team-related operations
 */

import { TEAM_ROLES } from '@/lib/constants/teamRoles';
import api from '../api';

/**
 * Team API class for team-related operations
 */
export default class TeamAPI {
  /**
   * Get current user's teams
   * @returns Promise with user teams data
   */
  static async getUserTeams() {
    try {
      console.log('🔄 Fetching user teams...');
      const response = await api.get('/auth/me/teams/');
      console.log('✅ User teams loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch user teams:', error);
      throw error;
    }
  }

  /**
   * Get team members for a specific team
   * @param teamId - The team ID
   */
  static async getTeamMembers(teamId: number) {
    try {
      console.log(`🔄 Fetching team members for team ${teamId}...`);
      const response = await api.get(`/api/teams/${teamId}/members/`);
      console.log(`✅ Team members loaded:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch team members for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed team information including members
   * @param teamId - The team ID
   */
  static async getTeamDetail(teamId: number) {
    try {
      console.log(`🔄 Fetching team detail for team ${teamId}...`);
      const response = await api.get(`/api/teams/${teamId}/`);
      console.log(`✅ Team detail loaded:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to fetch team detail for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Get current user's team membership information
   * This is a helper method that finds the current user in team members
   * @param teamId - The team ID
   * @param currentUserId - The current user's ID
   */
  static async getCurrentUserMembership(
    teamId: number, 
    currentUserId: number
  ) {
    try {
      const teamMembers = await this.getTeamMembers(teamId);
      
      // Find current user in the members list
      const userMembership = teamMembers.members.find(
        (member: any) => member.user_id === currentUserId
      );
      
      if (!userMembership) {
        console.log(`👤 User ${currentUserId} is not a member of team ${teamId}`);
        return `${currentUserId} is not a member of team ${teamId}`;
      }
      
      const membership = {
        team_id: userMembership.team_id,
        team_name: teamMembers.team_name,
        role_id: userMembership.role_id,
        role_name: userMembership.role_name,
      };
      
      console.log(`✅ User membership found:`, membership);
      return membership;
    } catch (error) {
      console.error(`❌ Failed to get user membership for team ${teamId}:`, error);
      throw error;
    }
  }

  /**
   * Add a member to a team
   * @param teamId - The team ID
   * @param userId - The user ID
   * @param roleId - The role ID
   */
  static async addMemberToTeam(teamId: number, userId: number, roleId: number) {
      try {
        const response = await api.post(`/api/teams/${teamId}/members/`, {
          user_id: userId,
          role_id: roleId,
        });
        console.log(`✅ Member added to team:`, response.data);
        return response.data;
      } catch (error) {
        console.error(`❌ Failed to add member to team:`, error);
        throw error;
      }
    }

  /**
   * 
   * @param teamId - The team ID
   * @param userId - The user ID
   */
  static async removeMemberFromTeam(teamId: number, userId: number) {
    try {
      const response = await api.delete(`/api/teams/${teamId}/members/${userId}/`);
      console.log(`✅ Member removed from team:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to remove member from team:`, error);
      throw error;
    }
  }

  /**
   * Update the role of a member in a team
   * @param teamId - The team ID
   * @param userId - The user ID
   * @param roleId - The role ID
   */
  static async updateMemberRole(teamId: number, userId: number, roleId: number) {
    try {
      const response = await api.patch(`/api/teams/${teamId}/members/${userId}/`, {
        role_id: roleId,
      });
      console.log(`✅ Member role updated:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to update member role:`, error);
      throw error;
    }
  }

  }