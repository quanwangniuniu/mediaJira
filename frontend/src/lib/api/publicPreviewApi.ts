import api from '@/lib/api';
// Ad Creative interface (matching backend serializer structure)
export interface AdCreativeData {
  id: string;
  name: string;
  object_story_spec: any;
  degrees_of_freedom_spec: any;
  object_type: string;
  status: string;
  url_tags: string;
  days_left?: number; // Days remaining until preview expires
  [key: string]: any; // Allow other fields from serializer
}

/**
 * Get public ad creative data by preview token (no authentication required)
 */
export const getPublicPreview = async (token: string): Promise<AdCreativeData> => {
  try {
    const response = await api.get<AdCreativeData>(
      `/api/facebook_meta/preview/${token}/public/`
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching public preview:', error);
    throw error;
  }
};

