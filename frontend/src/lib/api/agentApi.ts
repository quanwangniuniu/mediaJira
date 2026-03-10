import api from '../api';
import {
  AgentSession,
  AgentSessionDetail,
  CreateSessionRequest,
  AgentChatRequest,
  AgentSpreadsheet,
  SSEEvent,
} from '@/types/agent';

export const AgentAPI = {
  // ==================== Session CRUD ====================

  listSessions: async (): Promise<AgentSession[]> => {
    const response = await api.get<AgentSession[]>('/api/agent/sessions/');
    return response.data;
  },

  createSession: async (data: CreateSessionRequest): Promise<AgentSession> => {
    const response = await api.post<AgentSession>('/api/agent/sessions/', data);
    return response.data;
  },

  getSession: async (sessionId: number): Promise<AgentSessionDetail> => {
    const response = await api.get<AgentSessionDetail>(
      `/api/agent/sessions/${sessionId}/`
    );
    return response.data;
  },

  deleteSession: async (sessionId: number): Promise<void> => {
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

    // Build auth headers matching the shared axios instance
    const authStorage = typeof window !== 'undefined'
      ? localStorage.getItem('auth-storage')
      : null;
    let token: string | null = null;
    let organizationToken: string | null = null;

    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token ?? null;
        organizationToken = parsed.state?.organizationAccessToken ?? null;
      } catch {
        // ignore parse errors
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (organizationToken) headers['X-Organization-Token'] = organizationToken;

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

  uploadCSV: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/agent/data/upload/', formData);
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
