/**
 * Storybook mock - used via webpack alias. Same interface as real API, returns mock data.
 */
import { mockPhotos } from "./mediaSelectionMockData";

export interface PhotoData {
  id: number;
  url: string;
  caption: string;
  image_hash: string;
  isUploading?: boolean;
  uploadError?: boolean;
}

export interface PhotoListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PhotoData[];
}

export const uploadPhoto = async (
  _file: File,
  _caption?: string
): Promise<{ success: boolean }> => Promise.resolve({ success: true });

export const getPhotos = async (
  _page = 1,
  _pageSize = 12
): Promise<PhotoListResponse> =>
  Promise.resolve({
    count: mockPhotos.length,
    next: null,
    previous: null,
    results: mockPhotos as PhotoData[],
  });
