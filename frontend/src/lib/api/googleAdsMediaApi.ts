import api from '../api';

// type definitions
export interface GoogleAdsPhotoData {
  id: number;
  url: string;
  caption?: string;
  image_hash?: string;
  uploaded?: boolean;
}

export interface GoogleAdsVideoData {
  id: number;
  title: string;
  video_id: string;
  image_url?: string;
  message?: string;
  duration?: string;
}

// upload photo
export async function uploadGoogleAdsPhoto(file: File, caption?: string): Promise<{ success: boolean; photo?: GoogleAdsPhotoData }> {
  const formData = new FormData();
  formData.append('file', file);
  if (caption) formData.append('caption', caption);
  
  const response = await api.post('/api/google_ads/photos/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

// get photo list
export async function getGoogleAdsPhotos(): Promise<GoogleAdsPhotoData[]> {
  const response = await api.get('/api/google_ads/photos/');
  return response.data.results || [];
}

// create video record
export async function createGoogleAdsVideo(youtubeUrl: string, message?: string): Promise<{ success: boolean; video?: GoogleAdsVideoData }> {
  const response = await api.post('/api/google_ads/videos/create/', { 
    url: youtubeUrl,
    message: message || ''
  });
  return response.data;
}

// get video list
export async function getGoogleAdsVideos(): Promise<GoogleAdsVideoData[]> {
  const response = await api.get('/api/google_ads/videos/');
  return response.data.results || [];
}
