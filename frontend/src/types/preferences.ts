export interface UserPreferences {
  user_id: number;
  timezone: string;
  language: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  frequency: 'immediate' | 'digest_daily' | 'digest_weekly';
}

export interface UserPreferencesUpdate {
  timezone?: string;
  language?: string;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  frequency?: 'immediate' | 'digest_daily' | 'digest_weekly';
}

export interface NotificationSetting {
  user_id: number;
  channel_id: number;
  channel_name: string;
  enabled: boolean;
  setting_key: string;
  module_scope: string;
  is_third_party: boolean;
}

export interface NotificationSettingUpdate {
  channel_id: number;
  enabled: boolean;
  setting_key: string;
  module_scope: string;
  is_third_party: boolean;
}

export interface PreferencesFormData {
  language: string;
  timezone: string;
  slack_enabled: boolean;
  email_digest_enabled: boolean;
  in_app_alert_enabled: boolean;
  frequency: 'immediate' | 'digest_daily' | 'digest_weekly';
}

export interface LanguageOption {
  value: string;
  label: string;
}

export interface TimezoneOption {
  value: string;
  label: string;
} 