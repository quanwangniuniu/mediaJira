import axios from 'axios';
import { 
  UserPreferences, 
  UserPreferencesUpdate, 
  SlackIntegration,
  SlackIntegrationCreate,
  SlackIntegrationUpdate
} from '../../types/preferences';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const preferencesAPI = {
  // Get user preferences
  getUserPreferences: async (): Promise<UserPreferences> => {
    try {
      console.log('[PreferencesAPI] Loading user preferences from backend...');
      const response = await api.get('/users/me/preferences/');
      console.log('[PreferencesAPI] User preferences loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('[PreferencesAPI] Failed to fetch user preferences:', error);
      throw error;
    }
  },

  // Update user preferences
  updateUserPreferences: async (preferences: UserPreferencesUpdate): Promise<UserPreferences> => {
    try {
      console.log('[PreferencesAPI] Updating user preferences:', preferences);
      const response = await api.patch('/users/me/preferences/', preferences);
      console.log('[PreferencesAPI] User preferences updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('[PreferencesAPI] Failed to update user preferences:', error);
      throw error;
    }
  },

  // Slack Integration API methods
  
  // Get Slack integration
  getSlackIntegration: async (): Promise<SlackIntegration> => {
    try {
      console.log('[PreferencesAPI] Loading Slack integration...');
      const response = await api.get('/users/me/notifications/slack/');
      console.log('[PreferencesAPI] Slack integration loaded:', response.data);
      return response.data;
    } catch (error) {
      console.error('[PreferencesAPI] Failed to fetch Slack integration:', error);
      throw error;
    }
  },

  // Create or update Slack integration
  createOrUpdateSlackIntegration: async (data: SlackIntegrationCreate): Promise<SlackIntegration> => {
    try {
      console.log('[PreferencesAPI] Creating/updating Slack integration:', data);
      const response = await api.post('/users/me/notifications/slack/', data);
      console.log('[PreferencesAPI] Slack integration created/updated:', response.data);
      
      if (response.data.integration) {
        return response.data.integration;
      }

      return response.data;
    } catch (error) {
      console.error('[PreferencesAPI] Failed to create/update Slack integration:', error);
      throw error;
    }
  },

  // Update Slack integration
  updateSlackIntegration: async (data: SlackIntegrationUpdate): Promise<SlackIntegration> => {
    try {
      console.log('[PreferencesAPI] Updating Slack integration:', data);
      const response = await api.post('/users/me/notifications/slack/', data);
      console.log('[PreferencesAPI] Slack integration updated:', response.data);
      
      if (response.data.integration) {
        return response.data.integration;
      }
      return response.data;
    } catch (error) {
      console.error('[PreferencesAPI] Failed to update Slack integration:', error);
      throw error;
    }
  },

  // Delete Slack integration
  deleteSlackIntegration: async (): Promise<void> => {
    try {
      console.log('[PreferencesAPI] Deleting Slack integration...');
      await api.delete('/users/me/notifications/slack/');
      console.log('[PreferencesAPI] Slack integration deleted successfully');
    } catch (error) {
      console.error('[PreferencesAPI] Failed to delete Slack integration:', error);
      throw error;
    }
  },

  // Validate Slack webhook URL format
  validateSlackWebhookUrl: (url: string): boolean => {
    const slackWebhookPattern = /^https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+$/;
    return slackWebhookPattern.test(url);
  }
};