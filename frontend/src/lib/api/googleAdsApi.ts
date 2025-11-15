import api from '../api';

// ========== Basic Type Definitions ==========

export type AdStatus = 'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'PAUSED';
export type AdType = 'RESPONSIVE_SEARCH_AD' | 'RESPONSIVE_DISPLAY_AD' | 'VIDEO_RESPONSIVE_AD';
export type DeviceType = 'UNSPECIFIED' | 'UNKNOWN' | 'MOBILE' | 'TABLET' | 'DESKTOP' | 'CONNECTED_TV' | 'OTHER';
export type CustomerStatus = 'ENABLED' | 'CANCELED' | 'SUSPENDED' | 'CLOSED';
export type OSType = 'UNSPECIFIED' | 'UNKNOWN' | 'IOS' | 'ANDROID';
export type MimeType = 'IMAGE_JPEG' | 'IMAGE_GIF' | 'IMAGE_PNG' | 'FLASH' | 'TEXT_HTML' | 'PDF' | 'MSWORD' | 'MSEXCEL' | 'RTF' | 'AUDIO_WAV' | 'AUDIO_MP3' | 'HTML5_AD_ZIP';
export type VideoThumbnail = 'DEFAULT_THUMBNAIL' | 'THUMBNAIL_1' | 'THUMBNAIL_2' | 'THUMBNAIL_3';
export type DisplayAdFormatSetting = 'ALL_FORMATS' | 'NON_NATIVE' | 'NATIVE';

// ========== Basic Resource Interfaces ==========

export interface AdTextAsset {
  id?: number;
  text: string;
}

export interface AdImageAsset {
  id?: number;
  asset: string;
  url?: string;
  pixel_width?: number;
  pixel_height?: number;
  file_size_bytes?: number;
}

export interface AdVideoAsset {
  id?: number;
  asset: string;
  url?: string;
  video_id?: string;
}

export interface FinalAppUrl {
  id?: number;
  os_type: OSType;
  url: string;
}

export interface CustomParameter {
  id?: number;
  key: string;
  value: string;
}

export interface UrlCollection {
  id?: number;
  url_collection_id: string;
  final_urls?: string[];
  final_mobile_urls?: string[];
  tracking_url_template?: string;
}

export interface CustomerAccount {
  id?: number;
  customer_id: string;
  descriptive_name: string;
  status: CustomerStatus;
}

// ========== Ad Type Information Interfaces ==========

export interface ResponsiveSearchAdInfo {
  id?: number;
  headlines: AdTextAsset[];
  descriptions: AdTextAsset[];
  path1?: string;
  path2?: string;
}

export interface ResponsiveDisplayAdInfo {
  id?: number;
  marketing_images?: AdImageAsset[];
  square_marketing_images?: AdImageAsset[];
  logo_images?: AdImageAsset[];
  square_logo_images?: AdImageAsset[];
  headlines: AdTextAsset[];
  long_headline: AdTextAsset;
  descriptions: AdTextAsset[];
  youtube_videos?: AdVideoAsset[];
  business_name: string;
  main_color?: string;
  accent_color?: string;
  allow_flexible_color?: boolean;
  call_to_action_text?: string;
  price_prefix?: string;
  promo_text?: string;
  format_setting?: DisplayAdFormatSetting;
  enable_asset_enhancements?: boolean;
  enable_autogen_video?: boolean;
  control_spec?: Record<string, any>;
}

export interface VideoResponsiveAdInfo {
  id?: number;
  headlines?: AdTextAsset[];
  long_headlines: AdTextAsset[];
  descriptions: AdTextAsset[];
  call_to_actions?: AdTextAsset[];
  call_to_actions_enabled?: boolean;
  videos: AdVideoAsset[];
  companion_banners?: AdImageAsset[];
  companion_banner_enabled?: boolean;
  breadcrumb1?: string;
  breadcrumb2?: string;
}

