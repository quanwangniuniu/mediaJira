// Campaign enums
export type CampaignStatus = 'PLANNING' | 'TESTING' | 'SCALING' | 'OPTIMIZING' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type CampaignObjective = 'AWARENESS' | 'CONSIDERATION' | 'CONVERSION' | 'RETENTION' | 'ENGAGEMENT' | 'TRAFFIC' | 'LEAD_GENERATION' | 'APP_PROMOTION';
export type CampaignPlatform = 'META' | 'GOOGLE_ADS' | 'TIKTOK' | 'LINKEDIN' | 'SNAPCHAT' | 'TWITTER' | 'PINTEREST' | 'REDDIT' | 'PROGRAMMATIC' | 'EMAIL';

// User and Project summaries (reuse from task types if available)
export interface UserSummary {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
}

export interface ProjectSummary {
  id: number;
  name: string;
}

// Campaign data types
export interface CampaignData {
  id: string;
  name: string;
  objective: CampaignObjective;
  platforms: CampaignPlatform[];
  hypothesis?: string;
  tags?: string[];
  start_date: string;
  end_date?: string;
  actual_completion_date?: string;
  owner: UserSummary;
  owner_id?: number;
  creator?: UserSummary;
  assignee?: UserSummary;
  assignee_id?: number;
  project: ProjectSummary;
  project_id?: number;
  budget_estimate?: number;
  status: CampaignStatus;
  status_note?: string;
  latest_performance_summary?: Record<string, any>;
  created_at: string;
  updated_at: string;
  is_deleted?: boolean;
}

export interface CreateCampaignData {
  name: string;
  objective: CampaignObjective;
  platforms: CampaignPlatform[];
  start_date: string;
  end_date?: string;
  owner_id: number; // User ID (integer)
  project_id: number; // Project ID (integer)
  hypothesis?: string;
  tags?: string[];
  budget_estimate?: number;
}

export interface UpdateCampaignData {
  name?: string;
  objective?: CampaignObjective;
  platforms?: CampaignPlatform[];
  end_date?: string;
  hypothesis?: string;
  tags?: string[];
  budget_estimate?: number;
  status_note?: string;
  assignee_id?: number;
}

