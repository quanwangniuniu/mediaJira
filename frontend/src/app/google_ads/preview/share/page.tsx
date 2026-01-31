'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { GoogleAd } from '@/lib/api/googleAdsApi';
import { getPublicGoogleAdsPreview, GoogleAdPublicPreviewResponse } from '@/lib/api/googleAdsPublicPreviewApi';
import PreviewModal from '@/components/google_ads/preview/PreviewModal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { decodeSharePayload } from '@/components/google_ads/preview/share-utils';

type SurfaceType = 'ALL' | 'DISPLAY' | 'GMAIL' | 'YOUTUBE';
type DeviceType = 'MOBILE' | 'DESKTOP';

interface Variant {
  id: string;
  locked?: boolean;
  kind: 'LANDSCAPE' | 'SQUARE';
  variantKey?: string;
  surface?: 'DISPLAY' | 'GMAIL' | 'YOUTUBE';
}

const mapTextAssets = (items?: string[]): { text: string }[] => (items || []).map((text) => ({ text }));

const mapVideoAssets = (items?: any[]): any[] =>
  (items || []).map((item) => {
    if (!item) return { asset: '' };
    if (typeof item === 'string') return { asset: item };
    const assetObj: any = {
      asset: item.asset || item.id || item.reference_id || '',
    };
    if (item.url) assetObj.url = item.url;
    if (item.video_id) assetObj.video_id = item.video_id;
    if (item.image_url) assetObj.image_url = item.image_url;
    if (item.preview_image_url) assetObj.preview_image_url = item.preview_image_url;
    if (item.thumbnail_url) assetObj.thumbnail_url = item.thumbnail_url;
    if (item.still_url) assetObj.still_url = item.still_url;
    if (item.asset_metadata || item.metadata) assetObj.asset_metadata = item.asset_metadata || item.metadata;
    return assetObj;
  });

const mapImageAssets = (items?: any[]): any[] =>
  (items || []).map((item) => {
    if (!item) return { asset: '' };
    if (typeof item === 'string') return { asset: item };
    const assetObj: any = {
      asset: item.asset || item.id || item.reference_id || '',
    };
    if (item.url) assetObj.url = item.url;
    if (item.asset_metadata || item.metadata) assetObj.asset_metadata = item.asset_metadata || item.metadata;
    return assetObj;
  });

