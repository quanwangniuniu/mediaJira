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

export interface ProjectMemberInvitePayload {
  email: string;
  role?: 'owner' | 'member' | 'viewer';
}

export interface OnboardingProjectPayload {
  name: string;
  description?: string | null;
  media_work_types?: string[];
  use_cases?: string[];
  role?: string;
  team_size?: string;
  invite_emails?: string[];
  project_type?: string[];
  work_model?: string[];
  advertising_platforms?: string[];
  advertising_platforms_other?: string | null;
  objectives?: string[];
  kpis?: Record<string, any>;
  budget_management_type?: string | null;
  total_monthly_budget?: number | string | null;
  pacing_enabled?: boolean;
  budget_config?: Record<string, any>;
  primary_audience_type?: string | null;
  audience_targeting?: Record<string, any>;
  target_regions?: string[];
  owner_id?: number | null;
  invite_members?: ProjectMemberInvitePayload[];
}

export interface OnboardingProjectResponse {
  project: ProjectData;
}

export interface ProjectMemberUser {
  id: number;
  username?: string;
  email?: string;
  name?: string;
}

export interface ProjectMemberData {
  id: number;
  user: ProjectMemberUser;
  project: { id: number; name: string };
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
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
  createProjectViaOnboarding: (payload: OnboardingProjectPayload): Promise<OnboardingProjectResponse | ProjectData> => {
    const mediaWorkTypeMap: Record<string, string> = {
      'Paid Social': 'paid_social',
      'Paid Search': 'paid_search',
      'Programmatic Advertising': 'programmatic',
      'Influencer / UGC Campaigns': 'influencer_ugc',
      'Cross-Channel Campaigns': 'cross_channel',
      'Performance (Direct Response)': 'performance',
      'Brand Awareness Campaigns': 'brand_campaigns',
      'App Acquisition / App Install Campaigns': 'app_acquisition',
    };

    const normalizedProjectTypes =
      payload.project_type && payload.project_type.length > 0
        ? payload.project_type
        : (payload.media_work_types || [])
            .map((label) => mediaWorkTypeMap[label] || null)
            .filter((item): item is string => Boolean(item));

    const normalizedInvites =
      payload.invite_members && payload.invite_members.length > 0
        ? payload.invite_members
        : (payload.invite_emails || []).map((email) => ({ email, role: 'member' as const }));

    const normalizedPayload: Record<string, any> = {
      name: payload.name,
      description: payload.description,
      project_type: normalizedProjectTypes,
      work_model: payload.work_model,
      advertising_platforms: payload.advertising_platforms,
      advertising_platforms_other: payload.advertising_platforms_other,
      objectives: payload.objectives,
      kpis: payload.kpis,
      budget_management_type: payload.budget_management_type,
      total_monthly_budget: payload.total_monthly_budget,
      pacing_enabled: payload.pacing_enabled,
      budget_config: payload.budget_config,
      primary_audience_type: payload.primary_audience_type,
      audience_targeting: payload.audience_targeting,
      target_regions: payload.target_regions,
      owner_id: payload.owner_id,
      invite_members: normalizedInvites,
    };

    Object.keys(normalizedPayload).forEach((key) => {
      const value = normalizedPayload[key];
      if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
      ) {
        delete normalizedPayload[key];
      }
    });

    return api
      .post<OnboardingProjectResponse | ProjectData>('/api/core/projects/onboarding/', normalizedPayload)
      .then((response) => response.data);
  },

  // Mark a project as the user's active project
  setActiveProject: (projectId: number) => {
    return api
      .post(`/api/core/projects/${projectId}/set_active/`)
      .then((response) => response.data);
  },

  // Delete a project (owner permission required)
  deleteProject: (projectId: number) => {
    return api.delete(`/api/core/projects/${projectId}/`).then((response) => response.data);
  },

  // Get members of a specific project
  getProjectMembers: (projectId: number): Promise<ProjectMemberData[]> => {
    return api
      .get(`/api/core/projects/${projectId}/members/`)
      .then((response) => {
        const data = response.data as any;
        if (Array.isArray(data)) {
          return data as ProjectMemberData[];
        }
        if (data && Array.isArray(data.results)) {
          return data.results as ProjectMemberData[];
        }
        return [];
      });
  },

  inviteProjectMember: (
    projectId: number,
    payload: ProjectMemberInvitePayload
  ): Promise<any> => {
    return api
      .post(`/api/core/projects/${projectId}/members/`, payload)
      .then((response) => response.data);
  },

  removeProjectMember: (projectId: number, memberId: number): Promise<any> => {
    return api
      .delete(`/api/core/projects/${projectId}/members/${memberId}/`)
      .then((response) => response.data);
  },
};