export interface ImageAdInfo {
  id?: number;
  mime_type?: MimeType;
  pixel_width?: number;
  pixel_height?: number;
  image_url?: string;
  preview_pixel_width?: number;
  preview_pixel_height?: number;
  preview_image_url?: string;
  name?: string;
  image_asset?: AdImageAsset;
  data?: string;
  ad_id_to_copy_image_from?: number;
}

export interface VideoAdInfo {
  id?: number;
  video_asset?: AdVideoAsset;
  video_asset_info?: Record<string, any>;
  format_in_stream?: {
    action_button_label?: string;
    action_headline?: string;
    companion_banner?: AdImageAsset;
  };
  format_bumper?: {
    companion_banner?: AdImageAsset;
    action_button_label?: string;
    action_headline?: string;
  };
  format_out_stream?: {
    headline?: string;
    description?: string;
  };
  format_non_skippable?: {
    companion_banner?: AdImageAsset;
    action_button_label?: string;
    action_headline?: string;
  };
  format_in_feed?: {
    headline?: string;
    description1?: string;
    description2?: string;
    thumbnail?: VideoThumbnail;
  };
}

// ========== Main Ad Interface ==========

export interface GoogleAd {
  id?: number;
  google_ads_id?: number | null;
  name?: string;
  display_url?: string;
  added_by_google_ads?: boolean;
  type?: AdType;
  device_preference?: DeviceType;
  system_managed_resource_source?: string;
  final_urls?: string[];
  final_mobile_urls?: string[];
  tracking_url_template?: string;
  final_url_suffix?: string;
  status?: AdStatus;
  created_at?: string;
  updated_at?: string;
  customer_account?: CustomerAccount;
  created_by?: string;
  media_assets?: string[];
  
  // Ad type information (Union Field - only one can be non-null)
  image_ad?: ImageAdInfo | null;
  video_ad?: VideoAdInfo | null;
  video_responsive_ad?: VideoResponsiveAdInfo | null;
  responsive_search_ad?: ResponsiveSearchAdInfo | null;
  responsive_display_ad?: ResponsiveDisplayAdInfo | null;
  
  // URL related information
  final_app_urls?: FinalAppUrl[];
  url_custom_parameters?: CustomParameter[];
  url_collections?: UrlCollection[];
}

// ========== Request Interfaces ==========

export interface AdCreateRequest {
  customer_account_id?: number;
  type: AdType;
  name?: string;
  display_url?: string;
  device_preference?: DeviceType;
  final_urls?: string[];
  final_mobile_urls?: string[];
  tracking_url_template?: string;
  final_url_suffix?: string;
  status?: AdStatus;
  created_by_id?: number | null;
  media_asset_ids?: number[];
  
  // Ad type information
  image_ad?: ImageAdInfo | null;
  video_ad?: VideoAdInfo | null;
  video_responsive_ad?: VideoResponsiveAdInfo | null;
  responsive_search_ad?: ResponsiveSearchAdInfo | null;
  responsive_display_ad?: ResponsiveDisplayAdInfo | null;
}

export interface AdUpdateRequest extends Partial<AdCreateRequest> {}

export interface AdPartialUpdateRequest extends Partial<AdCreateRequest> {}

// ========== Response Interfaces ==========

export interface AdListResponse {
  count: number;
  next?: string | null;
  previous?: string | null;
  results: GoogleAd[];
}

export interface AdResponse extends GoogleAd {}

export interface AdPreviewRequest {
  device_type: DeviceType;
}

export interface AdPreviewResponse {
  token: string;
  ad_id: number;
  device_type: DeviceType;
  preview_url: string;
  created_at: string;
  expiration_date_time: string;
}

export interface PreviewDataResponse {
  ad: GoogleAd;
  device_type: DeviceType;
  preview_data: Record<string, any>;
  created_at: string;
  expiration_date_time: string;
}

export interface ErrorResponse {
  detail: string;
  code?: string;
}

export interface ValidationError {
  detail: string;
  field_errors?: Record<string, string[]>;
  non_field_errors?: string[];
}

