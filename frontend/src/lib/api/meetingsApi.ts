import api from '../api';
import type {
  Meeting,
  MeetingCreateRequest,
  MeetingUpdateRequest,
  MeetingPartialUpdateRequest,
  AgendaItem,
  AgendaItemCreateRequest,
  AgendaItemUpdateRequest,
  AgendaItemPartialUpdateRequest,
  AgendaItemsReorderRequest,
  ParticipantLink,
  ParticipantLinkCreateRequest,
  ParticipantLinkPartialUpdateRequest,
  ArtifactLink,
  ArtifactLinkCreateRequest,
  MeetingDocument,
  MeetingActionItem,
  MeetingActionItemCreateRequest,
  MeetingActionItemPatchRequest,
  ConvertActionItemToTaskRequest,
  BulkConvertActionItemsRequest,
} from '@/types/meeting';

const basePath = (projectId: number) => `/api/projects/${projectId}/meetings`;

type MeetingTemplate = {
  id: string;
  name: string;
  layout_config: unknown;
};

export const MeetingsAPI = {
  async listMeetings(projectId: number): Promise<Meeting[]> {
    const response = await api.get(`${basePath(projectId)}/`);
    const data = response.data as any;
    if (Array.isArray(data)) return data as Meeting[];
    if (data && Array.isArray(data.results)) return data.results as Meeting[];
    return [];
  },

  async createMeeting(projectId: number, payload: MeetingCreateRequest): Promise<Meeting> {
    const response = await api.post<Meeting>(`${basePath(projectId)}/`, payload);
    return response.data;
  },

  async getMeeting(projectId: number, meetingId: number): Promise<Meeting> {
    const response = await api.get<Meeting>(`${basePath(projectId)}/${meetingId}/`);
    return response.data;
  },

  async updateMeeting(
    projectId: number,
    meetingId: number,
    payload: MeetingUpdateRequest,
  ): Promise<Meeting> {
    const response = await api.put<Meeting>(`${basePath(projectId)}/${meetingId}/`, payload);
    return response.data;
  },

  async patchMeeting(
    projectId: number,
    meetingId: number,
    payload: MeetingPartialUpdateRequest,
  ): Promise<Meeting> {
    const response = await api.patch<Meeting>(`${basePath(projectId)}/${meetingId}/`, payload);
    return response.data;
  },

  async deleteMeeting(projectId: number, meetingId: number): Promise<void> {
    await api.delete(`${basePath(projectId)}/${meetingId}/`);
  },

  async listAgendaItems(
    projectId: number,
    meetingId: number,
  ): Promise<AgendaItem[]> {
    const response = await api.get(
      `${basePath(projectId)}/${meetingId}/agenda-items/`,
    );
    const data = response.data as any;
    if (Array.isArray(data)) return data as AgendaItem[];
    if (data && Array.isArray(data.results)) return data.results as AgendaItem[];
    return [];
  },

  async createAgendaItem(
    projectId: number,
    meetingId: number,
    payload: AgendaItemCreateRequest,
  ): Promise<AgendaItem> {
    const response = await api.post<AgendaItem>(
      `${basePath(projectId)}/${meetingId}/agenda-items/`,
      payload,
    );
    return response.data;
  },

  async updateAgendaItem(
    projectId: number,
    meetingId: number,
    agendaItemId: number,
    payload: AgendaItemUpdateRequest,
  ): Promise<AgendaItem> {
    const response = await api.put<AgendaItem>(
      `${basePath(projectId)}/${meetingId}/agenda-items/${agendaItemId}/`,
      payload,
    );
    return response.data;
  },

  async patchAgendaItem(
    projectId: number,
    meetingId: number,
    agendaItemId: number,
    payload: AgendaItemPartialUpdateRequest,
  ): Promise<AgendaItem> {
    const response = await api.patch<AgendaItem>(
      `${basePath(projectId)}/${meetingId}/agenda-items/${agendaItemId}/`,
      payload,
    );
    return response.data;
  },

  async deleteAgendaItem(
    projectId: number,
    meetingId: number,
    agendaItemId: number,
  ): Promise<void> {
    await api.delete(
      `${basePath(projectId)}/${meetingId}/agenda-items/${agendaItemId}/`,
    );
  },

  async reorderAgendaItems(
    projectId: number,
    meetingId: number,
    payload: AgendaItemsReorderRequest,
  ): Promise<AgendaItem[]> {
    const response = await api.patch<AgendaItem[]>(
      `${basePath(projectId)}/${meetingId}/agenda-items/reorder/`,
      payload,
    );
    return response.data;
  },

  async listParticipants(
    projectId: number,
    meetingId: number,
  ): Promise<ParticipantLink[]> {
    const response = await api.get(
      `${basePath(projectId)}/${meetingId}/participants/`,
    );
    const data = response.data as any;
    if (Array.isArray(data)) return data as ParticipantLink[];
    if (data && Array.isArray(data.results)) return data.results as ParticipantLink[];
    return [];
  },

  async addParticipant(
    projectId: number,
    meetingId: number,
    payload: ParticipantLinkCreateRequest,
  ): Promise<ParticipantLink> {
    const response = await api.post<ParticipantLink>(
      `${basePath(projectId)}/${meetingId}/participants/`,
      payload,
    );
    return response.data;
  },

  async patchParticipant(
    projectId: number,
    meetingId: number,
    participantLinkId: number,
    payload: ParticipantLinkPartialUpdateRequest,
  ): Promise<ParticipantLink> {
    const response = await api.patch<ParticipantLink>(
      `${basePath(projectId)}/${meetingId}/participants/${participantLinkId}/`,
      payload,
    );
    return response.data;
  },

  async removeParticipant(
    projectId: number,
    meetingId: number,
    participantLinkId: number,
  ): Promise<void> {
    await api.delete(
      `${basePath(projectId)}/${meetingId}/participants/${participantLinkId}/`,
    );
  },

  async listArtifacts(
    projectId: number,
    meetingId: number,
  ): Promise<ArtifactLink[]> {
    const response = await api.get(
      `${basePath(projectId)}/${meetingId}/artifacts/`,
    );
    const data = response.data as any;
    if (Array.isArray(data)) return data as ArtifactLink[];
    if (data && Array.isArray(data.results)) return data.results as ArtifactLink[];
    return [];
  },

  async addArtifact(
    projectId: number,
    meetingId: number,
    payload: ArtifactLinkCreateRequest,
  ): Promise<ArtifactLink> {
    const response = await api.post<ArtifactLink>(
      `${basePath(projectId)}/${meetingId}/artifacts/`,
      payload,
    );
    return response.data;
  },

  async removeArtifact(
    projectId: number,
    meetingId: number,
    artifactLinkId: number,
  ): Promise<void> {
    await api.delete(
      `${basePath(projectId)}/${meetingId}/artifacts/${artifactLinkId}/`,
    );
  },

  async saveTemplateLayout(templateId: string, layout_config: unknown): Promise<void> {
    await api.patch(`/api/meetings/templates/${templateId}/`, { layout_config });
  },

  async createMeetingTemplate(payload: { name: string; layout_config: unknown }): Promise<MeetingTemplate> {
    const response = await api.post<MeetingTemplate>(`/api/meetings/templates/`, payload);
    return response.data;
  },

  async listMeetingTemplates(): Promise<MeetingTemplate[]> {
    const response = await api.get(`/api/meetings/templates/`);
    const data = response.data as any;
    if (Array.isArray(data)) return data as MeetingTemplate[];
    if (data && Array.isArray(data.results)) return data.results as MeetingTemplate[];
    return [];
  },

  async deleteMeetingTemplate(templateId: string): Promise<void> {
    await api.delete(`/api/meetings/templates/${templateId}/`);
  },

  async saveMeetingLayout(projectId: number, meetingId: number, layout_config: unknown): Promise<void> {
    await api.patch(`${basePath(projectId)}/${meetingId}/`, { layout_config });
  },

  async getMeetingDocument(projectId: number, meetingId: number): Promise<MeetingDocument> {
    const response = await api.get<MeetingDocument>(`${basePath(projectId)}/${meetingId}/document/`);
    return response.data;
  },

  async saveMeetingDocument(
    projectId: number,
    meetingId: number,
    payload: { content: string; yjs_state?: string },
  ): Promise<MeetingDocument> {
    const response = await api.patch<MeetingDocument>(`${basePath(projectId)}/${meetingId}/document/`, payload);
    return response.data;
  },

  async listActionItems(projectId: number, meetingId: number): Promise<MeetingActionItem[]> {
    const response = await api.get(`${basePath(projectId)}/${meetingId}/action-items/`);
    const data = response.data as any;
    if (Array.isArray(data)) return data as MeetingActionItem[];
    if (data && Array.isArray(data.results)) return data.results as MeetingActionItem[];
    return [];
  },

  async createActionItem(
    projectId: number,
    meetingId: number,
    payload: MeetingActionItemCreateRequest,
  ): Promise<MeetingActionItem> {
    const response = await api.post<MeetingActionItem>(`${basePath(projectId)}/${meetingId}/action-items/`, payload);
    return response.data;
  },

  async patchActionItem(
    projectId: number,
    meetingId: number,
    actionItemId: number,
    payload: MeetingActionItemPatchRequest,
  ): Promise<MeetingActionItem> {
    const response = await api.patch<MeetingActionItem>(
      `${basePath(projectId)}/${meetingId}/action-items/${actionItemId}/`,
      payload,
    );
    return response.data;
  },

  async deleteActionItem(projectId: number, meetingId: number, actionItemId: number): Promise<void> {
    await api.delete(`${basePath(projectId)}/${meetingId}/action-items/${actionItemId}/`);
  },

  async convertActionItemToTask(
    projectId: number,
    meetingId: number,
    actionItemId: number,
    payload: ConvertActionItemToTaskRequest,
  ): Promise<any> {
    const response = await api.post(
      `${basePath(projectId)}/${meetingId}/action-items/${actionItemId}/convert-to-task/`,
      payload,
    );
    return response.data;
  },

  async bulkConvertActionItemsToTasks(
    projectId: number,
    meetingId: number,
    payload: BulkConvertActionItemsRequest,
  ): Promise<{ created: Array<{ action_item_id: number; task: any }>; skipped: Array<{ action_item_id: number; reason: string }> }> {
    const response = await api.post(
      `${basePath(projectId)}/${meetingId}/action-items/bulk-convert-to-tasks/`,
      payload,
    );
    return response.data;
  },

  async listMeetingTasks(projectId: number, meetingId: number): Promise<any[]> {
    const response = await api.get(`${basePath(projectId)}/${meetingId}/tasks/`);
    const data = response.data as any;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  },
};
