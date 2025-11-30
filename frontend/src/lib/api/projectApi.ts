import api from '../api';

export interface ProjectData {
  id: number;
  name: string;
  organization_id?: number;
}

export interface CheckProjectMembershipResponse {
  has_project: boolean;
  active_project_id: number | null;
  project_count: number;
  active_project?: ProjectData | null;
  projects?: ProjectData[];
  // Legacy support for has_membership
  has_membership?: boolean;
}

export const ProjectAPI = {
  // Get all projects (filtered by user's organization on backend)
  getProjects: (): Promise<ProjectData[]> => {
    return api
      .get<ProjectData[]>('/api/core/projects/')
      .then((response) => response.data);
  },

  // Check project membership and active project for current user
  checkProjectMembership: (): Promise<CheckProjectMembershipResponse> => {
    return api
      .get<CheckProjectMembershipResponse>('/api/core/check-project-membership/')
      .then((response) => response.data);
  },

  // Submit full project onboarding payload
  onboardProject: (payload: any): Promise<ProjectData> => {
    return api
      .post<ProjectData>('/api/core/projects/onboarding/', payload)
      .then((response) => response.data);
  },

  // Set active project
  setActiveProject: (projectId: number): Promise<void> => {
    return api
      .post(`/api/core/projects/${projectId}/set-active/`, {})
      .then(() => undefined);
  },

  // Project members endpoints (for team & collaboration step)
  getMembers: (projectId: number): Promise<any[]> => {
    return api
      .get<any[]>(`/api/core/projects/${projectId}/members/`)
      .then((response) => response.data);
  },

  addMember: (projectId: number, payload: any): Promise<any> => {
    return api
      .post<any>(`/api/core/projects/${projectId}/members/`, payload)
      .then((response) => response.data);
  },

  // KPI suggestions based on objectives and other context
  getKpiSuggestions: (params: {
    objectives: string[];
    project_type?: string;
    work_model?: string;
  }): Promise<any> => {
    return api
      .get('/api/core/kpi-suggestions/', {
        params: {
          objectives: params.objectives.join(','),
          project_type: params.project_type,
          work_model: params.work_model,
        },
      })
      .then((response) => response.data);
  },
};

