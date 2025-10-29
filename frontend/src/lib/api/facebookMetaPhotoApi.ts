import api from '../api';

export interface PhotoData {
  id: number
  url: string;
  caption: string;
  image_hash: string;
  isUploading?: boolean;  // Flag for loading state
  uploadError?: boolean;  // Flag for error state
}

export interface PhotoListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PhotoData[];
}

/**
 * Upload a photo file
 */
export const uploadPhoto = async (file: File, caption?: string): Promise<{ success: boolean }> => {
  const formData = new FormData();
  formData.append('file', file);
  if (caption) {
    formData.append('caption', caption);
  }

  const response = await api.post<{ success: boolean }>(
    '/api/facebook_meta/photos/upload/',
    formData
  );

  return response.data;
};

/**
 * Get list of uploaded photos
 */
export const getPhotos = async (page = 1, pageSize = 12): Promise<PhotoListResponse> => {
  const response = await api.get<PhotoListResponse>(
    '/api/facebook_meta/photos/',
    {
      params: {
        page,
        page_size: pageSize,
      },
    }
  );

  return response.data;
};

