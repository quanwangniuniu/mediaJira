import api from '../api';

export interface VideoData {
  id: number;
  url: string;
  title: string;
  message: string;
  video_id: string;
  isUploading?: boolean;  // Flag for loading state
  uploadError?: boolean;  // Flag for error state
}

export interface VideoListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: VideoData[];
}

/**
 * Upload a video file
 */
export const uploadVideo = async (file: File, title?: string, message?: string): Promise<{ success: boolean }> => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) {
    formData.append('title', title);
  }
  if (message) {
    formData.append('message', message);
  }

  const response = await api.post<{ success: boolean }>(
    '/api/facebook_meta/videos/upload/',
    formData
  );

  return response.data;
};

/**
 * Get list of uploaded videos
 */
export const getVideos = async (page = 1, pageSize = 12): Promise<VideoListResponse> => {
  const response = await api.get<VideoListResponse>(
    '/api/facebook_meta/videos/',
    {
      params: {
        page,
        page_size: pageSize,
      },
    }
  );

  return response.data;
};

