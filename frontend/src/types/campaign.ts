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

// Campaign Task Link types
export interface CampaignTaskLink {
  id: string;
  campaign: string; // Campaign UUID
  task: number; // Task ID
  link_type?: string;
  created_at: string;
  updated_at: string;
}

// Campaign Activity Timeline types
export interface CampaignActivityTimelineItem {
  type: 'status_change' | 'check_in' | 'performance_snapshot';
  id: string;
  timestamp: string; // ISO datetime
  user: UserSummary | null;
  details: {
    // Status change
    from_status?: string;
    from_status_display?: string;
    to_status?: string;
    to_status_display?: string;
    note?: string;
    // Check-in
    sentiment?: string;
    sentiment_display?: string;
    // Performance snapshot
    milestone_type?: string;
    milestone_type_display?: string;
    spend?: string;
    metric_type?: string;
    metric_type_display?: string;
    metric_value?: string;
    percentage_change?: string;
    notes?: string;
    screenshot_url?: string;
    additional_metrics?: Record<string, any>;
  };
}

