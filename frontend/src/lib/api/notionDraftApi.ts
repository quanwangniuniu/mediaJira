import api from '../api';
import {
  DraftDetail,
  DraftPayload,
  DraftSummary,
  NotionContentBlockRecord,
} from '@/types/notion';

const BASE_PATH = '/api/notion/api';

const toQuery = (path: string) => `${BASE_PATH}${path}`;

export const NotionDraftAPI = {
  listDrafts: async (): Promise<DraftSummary[]> => {
    const response = await api.get<any>(toQuery('/drafts/'));
    // Handle paginated response (Django REST Framework default)
    if (response.data && Array.isArray(response.data.results)) {
      return response.data.results;
    }
    // Handle direct array response
    if (Array.isArray(response.data)) {
      return response.data;
    }
    // Fallback to empty array
    return [];
  },

  getDraft: async (draftId: number): Promise<DraftDetail> => {
    const response = await api.get<DraftDetail>(toQuery(`/drafts/${draftId}/`));
    return response.data;
  },

  createDraft: async (payload: DraftPayload): Promise<DraftDetail> => {
    const response = await api.post<DraftDetail>(toQuery('/drafts/'), payload);
    return response.data;
  },

  updateDraft: async (draftId: number, payload: DraftPayload): Promise<DraftDetail> => {
    const response = await api.put<DraftDetail>(toQuery(`/drafts/${draftId}/`), payload);
    return response.data;
  },

  deleteDraft: async (draftId: number): Promise<void> => {
    await api.delete(toQuery(`/drafts/${draftId}/`));
  },

  addBlock: async (draftId: number, block: NotionContentBlockRecord) => {
    const response = await api.post(toQuery(`/drafts/${draftId}/add_block/`), block);
    return response.data;
  },

  updateBlock: async (
    draftId: number,
    blockId: string,
    block: NotionContentBlockRecord
  ) => {
    const response = await api.put(toQuery(`/drafts/${draftId}/update_block/`), {
      block_id: blockId,
      block_data: block,
    });
    return response.data;
  },

  deleteBlock: async (draftId: number, blockId: string) => {
    const response = await api.delete(toQuery(`/drafts/${draftId}/delete_block/`), {
      data: { block_id: blockId },
    });
    return response.data;
  },

  duplicateDraft: async (draftId: number, title?: string): Promise<DraftDetail> => {
    const response = await api.post<DraftDetail>(
      toQuery(`/drafts/${draftId}/duplicate/`),
      title ? { title } : undefined
    );
    return response.data;
  },

  exportDraft: async (draftId: number) => {
    const response = await api.get(
      toQuery(`/drafts/${draftId}/export/`),
      { responseType: 'blob' }
    );
    return response.data;
  },

  listRevisions: async (draftId: number) => {
    const response = await api.get(toQuery(`/drafts/${draftId}/revisions/`));
    return response.data;
  },
};

