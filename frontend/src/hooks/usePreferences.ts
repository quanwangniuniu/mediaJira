import { useState, useEffect, useMemo } from 'react';
import { preferencesAPI } from '../lib/api/preferencesApi';
import { 
  UserPreferences, 
  PreferencesFormData,
  SlackIntegration,
  SlackIntegrationCreate,
  SlackIntegrationUpdate
} from '../types/preferences';
import toast from 'react-hot-toast';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [slackIntegration, setSlackIntegration] = useState<SlackIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [slackLoading, setSlackLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true);
        const userPrefs = await preferencesAPI.getUserPreferences();
        setPreferences(userPrefs);
        // Try to load Slack integration separately
        try {
          const slack = await preferencesAPI.getSlackIntegration();
          setSlackIntegration(slack);
        } catch (error) {
          setSlackIntegration(null);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
        toast.error('Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };
    loadPreferences();
  }, []);

  const getFormData = (): PreferencesFormData | null => {
    if (!preferences) return null;
    return {
      language: preferences.language,
      timezone: preferences.timezone,
      slack_enabled: !!slackIntegration?.is_active,
      slack_integration: slackIntegration
    };
  };

  // Update preferences
  const updatePreferences = async (formData: PreferencesFormData) => {
    try {
      setSaving(true);
      const userPrefsUpdate = {
        language: formData.language ?? undefined,
        timezone: formData.timezone ?? undefined,
      };
      console.log('PATCH body:', userPrefsUpdate);
      const updatedPrefs = await preferencesAPI.updateUserPreferences(userPrefsUpdate);
      setPreferences(updatedPrefs);
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

  // Slack Integration Methods
  const addOrUpdateSlackIntegration = async (data: SlackIntegrationCreate): Promise<{ success: boolean; error?: any }> => {
    try {
      setSlackLoading(true);
      const result = await preferencesAPI.createOrUpdateSlackIntegration(data);
      setSlackIntegration(result);
      return { success: true };
    } catch (error) {
      console.error('Failed to add/update Slack integration:', error);
      return { success: false, error };
    } finally {
      setSlackLoading(false);
    }
  };

  const updateSlackIntegration = async (data: SlackIntegrationUpdate): Promise<{ success: boolean; error?: any }> => {
    if (!slackIntegration) {
      return { success: false, error: 'No Slack integration to update' };
    }
    try {
      setSlackLoading(true);
      const result = await preferencesAPI.updateSlackIntegration(data);
      setSlackIntegration(result);
      return { success: true };
    } catch (error) {
      console.error('Failed to update Slack integration:', error);
      return { success: false, error };
    } finally {
      setSlackLoading(false);
    }
  };

  const removeSlackIntegration = async (): Promise<{ success: boolean; error?: any }> => {
    if (!slackIntegration) {
      return { success: false, error: 'No Slack integration to remove' };
    }
    try {
      setSlackLoading(true);
      await preferencesAPI.deleteSlackIntegration();
      setSlackIntegration(null);
      return { success: true };
    } catch (error) {
      console.error('Failed to remove Slack integration:', error);
      return { success: false, error };
    } finally {
      setSlackLoading(false);
    }
  };

  const refreshSlackIntegration = async () => {
    try {
      const slack = await preferencesAPI.getSlackIntegration();
      setSlackIntegration(slack);
    } catch (error) {
      setSlackIntegration(null);
    }
  };

  const toggleSlackIntegration = async (): Promise<{ success: boolean; error?: any }> => {
    if (!slackIntegration) {
      return { success: false, error: 'No Slack integration to toggle' };
    }
    return await updateSlackIntegration({
      is_active: !slackIntegration.is_active
    });
  };

  const currentFormData = useMemo(() => getFormData(), [preferences, slackIntegration]);

  return {
    preferences,
    formData: currentFormData,
    loading,
    saving,
    updatePreferences,
    slackIntegration,
    slackLoading,
    addOrUpdateSlackIntegration,
    updateSlackIntegration,
    removeSlackIntegration,
    refreshSlackIntegration,
    toggleSlackIntegration,
    hasSlackIntegration: !!slackIntegration,
    isSlackActive: slackIntegration?.is_active || false
  };
};