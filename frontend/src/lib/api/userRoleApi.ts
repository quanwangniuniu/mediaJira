import api from '../api';
import { CreateUserRole } from '@/types/permission';

export const UserRoleAPI = {

  // Assign an existing user role to a user
  assignUserRole: (userId: number, data: CreateUserRole) => api.post(`/api/access_control/users/${userId}/roles/`, data),

  // Remove a user role from a user
  removeUserRole: (userId: number, roleId: number, teamId: number | null) => api.delete(`/api/access_control/users/${userId}/roles/${roleId}/`, { 
    params: { team_id: teamId === null ? '' : teamId } 
  }),
};