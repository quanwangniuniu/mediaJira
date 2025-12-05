import api from '../api';

export interface ProjectData {
  id: number;
  name: string;
  organization_id: number;  // Included for completeness, can be removed if never used
}

export interface OnboardingProjectPayload {
  name: string;
  media_work_types: string[];
  use_cases: string[];
  role: string;
  team_size: string;
  invite_emails: string[];
}

export interface OnboardingProjectResponse {
  project: ProjectData;
}

export const ProjectAPI = {
  // Get all projects (filtered by user's organization on backend)
  getProjects: (): Promise<ProjectData[]> => {
    // Note: api instance has baseURL: '' (empty), so full path is needed
    // This matches pattern from taskApi.ts and budgetApi.ts
    // axios.get returns { data: ... }, so we return response.data which is the array
    return api.get<ProjectData[]>('/api/core/projects/').then(response => response.data);
  },

  // Create the first project through onboarding
  createProjectViaOnboarding: (
    payload: OnboardingProjectPayload
  ): Promise<OnboardingProjectResponse | ProjectData> => {
    return api
      .post<OnboardingProjectResponse | ProjectData>('/api/core/projects/onboarding/', payload)
      .then((response) => response.data);
  },
};