// ========== Query Parameter Interfaces ==========

export interface AdListParams {
  status?: AdStatus;
  type?: AdType;
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
}

export interface AdByAccountParams extends AdListParams {
  customer_id: string;
}

// ========== API Methods Class ==========

export class GoogleAdsAPI {
  // ========== Global Ad Operations ==========
  
  /**
   * Get all ads for current user
   * GET /api/google_ads/ads/
   */
  static async getAds(params?: AdListParams): Promise<AdListResponse> {
    const response = await api.get('/api/google_ads/ads/', { params });
    return response.data;
  }

  /**
   * Create a new ad
   * POST /api/google_ads/ads/
   */
  static async createAd(data: AdCreateRequest): Promise<AdResponse> {
    console.log('Creating ad with data:', data);
    console.log('API base URL:', api.defaults.baseURL);
    console.log('Request headers:', api.defaults.headers);
    
    try {
      const response = await api.post('/api/google_ads/ads/', data);
      console.log('Ad created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating ad:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        console.error('Response headers:', error.response.headers);
      }
      throw error;
    }
  }

  /**
   * Get ad details
   * GET /api/google_ads/ads/{ad_id}/
   */
  static async getAd(adId: number): Promise<AdResponse> {
    const response = await api.get(`/api/google_ads/ads/${adId}/`);
    return response.data;
  }

  /**
   * Update ad
   * PATCH /api/google_ads/ads/{ad_id}/
   */
  static async updateAd(adId: number, data: AdPartialUpdateRequest): Promise<AdResponse> {
    const response = await api.patch(`/api/google_ads/ads/${adId}/`, data);
    return response.data;
  }

  /**
   * Delete ad
   * DELETE /api/google_ads/ads/{ad_id}/
   */
  static async deleteAd(adId: number): Promise<void> {
    await api.delete(`/api/google_ads/ads/${adId}/`);
  }

  // ========== Operations by Account ==========

  /**
   * Get ads list for specified account
   * GET /api/google_ads/act_{customer_id}/ads/
   */
  static async getAdsByAccount(params: AdByAccountParams): Promise<AdListResponse> {
    const { customer_id, ...queryParams } = params;
    const response = await api.get(`/api/google_ads/act_${customer_id}/ads/`, { 
      params: queryParams 
    });
    return response.data;
  }

  /**
   * Create ad for specified account
   * POST /api/google_ads/act_{customer_id}/ads/
   */
  static async createAdByAccount(customerId: string, data: AdCreateRequest): Promise<AdResponse> {
    const response = await api.post(`/api/google_ads/act_${customerId}/ads/`, data);
    return response.data;
  }

  /**
   * Get ad details for specified account
   * GET /api/google_ads/act_{customer_id}/ads/{ad_id}/
   */
  static async getAdByAccount(customerId: string, adId: number): Promise<AdResponse> {
    const response = await api.get(`/api/google_ads/act_${customerId}/ads/${adId}/`);
    return response.data;
  }

  /**
   * Update ad for specified account
   * PUT /api/google_ads/act_{customer_id}/ads/{ad_id}/
   */
  static async updateAdByAccount(customerId: string, adId: number, data: AdUpdateRequest): Promise<AdResponse> {
    const response = await api.put(`/api/google_ads/act_${customerId}/ads/${adId}/`, data);
    return response.data;
  }

  /**
   * Partially update ad for specified account
   * PATCH /api/google_ads/act_{customer_id}/ads/{ad_id}/
   */
  static async partialUpdateAdByAccount(customerId: string, adId: number, data: AdPartialUpdateRequest): Promise<AdResponse> {
    const response = await api.patch(`/api/google_ads/act_${customerId}/ads/${adId}/`, data);
    return response.data;
  }

  /**
   * Delete ad for specified account
   * DELETE /api/google_ads/act_{customer_id}/ads/{ad_id}/
   */
  static async deleteAdByAccount(customerId: string, adId: number): Promise<void> {
    await api.delete(`/api/google_ads/act_${customerId}/ads/${adId}/`);
  }

