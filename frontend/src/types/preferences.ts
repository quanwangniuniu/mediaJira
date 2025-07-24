export interface UserPreferences {
  timezone: string | null;  
  language: string | null;  
}

export interface UserPreferencesUpdate {
  timezone?: string;
  language?: string;
}

export interface SlackIntegration {
  webhook_url: string;
  channel_name?: string | null; 
  is_active: boolean;
  created_at?: string;  
  updated_at?: string;  
}

export interface SlackIntegrationCreate {
  webhook_url: string;
  channel_name?: string;
  is_active?: boolean;  
}

export interface SlackIntegrationUpdate {
  webhook_url?: string;
  channel_name?: string;
  is_active?: boolean;
}

export interface PreferencesFormData {
  language: string | null;
  timezone: string | null;
  slack_enabled: boolean; 
  slack_integration?: SlackIntegration | null;
}

export interface LanguageOption {
  value: string;
  label: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
}