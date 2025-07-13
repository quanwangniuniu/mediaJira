import { useState, useEffect, useMemo } from 'react';
import { preferencesAPI } from '../lib/api/preferencesApi';
import { 
  UserPreferences, 
  NotificationSetting, 
  PreferencesFormData,
  NotificationSettingUpdate 
} from '../types/preferences';
import toast from 'react-hot-toast';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const [userPrefs, notifications] = await Promise.all([
          preferencesAPI.getUserPreferences(),
          preferencesAPI.getNotificationSettings()
        ]);
        
        setPreferences(userPrefs);
        setNotificationSettings(notifications);
      } catch (error) {
        console.error('Failed to load preferences:', error);
        toast.error('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Convert preferences and notification settings to form data
  const getFormData = (): PreferencesFormData | null => {
    if (!preferences) return null;

    const slackSetting = notificationSettings.find(s => s.channel_name === 'Slack');
    const emailSetting = notificationSettings.find(s => s.channel_name === 'Email');
    const inAppSetting = notificationSettings.find(s => s.channel_name === 'In-App');

    return {
      language: preferences.language,
      timezone: preferences.timezone,
      slack_enabled: slackSetting?.enabled || false,
      email_digest_enabled: emailSetting?.enabled || false,
      in_app_alert_enabled: inAppSetting?.enabled || false,
      frequency: preferences.frequency
    };
  };

  // Update preferences
  const updatePreferences = async (formData: PreferencesFormData) => {
    try {
      setSaving(true);

      // Prepare user preferences update
      const userPrefsUpdate = {
        language: formData.language,
        timezone: formData.timezone,
        frequency: formData.frequency
      };

      // Prepare notification settings update
      const notificationUpdates: NotificationSettingUpdate[] = [];
      
      const slackSetting = notificationSettings.find(s => s.channel_name === 'Slack');
      const emailSetting = notificationSettings.find(s => s.channel_name === 'Email');
      const inAppSetting = notificationSettings.find(s => s.channel_name === 'In-App');

      if (slackSetting) {
        notificationUpdates.push({
          channel_id: slackSetting.channel_id,
          enabled: formData.slack_enabled,
          setting_key: slackSetting.setting_key,
          module_scope: slackSetting.module_scope,
          is_third_party: slackSetting.is_third_party
        });
      }

      if (emailSetting) {
        notificationUpdates.push({
          channel_id: emailSetting.channel_id,
          enabled: formData.email_digest_enabled,
          setting_key: emailSetting.setting_key,
          module_scope: emailSetting.module_scope,
          is_third_party: emailSetting.is_third_party
        });
      }

      if (inAppSetting) {
        notificationUpdates.push({
          channel_id: inAppSetting.channel_id,
          enabled: formData.in_app_alert_enabled,
          setting_key: inAppSetting.setting_key,
          module_scope: inAppSetting.module_scope,
          is_third_party: inAppSetting.is_third_party
        });
      }

      // Update both preferences and notification settings
      const [updatedPrefs, updatedNotifications] = await Promise.all([
        preferencesAPI.updateUserPreferences(userPrefsUpdate),
        preferencesAPI.updateNotificationSettings(notificationUpdates)
      ]);

      setPreferences(updatedPrefs);
      setNotificationSettings(updatedNotifications);
      
      toast.success('Settings updated successfully!');
      return { success: true };
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast.error('Failed to update settings');
      return { success: false, error };
    } finally {
      setSaving(false);
    }
  };

  // Get current form data with memoization
  const currentFormData = useMemo(() => getFormData(), [preferences, notificationSettings]);

  return {
    preferences,
    notificationSettings,
    formData: currentFormData,
    loading,
    saving,
    updatePreferences
  };
}; 