  // ========== Global Operations (Legacy) ==========

  /**
   * Get ad globally
   * GET /api/google_ads/ads/{ad_id}/
   */
  static async getAdGlobal(adId: number): Promise<AdResponse> {
    const response = await api.get(`/api/google_ads/ads/${adId}/`);
    return response.data;
  }

  /**
   * Update ad globally
   * PATCH /api/google_ads/ads/{ad_id}/
   */
  static async updateAdGlobal(adId: number, data: AdUpdateRequest): Promise<AdResponse> {
    const response = await api.patch(`/api/google_ads/ads/${adId}/`, data);
    return response.data;
  }

  /**
   * Delete ad globally
   * DELETE /api/google_ads/{ad_id}/delete/
   */
  static async deleteAdGlobal(adId: number): Promise<void> {
    await api.delete(`/api/google_ads/${adId}/delete/`);
  }

  // ========== Preview Related Operations ==========

  /**
   * Create ad preview
   * POST /api/google_ads/{ad_id}/create_preview/
   */
  static async createPreview(adId: number, data: AdPreviewRequest): Promise<AdPreviewResponse> {
    const response = await api.post(`/api/google_ads/${adId}/create_preview/`, data);
    return response.data;
  }

  /**
   * Get preview data
   * GET /api/google_ads/preview/{token}/
   */
  static async getPreviewData(token: string): Promise<PreviewDataResponse> {
    const response = await api.get(`/api/google_ads/preview/${token}/`);
    return response.data;
  }

  // ========== Utility Methods ==========

  /**
   * Validate ad type data
   */
  static validateAdTypeData(ad: Partial<GoogleAd>): string[] {
    const errors: string[] = [];
    
    const adTypes = [
      ad.image_ad,
      ad.video_ad,
      ad.video_responsive_ad,
      ad.responsive_search_ad,
      ad.responsive_display_ad
    ];
    
    const nonEmptyTypes = adTypes.filter(type => type !== null && type !== undefined);
    
    if (nonEmptyTypes.length === 0) {
      errors.push('At least one ad type must be set');
    } else if (nonEmptyTypes.length > 1) {
      errors.push('Only one ad type can be set');
    }
    
    return errors;
  }

  /**
   * Format ad status display text
   */
  static getStatusDisplayText(status: AdStatus): string {
    const statusMap: Record<AdStatus, string> = {
      DRAFT: 'Draft',
      PENDING_REVIEW: 'Pending Review',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      PUBLISHED: 'Published',
      PAUSED: 'Paused'
    };
    return statusMap[status] || status;
  }

  /**
   * Format ad type display text
   */
  static getTypeDisplayText(type: AdType): string {
    const typeMap: Record<AdType, string> = {
      RESPONSIVE_SEARCH_AD: 'Responsive Search Ad',
      RESPONSIVE_DISPLAY_AD: 'Responsive Display Ad',
      VIDEO_RESPONSIVE_AD: 'Video Responsive Ad'
    };
    return typeMap[type] || type;
  }

  /**
   * Update ad type fields
   * PATCH /api/google_ads/ads/{ad_id}/
   */
  static async updateAdTypeFields(adId: number, data: any): Promise<AdResponse> {
    const response = await api.patch(`/api/google_ads/ads/${adId}/`, data);
    return response.data;
  }

  /**
   * Format device type display text
   */
  static getDeviceDisplayText(device: DeviceType): string {
    const deviceMap: Record<DeviceType, string> = {
      UNSPECIFIED: 'Unspecified',
      UNKNOWN: 'Unknown',
      MOBILE: 'Mobile',
      TABLET: 'Tablet',
      DESKTOP: 'Desktop',
      CONNECTED_TV: 'Connected TV',
      OTHER: 'Other'
    };
    return deviceMap[device] || device;
  }
}

// Export default instance
export default GoogleAdsAPI;