import axios from 'axios';

// Create a separate axios instance for public preview (no auth headers)
const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
});

// Backend response structure for preview endpoint
export interface GoogleAdPublicPreviewResponse {
  ad?: {
    id?: number;
    name?: string;
    type?: string;
    status?: string;
  };
  device_type?: string;
  preview_data?: {
    device_type?: string;
    ad_id?: number;
    ad_name?: string;
    ad_type?: string;
    status?: string;
    display_url?: string;
    final_urls?: string[];
    final_mobile_urls?: string[];
    tracking_url_template?: string;
    final_url_suffix?: string;
    device_preference?: string;
    created_at?: string;
    updated_at?: string;
    ad_type_data?: {
      responsive_display_ad?: {
        business_name?: string;
        main_color?: string;
        accent_color?: string;
        allow_flexible_color?: boolean;
        call_to_action_text?: string;
        price_prefix?: string;
        promo_text?: string;
        format_setting?: string;
        enable_asset_enhancements?: boolean;
        enable_autogen_video?: boolean;
        headlines?: string[];
        long_headline?: string;
        descriptions?: string[];
        marketing_images?: string[];
        square_marketing_images?: string[];
        logo_images?: string[];
        square_logo_images?: string[];
        youtube_videos?: string[];
        control_spec?: any;
      };
      responsive_search_ad?: {
        headlines?: string[];
        descriptions?: string[];
        path1?: string;
        path2?: string;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
  created_at?: string;
  expiration_date_time?: string;
}

/**
 * Get public Google Ads preview data by share token (no authentication required)
 */
export const getPublicGoogleAdsPreview = async (token: string): Promise<GoogleAdPublicPreviewResponse> => {
  try {
    // URL encode the token to handle special characters
    const encodedToken = encodeURIComponent(token);
    const response = await publicApi.get<GoogleAdPublicPreviewResponse>(
      `/api/google_ads/preview/${encodedToken}/`
    );
    return response.data;
  } catch (error: any) {
    console.error('Error fetching public Google Ads preview:', error);
    throw error;
  }
};

