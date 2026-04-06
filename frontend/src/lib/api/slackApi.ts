import api from '../api';

export const SLACK_OAUTH_STATE_STORAGE_KEY = 'slack_oauth_state';

export interface SlackConnectionStatus {
    is_connected: boolean;
    slack_team_name?: string | null;
    slack_team_id?: string | null;
    default_channel_id?: string | null;
    default_channel_name?: string | null;
    is_active: boolean;
}

export interface SlackChannel {
    id: string;
    name: string;
    is_private: boolean;
}

// Backend representation of a preference
export interface NotificationPreference {
    id: number;
    project: number;
    event_type: 'TASK_STATUS_CHANGE' | 'DECISION_CREATED' | 'DEADLINE_REMINDER' | 'TASK_CREATED' | 'COMMENT_UPDATED';
    event_type_display: string;
    is_active: boolean;
    slack_channel_id?: string;
    slack_channel_name?: string;
}

export const slackApi = {
    // Initialize OAuth flow
    initOAuth: async (): Promise<{ url: string; state: string }> => {
        const response = await api.get('/api/slack/oauth/init/');
        return response.data;
    },

    // Handle OAuth callback
    handleCallback: async (code: string, state: string): Promise<any> => {
        const response = await api.post('/api/slack/oauth/callback/', { code, state });
        return response.data;
    },

    // Get connection status
    getStatus: async (): Promise<SlackConnectionStatus> => {
        const response = await api.get('/api/slack/status/');
        return response.data;
    },

    // Disconnect Slack
    disconnect: async (): Promise<{ success: boolean }> => {
        const response = await api.post('/api/slack/disconnect/');
        return response.data;
    },

    // Get notification preferences
    getPreferences: async (): Promise<NotificationPreference[]> => {
        const response = await api.get('/api/slack/preferences/');
        // Helper to normalize the API response.
        // Django REST Framework may return a paginated response ({ count: N, results: [...] })
        // or a flat list. This ensures we always strictly return an array.
        const data = response.data;
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.results)) return data.results;
        return [];
    },

    // Update a specific preference
    updatePreference: async (id: number, data: Partial<NotificationPreference>): Promise<NotificationPreference> => {
        const response = await api.patch(`/api/slack/preferences/${id}/`, data);
        return response.data;
    },

    // Create default preference if none exists (usually backend handles this on connection, but good to have)
    createPreference: async (data: Partial<NotificationPreference>): Promise<NotificationPreference> => {
        const response = await api.post('/api/slack/preferences/', data);
        return response.data;
    },

    // Get available Slack channels
    getChannels: async (): Promise<SlackChannel[]> => {
        const response = await api.get('/api/slack/channels/');
        return response.data;
    }
};
