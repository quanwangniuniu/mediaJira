import api from '../api';
export interface CreateSharePreviewRequest {
  days: number;
  json_spec?: any;
}

export interface SharePreviewData {
  link: string;
  days_active: number;
  days_left: number;
}

/**
 * Create a new share preview link for an ad creative
 */
export const createSharePreview = async (
  adCreativeId: string,
  data: CreateSharePreviewRequest
): Promise<SharePreviewData> => {
  try {
    const response = await api.post<SharePreviewData>(
      `/api/facebook_meta/${adCreativeId}/share-preview/`,data
    );
    return response.data;
  } catch (error: any) {
    console.error('Error creating share preview:', error);
    throw error;
  }
};

/**
 * Get the share preview link for an ad creative
 */
export const getSharePreview = async (
  adCreativeId: string
): Promise<SharePreviewData> => {
  try {
    const response = await api.get<SharePreviewData>(
      `/api/facebook_meta/${adCreativeId}/share-preview/`
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching share preview:', error);
    throw error;
  }
};

/**
 * Delete the share preview link for an ad creative
 */
export const deleteSharePreview = async (
  adCreativeId: string
): Promise<void> => {
  try {
    await api.delete(
      `/api/facebook_meta/${adCreativeId}/share-preview/`
    );
  } catch (error: any) {
    console.error('Error deleting share preview:', error);
    throw error;
  }
};