export default function SharePreviewPage() {
  const searchParams = useSearchParams();
  const [ad, setAd] = useState<GoogleAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [surface, setSurface] = useState<SurfaceType>('ALL');
  const [device, setDevice] = useState<DeviceType>('MOBILE');
  const [expired, setExpired] = useState(false);
  const [shareGenerationDate, setShareGenerationDate] = useState<Date | null>(null);
  const [shareExpirationDays, setShareExpirationDays] = useState<number | null>(null);
  const [shareType, setShareType] = useState<'DISPLAY' | 'SEARCH' | 'VIDEO'>('DISPLAY');

  useEffect(() => {
    const loadSharePreview = async () => {
      try {
        const shareParam = searchParams.get('share');
        if (!shareParam) {
          setError('Invalid share link');
          setLoading(false);
          return;
        }

        // Decode payload to get surface, device, and expiration info
        const payload = decodeSharePayload(shareParam);
        if (!payload) {
          setError('Invalid share token');
          setLoading(false);
          return;
        }

        const previewToken = payload.previewToken || shareParam;
        if (!previewToken) {
          setError('Invalid preview token');
          setLoading(false);
          return;
        }

        if (payload.surface) {
          setSurface(payload.surface);
        }
        if (payload.device) {
          setDevice(payload.device);
        }

        const expirationTimestamp = payload.previewExpiresAt ?? payload.exp;
        if (expirationTimestamp) {
          const now = Date.now();
          if (now > expirationTimestamp) {
            setExpired(true);
            setError('This shared link has expired');
            setLoading(false);
            return;
          } else {
            const daysRemaining = Math.ceil((expirationTimestamp - now) / (1000 * 60 * 60 * 24));
            setShareExpirationDays(daysRemaining);
            if (payload.created) {
              setShareGenerationDate(new Date(payload.created));
            }
          }
        }

        // Use public preview API (no authentication required) - pass token directly
        const response = await getPublicGoogleAdsPreview(previewToken);
        console.log('[SharePreview] raw response:', response);
        
        // Transform backend response to match GoogleAd interface
        // Backend returns: { ad: {...}, preview_data: { ad_type_data: { responsive_display_ad/responsive_search_ad: {...} } } }
        // Frontend expects: GoogleAd with responsive_display_ad/responsive_search_ad at top level
        const videoResponsiveData = response.preview_data?.ad_type_data?.video_responsive_ad;
        const legacyVideoData = response.preview_data?.ad_type_data?.video_ad;

        const transformedAd: GoogleAd = {
          id: response.ad?.id,
          name: response.ad?.name,
          type: response.ad?.type as any,
          status: response.ad?.status as any,
          display_url: response.preview_data?.display_url,
          final_urls: response.preview_data?.final_urls,
          final_mobile_urls: response.preview_data?.final_mobile_urls,
          tracking_url_template: response.preview_data?.tracking_url_template,
          final_url_suffix: response.preview_data?.final_url_suffix,
          device_preference: response.preview_data?.device_preference as any,
          created_at: response.preview_data?.created_at,
          updated_at: response.preview_data?.updated_at,
          // Transform responsive_display_ad from preview_data.ad_type_data
          responsive_display_ad: response.preview_data?.ad_type_data?.responsive_display_ad ? {
            business_name: response.preview_data.ad_type_data.responsive_display_ad.business_name ?? '',
            main_color: response.preview_data.ad_type_data.responsive_display_ad.main_color,
            accent_color: response.preview_data.ad_type_data.responsive_display_ad.accent_color,
            allow_flexible_color: response.preview_data.ad_type_data.responsive_display_ad.allow_flexible_color,
            call_to_action_text: response.preview_data.ad_type_data.responsive_display_ad.call_to_action_text,
            price_prefix: response.preview_data.ad_type_data.responsive_display_ad.price_prefix,
            promo_text: response.preview_data.ad_type_data.responsive_display_ad.promo_text,
            format_setting: response.preview_data.ad_type_data.responsive_display_ad.format_setting as any,
            enable_asset_enhancements: response.preview_data.ad_type_data.responsive_display_ad.enable_asset_enhancements,
            enable_autogen_video: response.preview_data.ad_type_data.responsive_display_ad.enable_autogen_video,
            headlines: (response.preview_data.ad_type_data.responsive_display_ad.headlines || []).map((text: string) => ({ text })),
            long_headline: response.preview_data.ad_type_data.responsive_display_ad.long_headline ? { text: response.preview_data.ad_type_data.responsive_display_ad.long_headline } : { text: '' },
            descriptions: (response.preview_data.ad_type_data.responsive_display_ad.descriptions || []).map((text: string) => ({ text })),
            marketing_images: (response.preview_data.ad_type_data.responsive_display_ad.marketing_images || []).map((asset: string) => ({ asset })),
            square_marketing_images: (response.preview_data.ad_type_data.responsive_display_ad.square_marketing_images || []).map((asset: string) => ({ asset })),
            logo_images: (response.preview_data.ad_type_data.responsive_display_ad.logo_images || []).map((asset: string) => ({ asset })),
            square_logo_images: (response.preview_data.ad_type_data.responsive_display_ad.square_logo_images || []).map((asset: string) => ({ asset })),
            youtube_videos: (response.preview_data.ad_type_data.responsive_display_ad.youtube_videos || []).map((asset: string) => ({ asset })),
            control_spec: response.preview_data.ad_type_data.responsive_display_ad.control_spec,
          } : undefined,
          // Transform responsive_search_ad from preview_data.ad_type_data
          responsive_search_ad: response.preview_data?.ad_type_data?.responsive_search_ad ? {
            headlines: (response.preview_data.ad_type_data.responsive_search_ad.headlines || []).map((text: string) => ({ text })),
            descriptions: (response.preview_data.ad_type_data.responsive_search_ad.descriptions || []).map((text: string) => ({ text })),
            path1: response.preview_data.ad_type_data.responsive_search_ad.path1,
            path2: response.preview_data.ad_type_data.responsive_search_ad.path2,
          } : undefined,
          video_responsive_ad: videoResponsiveData ? {
            long_headlines: mapTextAssets(videoResponsiveData.long_headlines || videoResponsiveData.headlines || []),
            headlines: mapTextAssets(videoResponsiveData.headlines || []),
            descriptions: mapTextAssets(videoResponsiveData.descriptions || []),
            call_to_actions: mapTextAssets(videoResponsiveData.call_to_actions || []),
            call_to_actions_enabled: !!(videoResponsiveData.call_to_actions_enabled ?? (videoResponsiveData.call_to_actions || []).length),
            videos: mapVideoAssets(videoResponsiveData.videos || (videoResponsiveData.video ? [videoResponsiveData.video] : [])),
            companion_banners: mapImageAssets(videoResponsiveData.companion_banners || []),
            companion_banner_enabled: !!(videoResponsiveData.companion_banner_enabled ?? (videoResponsiveData.companion_banners || []).length),
            breadcrumb1: videoResponsiveData.breadcrumb1,
            breadcrumb2: videoResponsiveData.breadcrumb2,
          } : undefined,
        };

        if (!transformedAd.video_responsive_ad && legacyVideoData) {
          transformedAd.video_responsive_ad = {
            long_headlines: mapTextAssets([legacyVideoData.format_in_stream?.action_headline].filter(Boolean) as string[]),
            descriptions: mapTextAssets([legacyVideoData.format_in_stream?.description].filter(Boolean) as string[]),
            call_to_actions: mapTextAssets([legacyVideoData.format_in_stream?.action_button_label].filter(Boolean) as string[]),
            call_to_actions_enabled: !!legacyVideoData.format_in_stream?.action_button_label,
            videos: mapVideoAssets([legacyVideoData.video_asset].filter(Boolean)),
            companion_banners: mapImageAssets([legacyVideoData.format_in_stream?.companion_banner].filter(Boolean)),
            companion_banner_enabled: !!legacyVideoData.format_in_stream?.companion_banner,
            breadcrumb1: undefined,
            breadcrumb2: undefined,
            headlines: mapTextAssets([]),
          } as any;
          (transformedAd as any).video_ad = legacyVideoData;
        }

        setAd(transformedAd);
        if (transformedAd.responsive_search_ad) {
          setShareType('SEARCH');
          setSurface('DISPLAY');
        } else if (transformedAd.video_responsive_ad || (transformedAd as any).video_ad) {
          setShareType('VIDEO');
          setSurface('DISPLAY');
        } else {
          setShareType('DISPLAY');
        }
      } catch (err: any) {
        console.error('Error loading share preview:', err);
        setError(err.response?.status === 404 ? 'Ad not found' : 'Failed to load preview');
      } finally {
        setLoading(false);
      }
    };

    loadSharePreview();
  }, [searchParams]);

  const variants: Variant[] = useMemo(() => {
    const displayAdInfo = ad?.responsive_display_ad;
    const searchAdInfo = ad?.responsive_search_ad;
    const videoResponsiveInfo = ad?.video_responsive_ad;
    
    // Handle search ads
    if (searchAdInfo) {
      const hasHeadlines = (searchAdInfo.headlines?.length ?? 0) > 0;
      const hasDescriptions = (searchAdInfo.descriptions?.length ?? 0) > 0;
      const locked = !(hasHeadlines && hasDescriptions);
      
      return [
        {
          id: 'v1',
          locked,
          kind: 'LANDSCAPE' as const,
          variantKey: 'search.mobile.standard-3line',
          surface: 'DISPLAY' as const,
        }
      ];
    }

    if (videoResponsiveInfo) {
      const hasVideos = (videoResponsiveInfo.videos?.length ?? 0) > 0;
      const hasLongHeadlines = (videoResponsiveInfo.long_headlines?.length ?? 0) > 0 || (videoResponsiveInfo.headlines?.length ?? 0) > 0;
      const hasDescriptions = (videoResponsiveInfo.descriptions?.length ?? 0) > 0;
      const locked = !(hasVideos && hasLongHeadlines && hasDescriptions);

      return [
        {
          id: 'v1',
          locked,
          kind: 'LANDSCAPE' as const,
          variantKey: 'video.youtube.in-stream-skippable',
          surface: 'DISPLAY' as const,
        },
        {
          id: 'v2',
          locked,
          kind: 'SQUARE' as const,
          variantKey: 'video.youtube.in-feed',
          surface: 'DISPLAY' as const,
        },
      ];
    }

    // Handle display ads
    const hasImages = (displayAdInfo?.marketing_images?.length ?? 0) > 0;
    const hasSquareImages = (displayAdInfo?.square_marketing_images?.length ?? 0) > 0;
    const hasHeadlines = (displayAdInfo?.headlines?.length ?? 0) > 0;
    const hasDescriptions = (displayAdInfo?.descriptions?.length ?? 0) > 0;
    const logoImage = displayAdInfo?.logo_images?.[0];
    const squareLogo = displayAdInfo?.square_logo_images?.[0];

    const allVariants = [
      { key: 'mobile.landscape.image-headline-logo-desc-arrow', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // A
      { key: 'mobile.portrait.hero-logo-title-desc-buttons', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // B
      { key: 'mobile.landscape.logo-headline-arrow', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // C
      { key: 'mobile.landscape.overlay-headline-desc-business-arrow', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // D
      { key: 'mobile.portrait.dark-hero-title-desc-biz-buttons', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // E
      { key: 'mobile.landscape.image-headline-logo-desc-arrow', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // F (same as A)
      { key: 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // G
      // { key: 'mobile.landscape.centered-whitecard', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // H (temporarily disabled)
      { key: 'mobile.landscape.title-desc-biz-textcta', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // I
      { key: 'mobile.landscape.image-plus-whitecard-below', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // J
      { key: 'mobile.portrait.dark-hero-biz-title-desc-innerimage-pillcta', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // K
      { key: 'mobile.landscape.logo-longheadline-biz-textcta', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // L
      { key: 'mobile.landscape.image-logo-title-desc-biz-textcta', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // M
      { key: 'mobile.inline.thumb-longheadline-adbiz-button', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // N
      { key: 'mobile.inline.thumb-title-desc-adbiz-button', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // O
      { key: 'mobile.inline.thumb-title-adbiz-button', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // P
      { key: 'mobile.inline.header-title-thumbgrid-desc-adbiz-button', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // Q
      { key: 'mobile.inline.header-title-thumb-desc-adbiz-button', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // R
      { key: 'mobile.inline.whitecard-logo-title-desc-biz-cta', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // S
      { key: 'mobile.sheet.logo-title-biz-desc-buttons', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // T
      { key: 'mobile.inline.inlinebox-title-desc-fab-footer', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // U
      { key: 'mobile.inline.darkcard-title-desc-fab-footer', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // V
      { key: 'mobile.landscape.video-title-logo-desc-button', kind: 'LANDSCAPE' as const, surface: 'DISPLAY' as const }, // W
      { key: 'mobile.sheet.dark-logo-title-desc-videothumb-buttons', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // X
      { key: 'mobile.sheet.light-logoTitle-desc-video-cta', kind: 'SQUARE' as const, surface: 'DISPLAY' as const }, // Y
      { key: 'gmail.promotions.row-sponsored-biz-headline-desc', kind: 'SQUARE' as const, surface: 'GMAIL' as const }, // G1
      { key: 'gmail.promotions.row-sponsored-biz-desc-headline', kind: 'SQUARE' as const, surface: 'GMAIL' as const }, // G2
      { key: 'gmail.promotions.row-sponsored-biz-headline-image', kind: 'SQUARE' as const, surface: 'GMAIL' as const }, // G3
      { key: 'youtube.feed.left-thumb-right-text', kind: 'SQUARE' as const, surface: 'YOUTUBE' as const }, // Y1
      { key: 'youtube.home.ad-card', kind: 'SQUARE' as const, surface: 'YOUTUBE' as const }, // Y2
    ];

    return allVariants.map((variant, index) => {
      const isLandscape = variant.kind === 'LANDSCAPE';
      const isGmailVariant = variant.surface === 'GMAIL';
      const isYouTubeVariant = variant.surface === 'YOUTUBE';
      const needsImages = isLandscape ? hasImages : hasSquareImages;
      const hasLogo = (logoImage || squareLogo) !== undefined;
      
      // Gmail variants need logo and text assets (G3 also needs image)
      if (isGmailVariant) {
        const isG3Variant = variant.key === 'gmail.promotions.row-sponsored-biz-headline-image';
        const hasImage = hasImages || hasSquareImages;
        const locked = !(hasLogo && hasHeadlines && (isG3Variant ? hasImage : hasDescriptions));
        return {
          id: `v${index + 1}`,
          locked,
          kind: variant.kind,
          variantKey: variant.key,
          surface: variant.surface,
        };
      }
      
      // YouTube variants need logo, headline, and image
      if (isYouTubeVariant) {
        const isY2Variant = variant.key === 'youtube.home.ad-card';
        const hasImage = hasImages || hasSquareImages;
        // Y2 needs headline, description, and image (no logo)
        // Y1 needs logo, headline, and image
        const locked = isY2Variant 
          ? !(hasHeadlines && hasDescriptions && hasImage)
          : !(hasLogo && hasHeadlines && hasImage);
        return {
          id: `v${index + 1}`,
          locked,
          kind: variant.kind,
          variantKey: variant.key,
          surface: variant.surface,
        };
      }
      
      // Display variants need images and text assets
      const locked = !(needsImages && hasHeadlines && hasDescriptions);
      
      return {
        id: `v${index + 1}`,
        locked,
        kind: variant.kind,
        variantKey: variant.key,
        surface: variant.surface,
      };
    });
  }, [ad]);

  const filteredVariants = useMemo(() => {
    if (surface === 'ALL') {
      return variants;
    }
    return variants.filter(v => v.surface === surface);
  }, [variants, surface]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Preview Not Available</h1>
          <p className="text-gray-600">{error || 'Ad not found'}</p>
          {expired && (
            <p className="text-sm text-gray-500 mt-2">This shared link has expired.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {shareGenerationDate && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="max-w-7xl mx-auto text-sm text-gray-700">
            <span className="font-medium">Generation date:</span> {shareGenerationDate.toLocaleDateString()}
            {shareExpirationDays !== null && (
              <>
                <span className="mx-2">•</span>
                <span>This shareable link will expire in {shareExpirationDays} day{shareExpirationDays !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </div>
      )}
      <div className="min-h-screen flex items-center justify-center py-4">
        <PreviewModal
          surface={surface}
          device={device}
          onSurfaceChange={setSurface}
          onDeviceChange={setDevice}
          variants={filteredVariants}
          ad={ad}
          onClose={() => {
            window.close();
          }}
          isShared={true}
          hideSurfaceSelector={shareType !== 'DISPLAY'}
        />
      </div>
    </div>
  );
}

