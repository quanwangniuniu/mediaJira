// Link Preview API client
import api from '../api';
import type { LinkPreview } from '@/types/chat';

// Cache for link previews to avoid redundant API calls
const linkPreviewCache = new Map<string, LinkPreview | null>();

/**
 * Extract URLs from text content
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Fetch link preview data for a URL
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
  // Check cache first
  if (linkPreviewCache.has(url)) {
    return linkPreviewCache.get(url) || null;
  }

  try {
    const response = await api.post<LinkPreview>('/api/chat/link-preview/', { url });
    const preview = response.data;
    
    // Cache the result
    linkPreviewCache.set(url, preview);
    
    return preview;
  } catch (error) {
    console.error('Failed to fetch link preview:', error);
    // Cache null to avoid retrying failed URLs
    linkPreviewCache.set(url, null);
    return null;
  }
}

/**
 * Clear the link preview cache
 */
export function clearLinkPreviewCache(): void {
  linkPreviewCache.clear();
}

/**
 * Check if a URL is likely to have a preview
 */
export function isPreviewableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Exclude common non-previewable URLs
    const excludedPatterns = [
      /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i,
      /\.(mp4|webm|avi|mov)$/i,
      /\.(pdf|doc|docx|xls|xlsx)$/i,
      /\.(zip|rar|7z|tar|gz)$/i,
    ];
    
    return !excludedPatterns.some(pattern => pattern.test(parsed.pathname));
  } catch {
    return false;
  }
}

export default {
  extractUrls,
  fetchLinkPreview,
  clearLinkPreviewCache,
  isPreviewableUrl,
};

