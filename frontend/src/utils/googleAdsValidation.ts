import { GoogleAd, ResponsiveSearchAdInfo, ResponsiveDisplayAdInfo, VideoResponsiveAdInfo } from '@/lib/api/googleAdsApi';

export interface CompletenessResult {
  is_complete: boolean;
  missing_fields: string[];
}

/**
 * check ResponsiveSearchAdInfo completeness
 */
export function checkResponsiveSearchAdCompleteness(
  searchAdInfo: ResponsiveSearchAdInfo | null | undefined
): CompletenessResult {
  const missing_fields: string[] = [];

  if (!searchAdInfo) {
    return { is_complete: false, missing_fields: ['responsive_search_ad'] };
  }

  // check headlines: at least 3
  const headlineCount = searchAdInfo.headlines?.length || 0;
  if (headlineCount < 3) {
    missing_fields.push('headlines (at least 3)');
  }

  // check descriptions: at least 2
  const descriptionCount = searchAdInfo.descriptions?.length || 0;
  if (descriptionCount < 2) {
    missing_fields.push('descriptions (at least 2)');
  }

  return {
    is_complete: missing_fields.length === 0,
    missing_fields
  };
}

/**
 * check ResponsiveDisplayAdInfo completeness
 */
export function checkResponsiveDisplayAdCompleteness(
  displayAdInfo: ResponsiveDisplayAdInfo | null | undefined
): CompletenessResult {
  const missing_fields: string[] = [];

  if (!displayAdInfo) {
    return { is_complete: false, missing_fields: ['responsive_display_ad'] };
  }

  // check long_headline (required)
  if (!displayAdInfo.long_headline) {
    missing_fields.push('long_headline');
  }

  // check business_name (required)
  if (!displayAdInfo.business_name || displayAdInfo.business_name.trim() === '') {
    missing_fields.push('business_name');
  }

  // check headlines: at least 1
  const headlineCount = displayAdInfo.headlines?.length || 0;
  if (headlineCount < 1) {
    missing_fields.push('headlines (at least 1)');
  }

  // check descriptions: at least 1
  const descriptionCount = displayAdInfo.descriptions?.length || 0;
  if (descriptionCount < 1) {
    missing_fields.push('descriptions (at least 1)');
  }

  // check marketing_images: at least 1 landscape image
  const marketingImageCount = displayAdInfo.marketing_images?.length || 0;
  if (marketingImageCount < 1) {
    missing_fields.push('marketing_images (at least 1 landscape image)');
  }

  // check square_marketing_images: at least 1 square image
  const squareImageCount = displayAdInfo.square_marketing_images?.length || 0;
  if (squareImageCount < 1) {
    missing_fields.push('square_marketing_images (at least 1 square image)');
  }

  return {
    is_complete: missing_fields.length === 0,
    missing_fields
  };
}

/**
 * check VideoResponsiveAdInfo completeness
 */
export function checkVideoResponsiveAdCompleteness(
  videoAdInfo: VideoResponsiveAdInfo | null | undefined
): CompletenessResult {
  const missing_fields: string[] = [];

  if (!videoAdInfo) {
    return { is_complete: false, missing_fields: ['video_responsive_ad'] };
  }

  // check videos: at least 1
  const videoCount = videoAdInfo.videos?.length || 0;
  if (videoCount < 1) {
    missing_fields.push('videos (at least 1)');
  }

  // check long_headlines: at least 1
  const longHeadlineCount = videoAdInfo.long_headlines?.length || 0;
  if (longHeadlineCount < 1) {
    missing_fields.push('long_headlines (at least 1)');
  }

  // check descriptions: at least 1
  const descriptionCount = videoAdInfo.descriptions?.length || 0;
  if (descriptionCount < 1) {
    missing_fields.push('descriptions (at least 1)');
  }

  return {
    is_complete: missing_fields.length === 0,
    missing_fields
  };
}

/**
 * unified entry function, check completeness based on ad type
 */
export function checkAdCompleteness(ad: GoogleAd): CompletenessResult {
  if (!ad.type) {
    return { is_complete: false, missing_fields: ['ad_type'] };
  }

  switch (ad.type) {
    case 'RESPONSIVE_SEARCH_AD':
      return checkResponsiveSearchAdCompleteness(ad.responsive_search_ad);
    case 'RESPONSIVE_DISPLAY_AD':
      return checkResponsiveDisplayAdCompleteness(ad.responsive_display_ad);
    case 'VIDEO_RESPONSIVE_AD':
      return checkVideoResponsiveAdCompleteness(ad.video_responsive_ad);
    default:
      return { is_complete: false, missing_fields: ['unsupported_ad_type'] };
  }
}

