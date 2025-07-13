import axios from 'axios';
import { UserPreferences, UserPreferencesUpdate, NotificationSetting, NotificationSettingUpdate } from '../../types/preferences';

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

// localStorage storage configuration
const STORAGE_KEYS = {
  USER_PREFERENCES: 'mediajira_user_preferences',
  NOTIFICATION_SETTINGS: 'mediajira_notification_settings'
};

// Default data
const DEFAULT_USER_PREFERENCES: UserPreferences = {
  user_id: 1,
  timezone: 'Asia/Shanghai',
  language: 'zh-CN',
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  frequency: 'digest_daily'
};

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    user_id: 1,
    channel_id: 1,
    channel_name: 'Slack',
    enabled: true,
    setting_key: 'slack_notifications',
    module_scope: 'campaigns',
    is_third_party: true
  },
  {
    user_id: 1,
    channel_id: 2,
    channel_name: 'Email',
    enabled: true,
    setting_key: 'email_digest',
    module_scope: 'campaigns',
    is_third_party: false
  },
  {
    user_id: 1,
    channel_id: 3,
    channel_name: 'In-App',
    enabled: false,
    setting_key: 'in_app_alerts',
    module_scope: 'campaigns',
    is_third_party: false
  }
];

// localStorage utility functions
// TODO: Remove this entire section when switching to real API
const localStorageUtils = {
  // Get user preferences from localStorage
  getUserPreferences: (): UserPreferences => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (stored) {
        return JSON.parse(stored);
      }
      // If no stored data, initialize default data
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(DEFAULT_USER_PREFERENCES));
      console.log('[PreferencesAPI] Initialized default user preferences');
      return DEFAULT_USER_PREFERENCES;
    } catch (error) {
      console.error('[PreferencesAPI] Error reading user preferences from localStorage:', error);
      return DEFAULT_USER_PREFERENCES;
    }
  },

  // Save user preferences to localStorage
  saveUserPreferences: (preferences: UserPreferences): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
      console.log('[PreferencesAPI] User preferences saved to localStorage:', preferences);
    } catch (error) {
      console.error('[PreferencesAPI] Error saving user preferences to localStorage:', error);
    }
  },

  // Get notification settings from localStorage
  getNotificationSettings: (): NotificationSetting[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      if (stored) {
        return JSON.parse(stored);
      }
      // If no stored data, initialize default data
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(DEFAULT_NOTIFICATION_SETTINGS));
      console.log('[PreferencesAPI] Initialized default notification settings');
      return DEFAULT_NOTIFICATION_SETTINGS;
    } catch (error) {
      console.error('[PreferencesAPI] Error reading notification settings from localStorage:', error);
      return DEFAULT_NOTIFICATION_SETTINGS;
    }
  },

  // Save notification settings to localStorage
  saveNotificationSettings: (settings: NotificationSetting[]): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATION_SETTINGS, JSON.stringify(settings));
      console.log('[PreferencesAPI] Notification settings saved to localStorage:', settings);
    } catch (error) {
      console.error('[PreferencesAPI] Error saving notification settings to localStorage:', error);
    }
  },

  // Clear all stored preferences data
  clearAllPreferences: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATION_SETTINGS);
      console.log('[PreferencesAPI] All preferences cleared from localStorage');
    } catch (error) {
      console.error('[PreferencesAPI] Error clearing preferences from localStorage:', error);
    }
  }
};

