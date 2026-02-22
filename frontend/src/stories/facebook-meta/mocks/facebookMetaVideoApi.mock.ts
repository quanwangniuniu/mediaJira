/**
 * Storybook mock - used via webpack alias. Same interface as real API, returns mock data.
 */
import { mockVideos } from "./mediaSelectionMockData";

export interface VideoData {
  id: number;
  url: string;
  title: string;
  message: string;
  video_id: string;
  isUploading?: boolean;
  uploadError?: boolean;
}

export interface VideoListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: VideoData[];
}

export const uploadVideo = async (
  _file: File,
  _title?: string,
  _message?: string
): Promise<{ success: boolean }> => Promise.resolve({ success: true });

export const getVideos = async (
  _page = 1,
  _pageSize = 12
): Promise<VideoListResponse> =>
  Promise.resolve({
    count: mockVideos.length,
    next: null,
    previous: null,
    results: mockVideos as VideoData[],
  });