/**
 * get ad completeness percentage with weighted scoring
 */
export function getAdCompletenessPercentage(ad: GoogleAd): number {
  // calculate completeness percentage based on ad type with weighted scoring
  // Don't use checkAdCompleteness result for percentage calculation
  // as it returns 100 when complete, which prevents showing partial progress
  switch (ad.type) {
    case 'RESPONSIVE_SEARCH_AD':
      const searchAdInfo = ad.responsive_search_ad;
      if (!searchAdInfo) return 0;
      
      let searchScore = 0;
      
      // Headlines (weight: 40%)
      const headlineCount = searchAdInfo.headlines?.filter(h => h?.text && h.text.trim() !== '').length || 0;
      // Only count if there are 3 or more headlines
      if (headlineCount >= 3) {
        searchScore += 40;
      } else if (headlineCount > 0) {
        // Partial score for 1-2 headlines
        searchScore += (headlineCount / 3) * 40;
      }
      
      // Descriptions (weight: 40%)
      const descriptionCount = searchAdInfo.descriptions?.filter(d => d?.text && d.text.trim() !== '').length || 0;
      // Only count if there are 2 or more descriptions
      if (descriptionCount >= 2) {
        searchScore += 40;
      } else if (descriptionCount > 0) {
        // Partial score for 1 description
        searchScore += (descriptionCount / 2) * 40;
      }
      
      // Optional fields (weight: 20%) - path1 or path2
      if ((searchAdInfo.path1 && searchAdInfo.path1.trim() !== '') || (searchAdInfo.path2 && searchAdInfo.path2.trim() !== '')) {
        searchScore += 20;
      }
      
      return Math.round(searchScore);
      
    case 'RESPONSIVE_DISPLAY_AD':
      const displayAdInfo = ad.responsive_display_ad;
      if (!displayAdInfo) return 0;
      
      let displayScore = 0;
      
      // Marketing Images (weight: 25%) - at least 1 landscape + 1 square
      const marketingImageCount = displayAdInfo.marketing_images?.length || 0;
      const squareImageCount = displayAdInfo.square_marketing_images?.length || 0;
      if (marketingImageCount >= 1 && squareImageCount >= 1) {
        displayScore += 25;
      }
      
      // Long Headline (weight: 20%) - required
      if (displayAdInfo.long_headline && displayAdInfo.long_headline.text && displayAdInfo.long_headline.text.trim() !== '') {
        displayScore += 20;
      }
      
      // Headlines (weight: 20%) - at least 1 non-empty
      const displayHeadlineCount = displayAdInfo.headlines?.filter(h => h?.text && h.text.trim() !== '').length || 0;
      if (displayHeadlineCount >= 1) {
        displayScore += 20;
      }
      
      // Descriptions (weight: 20%) - at least 1 non-empty
      const displayDescriptionCount = displayAdInfo.descriptions?.filter(d => d?.text && d.text.trim() !== '').length || 0;
      if (displayDescriptionCount >= 1) {
        displayScore += 20;
      }
      
      // Business Name (weight: 15%) - required
      if (displayAdInfo.business_name && displayAdInfo.business_name.trim() !== '') {
        displayScore += 15;
      }
      
      return displayScore;
      
    case 'VIDEO_RESPONSIVE_AD':
      const videoAdInfo = ad.video_responsive_ad;
      if (!videoAdInfo) return 0;
      
      let videoScore = 0;
      
      // Videos (weight: 50%) - at least 1
      const videoCount = videoAdInfo.videos?.length || 0;
      if (videoCount >= 1) {
        videoScore += 50;
      }
      
      // Long Headlines (weight: 25%) - at least 1 non-empty
      const longHeadlineCount = videoAdInfo.long_headlines?.filter(h => h?.text && h.text.trim() !== '').length || 0;
      if (longHeadlineCount >= 1) {
        videoScore += 25;
      }
      
      // Descriptions (weight: 25%) - at least 1 non-empty
      const videoDescriptionCount = videoAdInfo.descriptions?.filter(d => d?.text && d.text.trim() !== '').length || 0;
      if (videoDescriptionCount >= 1) {
        videoScore += 25;
      }
      
      return videoScore;
      
    default:
      return 0;
  }
}
