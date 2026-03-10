import api from '../api';
import {
  AgentSession,
  AgentSessionDetail,
  CreateSessionRequest,
  UpdateSessionRequest,
  AgentChatRequest,
  AgentSpreadsheet,
  SSEEvent,
} from '@/types/agent';

/** Build auth headers for SSE fetch requests (mirrors Axios interceptor logic). */
function getSSEAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const authStorage = typeof window !== 'undefined'
    ? localStorage.getItem('auth-storage')
    : null;
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      const token = parsed.state?.token;
      const orgToken = parsed.state?.organizationAccessToken;
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (orgToken) headers['X-Organization-Token'] = orgToken;
    } catch {
      // ignore parse errors
    }
  }
  return headers;
}

export const AgentAPI = {
  // ==================== Session CRUD ====================

  listSessions: async (): Promise<AgentSession[]> => {
    const response = await api.get('/api/agent/sessions/');
    const data = response.data;
    return Array.isArray(data) ? data : (data.results || []);
  },

  createSession: async (data: CreateSessionRequest): Promise<AgentSession> => {
    const response = await api.post<AgentSession>('/api/agent/sessions/', data);
    return response.data;
  },

  getSession: async (sessionId: string | number): Promise<AgentSessionDetail> => {
    const response = await api.get<AgentSessionDetail>(
      `/api/agent/sessions/${sessionId}/`
    );
    return response.data;
  },

  updateSession: async (sessionId: string | number, data: UpdateSessionRequest): Promise<AgentSession> => {
    const response = await api.patch<AgentSession>(
      `/api/agent/sessions/${sessionId}/`,
      data
    );
    return response.data;
  },

  deleteSession: async (sessionId: string | number): Promise<void> => {
    await api.delete(`/api/agent/sessions/${sessionId}/`);
  },

  // ==================== Chat (SSE Streaming) ====================

  sendMessage: (
    sessionId: number | string,
    data: AgentChatRequest,
    onEvent: (event: SSEEvent) => void,
    onError?: (error: Error) => void,
    onDone?: () => void
  ): AbortController => {
    const controller = new AbortController();

    const headers: Record<string, string> = {
      ...getSSEAuthHeaders(),
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };

    // Determine base URL (match axios instance config)
    const baseURL =
      (typeof process !== 'undefined' &&
        process.env?.NEXT_PUBLIC_API_URL?.trim()) ||
      '';

    fetch(`${baseURL}/api/agent/sessions/${sessionId}/chat/`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Agent chat failed (${response.status}): ${errText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue; // skip empty/comment

            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const event: SSEEvent = JSON.parse(jsonStr);
                onEvent(event);
                if (event.type === 'done') {
                  onDone?.();
                  return;
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }

        // Stream ended without 'done' event
        onDone?.();
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        onError?.(err);
      });

    return controller;
  },

  // ==================== Spreadsheet List ====================

  listSpreadsheets: async (): Promise<AgentSpreadsheet[]> => {
    const response = await api.get<AgentSpreadsheet[]>(
      '/api/agent/spreadsheets/'
    );
    return response.data;
  },

  // ==================== Data Reports (CSV) ====================

  fetchReports: async () => {
    const response = await api.get('/api/agent/data/reports/');
    return response.data;
  },

  fetchReportData: async (fileId: string) => {
    const response = await api.get(`/api/agent/data/reports/${fileId}/`);
    return response.data;
  },

  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/agent/data/upload/', formData, {
      timeout: 60000, // 60s for file upload
    });
    return response.data;
  },

  /** @deprecated Use uploadFile instead */
  uploadCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/agent/data/upload/', formData, {
      timeout: 60000,
    });
    return response.data;
  },

  /**
   * Upload a file and stream back analysis results via SSE.
   * Returns an AbortController to cancel the request.
   */
  uploadAndAnalyze: (
    file: File,
    sessionId: string | null,
    onEvent: (event: SSEEvent) => void,
    onError?: (error: Error) => void,
    onDone?: () => void
  ): AbortController => {
    const controller = new AbortController();

    const headers: Record<string, string> = {
      ...getSSEAuthHeaders(),
      'Accept': 'text/event-stream',
    };

    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('session_id', sessionId);

    const baseURL =
      (typeof process !== 'undefined' &&
        process.env?.NEXT_PUBLIC_API_URL?.trim()) ||
      '';

    fetch(`${baseURL}/api/agent/upload-analyze/`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Upload-analyze failed (${response.status}): ${errText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue;

            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const event: SSEEvent = JSON.parse(jsonStr);
                onEvent(event);
                if (event.type === 'done') {
                  onDone?.();
                  return;
                }
              } catch {
                // skip malformed JSON
              }
            }
          }
        }

        onDone?.();
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        onError?.(err);
      });

    return controller;
  },

  fetchReportsSummary: async () => {
    const response = await api.get('/api/agent/data/reports/summary/');
    return response.data;
  },

  deleteReport: async (fileId: string): Promise<void> => {
    await api.delete(`/api/agent/data/reports/${fileId}/`);
  },

  fetchDecisionStats: async () => {
    const response = await api.get('/api/agent/decisions/stats/');
    return response.data;
  },

  fetchRecentDecisions: async () => {
    const response = await api.get('/api/agent/decisions/recent/');
    return response.data;
  },
};