export const preferencesAPI = {
  // Get user preferences
  getUserPreferences: async (): Promise<UserPreferences> => {
    try {
      console.log('[PreferencesAPI] Loading user preferences from localStorage...');
      
      // TODO: Replace with real API call when backend is ready
      // const response = await api.get('/users/me/preferences');
      // return response.data;
      
      return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
          const preferences = localStorageUtils.getUserPreferences(); // TODO: Remove this line
          console.log('[PreferencesAPI] User preferences loaded:', preferences);
          resolve(preferences);
        }, 300);
      });
    } catch (error) {
      console.error('[PreferencesAPI] Failed to fetch user preferences:', error);
      throw error;
    }
  },

  // Update user preferences
  updateUserPreferences: async (preferences: UserPreferencesUpdate): Promise<UserPreferences> => {
    try {
      console.log('[PreferencesAPI] Updating user preferences:', preferences);
      
      // TODO: Replace with real API call when backend is ready
      // const response = await api.patch('/users/me/preferences', preferences);
      // return response.data;
      
      return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
          // TODO: Remove these localStorage operations
          const currentPreferences = localStorageUtils.getUserPreferences();
          const updatedPreferences = { ...currentPreferences, ...preferences };
          
          localStorageUtils.saveUserPreferences(updatedPreferences);
          console.log('[PreferencesAPI] User preferences updated successfully:', updatedPreferences);
          resolve(updatedPreferences);
        }, 300);
      });
    } catch (error) {
      console.error('[PreferencesAPI] Failed to update user preferences:', error);
      throw error;
    }
  },

  // Get notification settings
  getNotificationSettings: async (): Promise<NotificationSetting[]> => {
    try {
      console.log('[PreferencesAPI] Loading notification settings from localStorage...');
      
      // TODO: Replace with real API call when backend is ready
      // const response = await api.get('/users/me/notifications/settings');
      // return response.data;
      
      return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
          const settings = localStorageUtils.getNotificationSettings(); // TODO: Remove this line
          console.log('[PreferencesAPI] Notification settings loaded:', settings);
          resolve(settings);
        }, 300);
      });
    } catch (error) {
      console.error('[PreferencesAPI] Failed to fetch notification settings:', error);
      throw error;
    }
  },

  // Update notification settings
  updateNotificationSettings: async (settings: NotificationSettingUpdate[]): Promise<NotificationSetting[]> => {
    try {
      console.log('[PreferencesAPI] Updating notification settings:', settings);
      
      // TODO: Replace with real API call when backend is ready
      // const response = await api.patch('/users/me/notifications/settings', settings);
      // return response.data;
      
      return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
          // TODO: Remove these localStorage operations
          const currentSettings = localStorageUtils.getNotificationSettings();
          
          // Update corresponding settings
          const updatedSettings = currentSettings.map(setting => {
            const update = settings.find(s => s.channel_id === setting.channel_id);
            return update ? { ...setting, ...update } : setting;
          });
          
          localStorageUtils.saveNotificationSettings(updatedSettings);
          console.log('[PreferencesAPI] Notification settings updated successfully:', updatedSettings);
          resolve(updatedSettings);
        }, 300);
      });
    } catch (error) {
      console.error('[PreferencesAPI] Failed to update notification settings:', error);
      throw error;
    }
  },

  // Reset all preferences to defaults
  // TODO: This function might not be needed with real API, or implement it as a server endpoint
  resetToDefaults: async (): Promise<{ preferences: UserPreferences; settings: NotificationSetting[] }> => {
    try {
      console.log('[PreferencesAPI] Resetting all preferences to defaults...');
      
      return new Promise((resolve) => {
        setTimeout(() => {
          // TODO: Remove these localStorage operations
          localStorageUtils.saveUserPreferences(DEFAULT_USER_PREFERENCES);
          localStorageUtils.saveNotificationSettings(DEFAULT_NOTIFICATION_SETTINGS);
          
          console.log('[PreferencesAPI] All preferences reset to defaults');
          resolve({
            preferences: DEFAULT_USER_PREFERENCES,
            settings: DEFAULT_NOTIFICATION_SETTINGS
          });
        }, 300);
      });
    } catch (error) {
      console.error('[PreferencesAPI] Failed to reset preferences:', error);
      throw error;
    }
  }
};

// Development tools - only available in development environment
// TODO: Remove this entire section in production or when using real API
if (process.env.NODE_ENV === 'development') {
  (window as any).preferencesDebug = {
    // View currently stored data
    viewStoredData: () => {
      console.group('Stored Preferences Data');
      console.log('User Preferences:', localStorageUtils.getUserPreferences());
      console.log('Notification Settings:', localStorageUtils.getNotificationSettings());
      console.groupEnd();
    },
    
    // Clear all data
    clearAll: () => {
      localStorageUtils.clearAllPreferences();
      console.log('All preferences data cleared');
    },
    
    // Reset to defaults
    resetToDefaults: async () => {
      await preferencesAPI.resetToDefaults();
      console.log('Preferences reset to defaults');
    },
    
    // Set test data
    setTestData: () => {
      const testPrefs = {
        ...DEFAULT_USER_PREFERENCES,
        language: 'en-US',
        timezone: 'America/New_York'
      };
      localStorageUtils.saveUserPreferences(testPrefs);
      console.log('Test data set');
    }
  };
  
  console.log('Development tools available: window.preferencesDebug');
} 