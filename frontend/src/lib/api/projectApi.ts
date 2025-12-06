import api from '../api';

export interface ProjectOrganization {
  id: number;
  name: string;
  slug?: string;
}

export interface ProjectOwner {
  id: number;
  username?: string;
  email?: string;
  name?: string;
}

export interface ProjectData {
  id: number;
  name: string;
  description?: string | null;
  organization_id?: number;  // Included for completeness, can be removed if never used
  organization?: ProjectOrganization;
  owner?: ProjectOwner | null;
  project_type?: string[];
  work_model?: string[];
  advertising_platforms?: string[];
  objectives?: string[];
  kpis?: Record<string, any>;
  target_kpi_value?: string | null;
  budget_management_type?: string | null;
  total_monthly_budget?: number | string | null;
  pacing_enabled?: boolean;
  budget_config?: Record<string, any>;
  primary_audience_type?: string | null;
  audience_targeting?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  member_count?: number;
  status?: string; // Optional status field for future backend support
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

const normalizeProjectsResponse = (data: any): ProjectData[] => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

export const ProjectAPI = {
  // Get all projects (filtered by user's organization on backend)
  getProjects: (options?: { activeOnly?: boolean }): Promise<ProjectData[]> => {
    const params = options?.activeOnly ? { active_only: true } : undefined;

    // Note: api instance has baseURL: '' (empty), so full path is needed
    // This matches pattern from taskApi.ts and budgetApi.ts
    // axios.get returns { data: ... }, so we return response.data which is the array
    return api
      .get<ProjectData[]>('/api/core/projects/', { params })
      .then((response) => normalizeProjectsResponse(response.data));
  },

  // Create the first project through onboarding
  createProjectViaOnboarding: (
    payload: OnboardingProjectPayload
  ): Promise<OnboardingProjectResponse | ProjectData> => {
    return api
      .post<OnboardingProjectResponse | ProjectData>('/api/core/projects/onboarding/', payload)
      .then((response) => response.data);
  },

  // Mark a project as the user's active project
  setActiveProject: (projectId: number) => {
    return api
      .post(`/api/core/projects/${projectId}/set_active/`)
      .then((response) => response.data);
  },
};
