'use client';

import React from 'react';
import { GoogleAd } from '@/lib/api/googleAdsApi';
import { VARIANTS } from './variants';
import styles from './FactoryCard.module.css';

const cx = (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' ');

const applyLineClamp = (style: Record<string, any>, lines: number) => ({
  ...style,
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
});

const shrinkFont = (
  basePx: number,
  length: number,
  mediumThreshold = 40,
  largeThreshold = 80,
  mediumFactor = 0.85,
  largeFactor = 0.7
) => {
  if (length > largeThreshold) return `${Math.round(basePx * largeFactor)}px`;
  if (length > mediumThreshold) return `${Math.round(basePx * mediumFactor)}px`;
  return `${basePx}px`;
};

const parsePxValue = (value: unknown): number | null => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)px$/i);
    if (match) return Number(match[1]);
  }
  return null;
};

const adjustFontSizeForText = (
  style: Record<string, any>,
  text: string | undefined,
  defaultBase: number,
  thresholds?: { medium?: number; large?: number; mediumFactor?: number; largeFactor?: number }
) => {
  if (!text) return style;
  const length = text.length;
  if (length === 0) return style;

  const basePx =
    parsePxValue(style.fontSize) ??
    defaultBase;

  const mediumThreshold = thresholds?.medium ?? 40;
  const largeThreshold = thresholds?.large ?? 80;
  const mediumFactor = thresholds?.mediumFactor ?? 0.85;
  const largeFactor = thresholds?.largeFactor ?? 0.7;

  const shrinked = shrinkFont(basePx, length, mediumThreshold, largeThreshold, mediumFactor, largeFactor);
  const shrinkedPx = parsePxValue(shrinked) ?? basePx;
  const cappedPx = Math.min(shrinkedPx, defaultBase);
  if (cappedPx === (parsePxValue(style.fontSize) ?? basePx)) {
    return style;
  }
  return {
    ...style,
    fontSize: `${cappedPx}px`
  };
};

interface FactoryCardProps {
  variantKey: string;
  ad: GoogleAd;
  locked?: boolean;
  viewOnly?: boolean;
  data?: Record<string, any>;
  videoUrl?: string;
  imageUrl?: string;
}

export default function FactoryCard(props: FactoryCardProps) {
  const { variantKey, ad, locked = false, viewOnly = false } = props;
  const config = VARIANTS[variantKey];
  if (!config) {
    return (
      <div className={styles.unknown}>
        Unknown variant: {variantKey}
      </div>
    );
  }

  const extraData: Record<string, any> = props.data || {};
  if (!extraData.videoUrl && props.videoUrl) extraData.videoUrl = props.videoUrl;
  if (!extraData.imageUrl && props.imageUrl) extraData.imageUrl = props.imageUrl;

  const isValidUrl = (value?: string) => typeof value === 'string' && /^(https?:|data:|blob:)/i.test(value);
  const pickUrl = (source: any, keys: string[]): string | undefined => {
    if (!source) return undefined;
    for (const key of keys) {
      const val = source[key];
      if (typeof val === 'string' && isValidUrl(val)) return val;
    }
    return undefined;
  };

  const isGmailList = config.panel?.type === 'gmailList';
  const isG1Variant = variantKey === 'gmail.promotions.row-sponsored-biz-headline-desc';
  const isG2Variant = variantKey === 'gmail.promotions.row-sponsored-biz-desc-headline';
  const isG3Variant = variantKey === 'gmail.promotions.row-sponsored-biz-headline-image';
  const isYouTubeFeed = config.panel?.type === 'ytFeed';
  const isYouTubeHome = config.panel?.type === 'ytHome';
  const isY2Variant = variantKey === 'youtube.home.ad-card';
  const isSearchAd = config.panel?.type === 'searchAd';

  const STANDARD_FRAME_VARIANTS = [
    'mobile.landscape.image-headline-logo-desc-arrow', // A
    'mobile.landscape.logo-headline-arrow', // C
    'mobile.landscape.overlay-headline-desc-business-arrow', // D
    'mobile.landscape.title-desc-biz-textcta', // I
  ];
  
  const isStandardFrame = STANDARD_FRAME_VARIANTS.includes(variantKey);

  const displayAdInfo = ad.responsive_display_ad;
  const searchAdInfo = ad.responsive_search_ad;
  const videoAdInfo = ad.video_responsive_ad;
  
  if (!displayAdInfo && !searchAdInfo && !videoAdInfo && !isSearchAd && !isYouTubeFeed && !isYouTubeHome) {
    return (
      <div className={styles.unknown}>
        No ad data available
      </div>
    );
  }

  const getMediaUrl = (imageAsset: any) => {
    const url = imageAsset?.url || imageAsset?.asset || null;
    if (!url) return null;
    if (/^(https?:|blob:|data:)/.test(url)) return url;
    if (url.startsWith('/')) {
      return typeof window !== 'undefined' ? `${window.location.origin}${url}` : url;
    }
    return url;
  };

  const mediaImage = displayAdInfo?.marketing_images?.[0];
  const squareImage = displayAdInfo?.square_marketing_images?.[0];
  const logoImage = displayAdInfo?.logo_images?.[0];
  const squareLogo = displayAdInfo?.square_logo_images?.[0];
  const displayVideoAsset = displayAdInfo?.youtube_videos?.[0];

  const legacyVideoAd: any = (ad as any).video_ad || null;
  const videoAsset = videoAdInfo?.videos?.[0] || legacyVideoAd?.video_asset;
  const companionBannerAsset = videoAdInfo?.companion_banners?.[0] || legacyVideoAd?.format_in_stream?.companion_banner;
  const companionMeta = (companionBannerAsset as any)?.asset_metadata || extraData.posterMetadata || {};
  const companionPosterUrl = pickUrl(companionMeta, [
    'poster_url','posterUrl','preview_image_url','previewImageUrl','thumbnail_url','thumbnailUrl','image_url','imageUrl','default_image_url','defaultImageUrl'
  ]) || getMediaUrl(companionBannerAsset);
  const videoAssetMeta = (videoAsset as any)?.asset_metadata || legacyVideoAd?.video_asset_info || extraData.videoMetadata || {};
  const videoPosterMetaUrl = pickUrl(videoAssetMeta, [
    'poster_url','posterUrl','preview_image_url','previewImageUrl','thumbnail_url','thumbnailUrl','image_url','imageUrl','default_image_url','defaultImageUrl','still_url','stillUrl'
  ]);
  const extraImageUrl = extraData.imageUrl || null;
  const videoImageUrl = (displayVideoAsset as any)?.image_url || (displayVideoAsset as any)?.url || null;
  const marketingMediaUrl = getMediaUrl(mediaImage);
  const squareMarketingMediaUrl = getMediaUrl(squareImage);
  const extractYouTubeId = (input?: string | null) => {
    if (!input) return null;
    const url = input.trim();
    if (!url) return null;
    // embed
    const embedMatch = url.match(/youtube\.com\/embed\/([^?&]+)/i);
    if (embedMatch?.[1]) return embedMatch[1];
    // watch
    const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/i);
    if (watchMatch?.[1]) return watchMatch[1];
    // short
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/i);
    if (shortMatch?.[1]) return shortMatch[1];
    return null;
  };

  const buildYouTubeThumbnail = (id: string) =>
    `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

  let videoCoverUrl =
    extraImageUrl ||
    companionPosterUrl ||
    videoPosterMetaUrl ||
    (videoAsset ? getMediaUrl((videoAsset as any).image_asset || videoAsset) : null) ||
    videoImageUrl ||
    null;
  const shouldUseVideoCover =
    isYouTubeFeed ||
    isYouTubeHome ||
    (variantKey?.startsWith('video.') ?? false);

  // Get video URL for playable videos
  const getVideoUrlFromAsset = (asset?: any) => {
    if (!asset) return null;
    if (asset.video_id) {
      return `https://www.youtube.com/embed/${asset.video_id}`;
    }
    if (asset.url && typeof asset.url === 'string') {
      return getMediaUrl(asset);
    }
    if (asset.asset) {
      const assetString = String(asset.asset);
      if (assetString.startsWith('http')) {
        return assetString;
      }
      const ytMatch = assetString.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]+)/);
      if (ytMatch && ytMatch[1]) {
        return `https://www.youtube.com/embed/${ytMatch[1]}`;
      }
    }
    return null;
  };
  const displayVideoUrl = getVideoUrlFromAsset(displayVideoAsset);

  const resolvedVideoUrl =
    extraData.videoUrl ||
    displayVideoUrl ||
    null;

  if (shouldUseVideoCover && !videoCoverUrl && resolvedVideoUrl) {
    const youtubeId = extractYouTubeId(resolvedVideoUrl);
    if (youtubeId) {
      videoCoverUrl = buildYouTubeThumbnail(youtubeId);
    }
  }

  const mediaUrl = shouldUseVideoCover
    ? (videoCoverUrl || marketingMediaUrl || squareMarketingMediaUrl || null)
    : (marketingMediaUrl || squareMarketingMediaUrl || videoCoverUrl || null);

  const squareMediaUrl = squareMarketingMediaUrl || mediaUrl;
  const videoLogoAsset = (videoAdInfo as any)?.logo_images?.[0];

  const logoUrl =
    getMediaUrl(logoImage) ||
    getMediaUrl(squareLogo) ||
    getMediaUrl(videoLogoAsset) ||
    companionPosterUrl ||
    null;
  
  const deriveHost = () => {
    if (ad.final_urls && ad.final_urls.length > 0) {
      try {
        const url = new URL(ad.final_urls[0]);
        return url.hostname.replace(/^www\./, '');
      } catch (error) {
        return ad.final_urls[0].replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
      }
    }
    if (ad.display_url) {
      return ad.display_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    }
    return 'example.com';
  };

  const displayTitle = displayAdInfo?.headlines?.[0]?.text || displayAdInfo?.long_headline?.text || '';
  const videoTitle = videoAdInfo?.long_headlines?.[0]?.text || videoAdInfo?.headlines?.[0]?.text || '';
  const title = displayTitle || videoTitle || ad.name || '';

  const displayLongHeadline = displayAdInfo?.long_headline?.text || '';
  const videoLongHeadline = videoAdInfo?.long_headlines?.[0]?.text || '';
  const longHeadline = displayLongHeadline || videoLongHeadline || title;

  const displayDescription = displayAdInfo?.descriptions?.[0]?.text || '';
  const videoDescription = videoAdInfo?.descriptions?.[0]?.text || '';
  const description = displayDescription || videoDescription || '';

  const businessName = displayAdInfo?.business_name || deriveHost() || 'Ad';
  const business = businessName;

  const displayCta = displayAdInfo?.call_to_action_text || '';
  const videoCta = videoAdInfo?.call_to_actions?.[0]?.text || '';
  const cta = displayCta || videoCta || 'Learn more';

  const getMediaRatio = () => {
    if (!config.media || config.media.ratio === 'none') return null;
    if (config.media.ratio === '1.91:1') return styles.landscape;
    if (config.media.ratio === '9:16') return styles.portrait;
    if (config.media.ratio === '1:1') return styles.square;
    return styles.landscape;
  };

  const renderSlot = (slot: string) => {
    const isEVariantBtn = variantKey === 'mobile.portrait.dark-hero-title-desc-biz-buttons';
    
    switch (slot) {
      case 'logo':
        const isHVariantLogo = variantKey === 'mobile.landscape.centered-whitecard';
        const isJVariantLogo = variantKey === 'mobile.landscape.image-plus-whitecard-below';
        const isLVariantLogo = variantKey === 'mobile.landscape.logo-longheadline-biz-textcta';
        const isMVariantLogo = variantKey === 'mobile.landscape.image-logo-title-desc-biz-textcta';
        const isSVariantLogo = variantKey === 'mobile.inline.whitecard-logo-title-desc-biz-cta';
        const isTVariantLogo = variantKey === 'mobile.sheet.logo-title-biz-desc-buttons';
        const isXVariantLogo = variantKey === 'mobile.sheet.dark-logo-title-desc-videothumb-buttons';
        const logoStyle = isHVariantLogo ? {
          width: '64px',
          height: '64px',
          borderRadius: '8px'
        } : isJVariantLogo ? {
          width: '72px',
          height: '72px',
          borderRadius: '8px',
          alignSelf: 'flex-start'
        } : isSVariantLogo ? {
          width: '72px',
          height: '72px',
          borderRadius: '0',
          flexShrink: 0
        } : isTVariantLogo ? {
          width: '96px',
          height: '96px',
          borderRadius: '8px',
          flexShrink: 0
        } : isXVariantLogo ? {
          width: '80px',
          height: '80px',
          borderRadius: '8px',
          flexShrink: 0
        } : (isLVariantLogo || isMVariantLogo) ? {
          width: '44px',
          height: '44px',
          borderRadius: '6px'
        } : {};
        return (
          <div key={slot} className={styles.logo} style={logoStyle}>
            {logoUrl ? (
              <img src={logoUrl} alt="" className={styles.logoImg} />
            ) : (
              <span className={styles.logoText}>LOGO</span>
            )}
          </div>
        );
      case 'gmail-avatar':
        const initialFrom = (business: string) => {
          const t = (business || "").trim();
          return t ? t[0]?.toUpperCase() : "B";
        };
        return (
          <div key={slot} className={styles.gmailAvatar} style={{ background: '#9aa0a6' }}>
            <span style={{ color: '#fff', fontWeight: '600' }}>{initialFrom(business)}</span>
          </div>
        );
      case 'gmail-sponsored':
        return <span key={slot} className={styles.gmailSponsored}>Sponsored</span>;
      case 'gmail-biz-strong':
        {
          let bizStyle: Record<string, any> = {
            fontSize: '16px',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          };
          bizStyle = adjustFontSizeForText(
            bizStyle,
            business,
            16,
            { medium: 18, large: 28, mediumFactor: 0.82, largeFactor: 0.65 }
          );
          return <strong key={slot} className={styles.gmailBiz} style={bizStyle}>{business}</strong>;
        }
      case 'gmail-kebab':
        return <div key={slot} className={styles.gmailKebab} aria-hidden="true">⋮</div>;
      case 'gmail-star':
        return (
          <div key={slot} className={styles.gmailStar} aria-label="star" role="img">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#202124" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        );
      case 'gmail-image':
        const gmailImageUrl = mediaUrl || squareMediaUrl;
        return gmailImageUrl ? (
          <div key={slot} className={styles.gmailImage}>
            <img src={gmailImageUrl} alt="" className={styles.gmailImageImg} />
          </div>
        ) : null;
      case 'title':
        let titleStyle: any = { whiteSpace: 'normal', overflowWrap: 'anywhere' };
        if (isGmailList) {
          // G2 variant uses title in Line3 with desc style
          if (isG2Variant) {
            titleStyle = applyLineClamp(
              { ...titleStyle, color: '#5f6368', fontSize: '13px' },
              2
            );
          } else {
            // G1 variant uses title in Line2 with headline style
            titleStyle = applyLineClamp(
              { ...titleStyle, fontWeight: 700, fontSize: '14px', color: '#202124' },
              2
            );
          }
        } else if (isYouTubeFeed) {
          titleStyle = applyLineClamp(
            { fontWeight: 700, fontSize: '14px', color: '#111827', whiteSpace: 'normal', overflowWrap: 'anywhere' },
            2
          );
        } else if (isYouTubeHome) {
          titleStyle = applyLineClamp(
            { fontWeight: 700, fontSize: '16px', color: '#111827', whiteSpace: 'normal', overflowWrap: 'anywhere' },
            2
          );
        }
        const isWVariantTitle = variantKey === 'mobile.landscape.video-title-logo-desc-button';
        const isOVariantTitle = variantKey === 'mobile.inline.thumb-title-desc-adbiz-button';
        const isPVariantTitle = variantKey === 'mobile.inline.thumb-title-adbiz-button';
        const isQRVariantTitle = variantKey === 'mobile.inline.header-title-thumbgrid-desc-adbiz-button' ||
                                 variantKey === 'mobile.inline.header-title-thumb-desc-adbiz-button';
        const isSVariantTitle = variantKey === 'mobile.inline.whitecard-logo-title-desc-biz-cta';
        if (variantKey === 'mobile.portrait.hero-logo-title-desc-buttons') {
          titleStyle = { ...titleStyle, fontSize: '42px', fontWeight: 700 };
        } else if (isWVariantTitle) {
          titleStyle = { ...titleStyle, fontSize: '24px', fontWeight: 700 };
        } else if (variantKey === 'mobile.landscape.logo-headline-arrow') {
          titleStyle = { ...titleStyle, fontSize: '36px', lineHeight: '36px', fontWeight: 700 };
        } else if (variantKey === 'mobile.landscape.image-logo-title-desc-biz-textcta') {
          titleStyle = { ...titleStyle, fontSize: '18px', lineHeight: '22px', fontWeight: 700, marginBottom: '0' };
        } else if (isSVariantTitle) {
          titleStyle = { ...titleStyle, fontSize: '24px', lineHeight: '1.3', fontWeight: 700 };
        } else if (isOVariantTitle || isPVariantTitle || isQRVariantTitle) {
          titleStyle = { ...titleStyle, fontSize: '12px', lineHeight: '16px', marginBottom: '0' };
        }
        if (!(isGmailList || isYouTubeFeed || isYouTubeHome)) {
          titleStyle = applyLineClamp(titleStyle, 2);
        }
        if (isPVariantTitle) {
          titleStyle = applyLineClamp(titleStyle, 1);
        }
        const titleBase =
          variantKey === 'mobile.landscape.centered-whitecard' ? 20 :
          variantKey === 'mobile.portrait.hero-logo-title-desc-buttons' ? 22 :
          22;
        const titleThresholds = variantKey === 'mobile.landscape.centered-whitecard'
          ? { medium: 30, large: 60, mediumFactor: 0.8, largeFactor: 0.65 }
          : undefined;
        titleStyle = adjustFontSizeForText(titleStyle, title, titleBase, titleThresholds);
        return title ? <div key={slot} className={styles.headline} style={titleStyle}>{title}</div> : null;
      case 'longHeadline':
        const isLVariantLongHeadline = variantKey === 'mobile.landscape.logo-longheadline-biz-textcta';
        const isNVariantLongHeadline = variantKey === 'mobile.inline.thumb-longheadline-adbiz-button';
        let longHeadlineStyle: Record<string, any> = isLVariantLongHeadline
          ? { fontSize: '18px', lineHeight: '1.22', whiteSpace: 'normal', overflowWrap: 'anywhere' }
          : isNVariantLongHeadline
            ? { fontSize: '12px', lineHeight: '16px', marginBottom: '0', whiteSpace: 'normal', overflowWrap: 'anywhere' }
            : { whiteSpace: 'normal', overflowWrap: 'anywhere' };
        if (isNVariantLongHeadline) {
          longHeadlineStyle = applyLineClamp(longHeadlineStyle, 2);
        }
        return longHeadline ? <div key={slot} className={styles.longHeadline} style={longHeadlineStyle}>{longHeadline}</div> : null;
      case 'titleXL':
        const isJVariantTitleXL = variantKey === 'mobile.landscape.image-plus-whitecard-below';
        const isVVariantTitleXL = variantKey === 'mobile.inline.darkcard-title-desc-fab-footer';
        const isUVariantTitleXL = variantKey === 'mobile.inline.inlinebox-title-desc-fab-footer';
        if (config.panel?.type === 'darkCard' && isVVariantTitleXL) {
          let titleXLStyle: Record<string, any> = {
            fontSize: '36px',
            lineHeight: '1.1',
            fontWeight: '600',
            color: '#22d3ee',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere'
          };
          titleXLStyle = adjustFontSizeForText(
            titleXLStyle,
            title,
            32,
            { medium: 45, large: 90, mediumFactor: 0.8, largeFactor: 0.65 }
          );
          titleXLStyle = applyLineClamp(titleXLStyle, 2);
          return title ? <div key={slot} className={styles.headlineXL} style={titleXLStyle}>{title}</div> : null;
        } else if (config.panel?.type === 'darkOverlay' || config.panel?.type === 'darkSheet' || config.panel?.type === 'darkCard') {
          const titleXLStyle = variantKey === 'mobile.portrait.dark-hero-title-desc-biz-buttons'
            ? { fontSize: '42px', lineHeight: '1.05', whiteSpace: 'normal', overflowWrap: 'anywhere' }
            : { whiteSpace: 'normal', overflowWrap: 'anywhere' };
          const adjustedTitleXLStyle = adjustFontSizeForText(
            titleXLStyle,
            title,
            variantKey === 'mobile.portrait.dark-hero-title-desc-biz-buttons' ? 38 : 32,
            { medium: 40, large: 80, mediumFactor: 0.82, largeFactor: 0.68 }
          );
          return title ? <div key={slot} className={styles.headlineXLDark} style={adjustedTitleXLStyle}>{title}</div> : null;
        } else if (config.panel?.type === 'lightSheet') {
          const isGVariant = variantKey === 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar';
          const isTVariant = variantKey === 'mobile.sheet.logo-title-biz-desc-buttons';
          const titleXLStyleBase = isGVariant
            ? { fontSize: '56px', lineHeight: '1.1', fontWeight: '600', whiteSpace: 'normal', overflowWrap: 'anywhere' }
            : isTVariant
              ? { fontSize: '48px', lineHeight: '1.2', fontWeight: '300', whiteSpace: 'normal', overflowWrap: 'anywhere' }
              : { whiteSpace: 'normal', overflowWrap: 'anywhere' };
          const titleXLThresholds = isGVariant
            ? { medium: 35, large: 65, mediumFactor: 0.68, largeFactor: 0.48 }
            : { medium: 45, large: 90, mediumFactor: 0.8, largeFactor: 0.65 };
          const titleXLAdjusted = adjustFontSizeForText(
            titleXLStyleBase,
            title,
            isGVariant ? 42 : isTVariant ? 34 : 30,
            titleXLThresholds
          );
          return title ? <div key={slot} className={styles.headlineXL} style={titleXLAdjusted}>{title}</div> : null;
        } else if (isUVariantTitleXL) {
          let titleXLStyle: Record<string, any> = {
            fontSize: '34px',
            lineHeight: '1.12',
            fontWeight: 600,
            whiteSpace: 'normal',
            overflowWrap: 'anywhere'
          };
          titleXLStyle = adjustFontSizeForText(
            titleXLStyle,
            title,
            30,
            { medium: 40, large: 80, mediumFactor: 0.82, largeFactor: 0.68 }
          );
          titleXLStyle = applyLineClamp(titleXLStyle, 2);
          return title ? <div key={slot} className={styles.headlineXL} style={titleXLStyle}>{title}</div> : null;
        } else if (config.panel?.type === 'whiteCard' && isJVariantTitleXL) {
          const titleXLBaseStyle = {
            fontSize: '36px',
            lineHeight: '1.12',
            fontWeight: 400,
            textAlign: 'left',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere'
          };
          const titleXLAdjusted = adjustFontSizeForText(
            titleXLBaseStyle,
            title,
            30,
            { medium: 34, large: 60, mediumFactor: 0.7, largeFactor: 0.48 }
          );
          const titleXLClamped: Record<string, any> = applyLineClamp(titleXLAdjusted, 3);
          return title ? <div key={slot} className={styles.headlineXL} style={titleXLClamped}>{title}</div> : null;
        }
        return title ? <div key={slot} className={styles.headlineXL}>{title}</div> : null;
      case 'desc':
        if (isGmailList) {
          // G2 variant uses desc in Line2 with headline style
          if (isG2Variant) {
            const gmailDescStyle = adjustFontSizeForText(
              applyLineClamp(
                { fontWeight: 700, fontSize: '14px', color: '#202124', whiteSpace: 'normal', overflowWrap: 'anywhere' },
                2
              ),
              description,
              14,
              { medium: 60, large: 120 }
            );
            return description
              ? <div key={slot} className={styles.descLight} style={gmailDescStyle}>{description}</div>
              : null;
          } else if (isG3Variant) {
            // G3 variant uses desc in white bar below image
            const gmailImageDescStyle = adjustFontSizeForText(
              applyLineClamp(
                { color: '#5f6368', fontSize: '13px', whiteSpace: 'normal', overflowWrap: 'anywhere' },
                2
              ),
              description,
              13,
              { medium: 60, large: 120 }
            );
            return description ? <div key={slot} style={gmailImageDescStyle}>{description}</div> : null;
          } else {
            // G1 variant uses desc in Line3 with desc style
            const gmailDescStyle = adjustFontSizeForText(
              applyLineClamp(
                { color: '#5f6368', fontSize: '13px', whiteSpace: 'normal', overflowWrap: 'anywhere' },
                2
              ),
              description,
              13,
              { medium: 60, large: 120 }
            );
            return description
              ? <div key={slot} className={styles.descLight} style={gmailDescStyle}>{description}</div>
              : null;
          }
        }
        const isJVariantDesc = variantKey === 'mobile.landscape.image-plus-whitecard-below';
        const isMVariantDesc = variantKey === 'mobile.landscape.image-logo-title-desc-biz-textcta';
        const isVVariantDesc = variantKey === 'mobile.inline.darkcard-title-desc-fab-footer';
        const isXVariantDesc = variantKey === 'mobile.sheet.dark-logo-title-desc-videothumb-buttons';
        const isYVariantDesc = variantKey === 'mobile.sheet.light-logoTitle-desc-video-cta';
        const isOPQRVariantDesc = variantKey === 'mobile.inline.thumb-title-desc-adbiz-button' || 
                                 variantKey === 'mobile.inline.thumb-title-adbiz-button' ||
                                 variantKey === 'mobile.inline.header-title-thumbgrid-desc-adbiz-button' ||
                                 variantKey === 'mobile.inline.header-title-thumb-desc-adbiz-button';
        const isSVariantDesc = variantKey === 'mobile.inline.whitecard-logo-title-desc-biz-cta';
        if (config.panel?.type === 'darkCard' && isVVariantDesc) {
          let descStyle: Record<string, any> = {
            color: '#fff',
            whiteSpace: 'normal',
            overflowWrap: 'anywhere'
          };
          descStyle = adjustFontSizeForText(
            descStyle,
            description,
            16,
            { medium: 60, large: 120, mediumFactor: 0.85, largeFactor: 0.7 }
          );
          descStyle = applyLineClamp(descStyle, 3);
          return description ? <div key={slot} className={styles.descLight} style={descStyle}>{description}</div> : null;
        } else if (config.panel?.type === 'darkOverlay' || config.panel?.type === 'darkSheet') {
          const descStyle = adjustFontSizeForText(
            variantKey === 'mobile.portrait.dark-hero-title-desc-biz-buttons'
              ? { fontSize: '28px', lineHeight: '1.4', whiteSpace: 'normal', overflowWrap: 'anywhere' }
              : isXVariantDesc
                ? { fontSize: '20px', lineHeight: '1.35', whiteSpace: 'normal', overflowWrap: 'anywhere' }
                : { whiteSpace: 'normal', overflowWrap: 'anywhere' },
            description,
            18,
            { medium: 60, large: 120, mediumFactor: 0.82, largeFactor: 0.68 }
          );
          return description ? <div key={slot} className={styles.desc} style={descStyle}>{description}</div> : null;
        } else if (config.panel?.type === 'lightSheet') {
          const isGVariant = variantKey === 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar';
          const isTVariant = variantKey === 'mobile.sheet.logo-title-biz-desc-buttons';
          const descStyleBase = isGVariant
            ? { fontSize: '32px', lineHeight: '1.35', whiteSpace: 'normal', overflowWrap: 'anywhere' }
            : isTVariant
              ? { fontSize: '20px', lineHeight: '1.4', whiteSpace: 'normal', overflowWrap: 'anywhere' }
              : isYVariantDesc
                ? { fontSize: '20px', lineHeight: '1.35', whiteSpace: 'normal', overflowWrap: 'anywhere' }
                : { whiteSpace: 'normal', overflowWrap: 'anywhere' };
          const descThresholds = isGVariant
            ? { medium: 40, large: 75, mediumFactor: 0.7, largeFactor: 0.5 }
            : { medium: 60, large: 120, mediumFactor: 0.82, largeFactor: 0.68 };
          const descStyle = adjustFontSizeForText(
            descStyleBase,
            description,
            isGVariant ? 26 : 20,
            descThresholds
          );
          return description ? <div key={slot} className={styles.descLight} style={descStyle}>{description}</div> : null;
        } else if (config.panel?.type === 'whiteCard' && isJVariantDesc) {
          const descBaseStyle = { fontSize: '24px', lineHeight: '1.3', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere' };
          const descAdjustedStyle = adjustFontSizeForText(
            descBaseStyle,
            description,
            20,
            { medium: 40, large: 72, mediumFactor: 0.72, largeFactor: 0.5 }
          );
          const descClampedStyle: Record<string, any> = applyLineClamp(descAdjustedStyle, 2);
          return description ? <div key={slot} className={styles.descLight} style={descClampedStyle}>{description}</div> : null;
        }
        let descStyle: Record<string, any> = variantKey === 'mobile.portrait.hero-logo-title-desc-buttons'
          ? { fontSize: '28px', lineHeight: '1.4', whiteSpace: 'normal', overflowWrap: 'anywhere' }
          : isSVariantDesc
            ? { fontSize: '18px', lineHeight: '1.4', whiteSpace: 'normal', overflowWrap: 'anywhere' }
            : isMVariantDesc
              ? { fontSize: '14px', lineHeight: '18px', marginTop: '0', whiteSpace: 'normal', overflowWrap: 'anywhere' }
              : isOPQRVariantDesc
                ? { fontSize: '11px', lineHeight: '14px', marginTop: '0', whiteSpace: 'normal', overflowWrap: 'anywhere' }
                : { whiteSpace: 'normal', overflowWrap: 'anywhere' };
        const baseDescSize = parsePxValue(descStyle.fontSize) ?? 16;
        let targetDescBase = baseDescSize;
        if (variantKey === 'mobile.portrait.hero-logo-title-desc-buttons') {
          targetDescBase = Math.min(baseDescSize, 18);
        } else if (variantKey === 'mobile.landscape.centered-whitecard') {
          targetDescBase = Math.min(baseDescSize, 16);
          descStyle = { ...descStyle, lineHeight: '1.3' };
        }
        const descThresholds = variantKey === 'mobile.landscape.centered-whitecard'
          ? { medium: 50, large: 80, mediumFactor: 0.8, largeFactor: 0.65 }
          : { medium: 60, large: 120 };
        descStyle = adjustFontSizeForText(
          descStyle,
          description,
          targetDescBase,
          descThresholds
        );
        const shouldClampDesc = !(
          config.panel?.type === 'darkOverlay' ||
          config.panel?.type === 'darkSheet' ||
          config.panel?.type === 'lightSheet'
        );
        let finalDescStyle: Record<string, any> = shouldClampDesc
          ? applyLineClamp(descStyle, 3)
          : descStyle;
        finalDescStyle = adjustFontSizeForText(
          finalDescStyle,
          description,
          Math.min(parsePxValue(finalDescStyle.fontSize) ?? targetDescBase, targetDescBase),
          descThresholds
        );
        return description ? <div key={slot} className={styles.descLight} style={finalDescStyle}>{description}</div> : null;
      case 'biz':
        const isGVariant = variantKey === 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar';
        const isTVariant = variantKey === 'mobile.sheet.logo-title-biz-desc-buttons';
        const isIVariantBiz = variantKey === 'mobile.landscape.title-desc-biz-textcta';
        const isJVariantBiz = variantKey === 'mobile.landscape.image-plus-whitecard-below';
        const isMVariantBiz = variantKey === 'mobile.landscape.image-logo-title-desc-biz-textcta';
        const isSVariantBiz = variantKey === 'mobile.inline.whitecard-logo-title-desc-biz-cta';
        const isYVariantBiz = variantKey === 'mobile.sheet.light-logoTitle-desc-video-cta';
        const bizStyle = variantKey === 'mobile.portrait.dark-hero-title-desc-biz-buttons' && config.panel?.type === 'darkOverlay' 
          ? { fontSize: '18px', whiteSpace: 'normal', overflowWrap: 'anywhere' } 
          : isGVariant && config.panel?.type === 'lightSheet'
            ? { fontSize: '28px', whiteSpace: 'normal', overflowWrap: 'anywhere' }
            : isTVariant && config.panel?.type === 'lightSheet'
              ? { fontSize: '20px', lineHeight: '1.4', whiteSpace: 'normal', overflowWrap: 'anywhere' }
              : isYVariantBiz && config.panel?.type === 'lightSheet'
                ? {
                    fontSize: '22px',
                    lineHeight: '1.35',
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }
              : isSVariantBiz
                ? { fontSize: '16px', lineHeight: '1.4' }
                : isIVariantBiz
                  ? { fontSize: '16px', textDecoration: 'none', lineHeight: '32px', display: 'flex', alignItems: 'center' }
                  : isJVariantBiz && config.panel?.type === 'whiteCard'
                    ? { fontSize: '24px', textDecoration: 'none', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere' }
                    : isMVariantBiz
            ? { fontSize: '14px', lineHeight: '1.15', textAlign: 'center', whiteSpace: 'normal', overflowWrap: 'anywhere', maxWidth: '44px', margin: '0 auto' }
                      : {};
        const bizClass = (config.panel?.type === 'darkOverlay' || config.panel?.type === 'darkSheet') ? styles.bizDark : styles.biz;
        let bizAdjustedStyle = bizStyle;
        if (config.panel?.type === 'darkOverlay' || config.panel?.type === 'darkSheet') {
          bizAdjustedStyle = adjustFontSizeForText(bizStyle, business, parsePxValue(bizStyle.fontSize) ?? 16, { medium: 50, large: 90, mediumFactor: 0.85, largeFactor: 0.7 });
        } else if (config.panel?.type === 'lightSheet' && isGVariant) {
          bizAdjustedStyle = adjustFontSizeForText(
            bizStyle,
            business,
            24,
            { medium: 32, large: 60, mediumFactor: 0.66, largeFactor: 0.45 }
          );
        } else if (config.panel?.type === 'lightSheet' && isYVariantBiz) {
          const adjusted = adjustFontSizeForText(
            bizStyle,
            business,
            20,
            { medium: 45, large: 80, mediumFactor: 0.78, largeFactor: 0.6 }
          );
          bizAdjustedStyle = adjusted;
        } else if (config.panel?.type === 'whiteCard' && isJVariantBiz) {
          bizAdjustedStyle = applyLineClamp(
            adjustFontSizeForText(bizStyle, business, 16, { medium: 24, large: 44, mediumFactor: 0.72, largeFactor: 0.52 }),
            1
          );
        } else if (isMVariantBiz) {
          const adjusted = adjustFontSizeForText(
            bizStyle,
            business,
            13,
            { medium: 10, large: 18, mediumFactor: 0.75, largeFactor: 0.6 }
          );
          bizAdjustedStyle = applyLineClamp(adjusted, 2);
        }
        return <div key={slot} className={bizClass} style={bizAdjustedStyle}>{business}</div>;
      case 'ad-biz':
        const isNVariantAdBiz = variantKey === 'mobile.inline.thumb-longheadline-adbiz-button';
        const isOPQRVariantAdBiz = variantKey === 'mobile.inline.thumb-title-desc-adbiz-button' || 
                                 variantKey === 'mobile.inline.thumb-title-adbiz-button' ||
                                 variantKey === 'mobile.inline.header-title-thumbgrid-desc-adbiz-button' ||
                                 variantKey === 'mobile.inline.header-title-thumb-desc-adbiz-button';
        const adBizBaseStyle = isNVariantAdBiz || isOPQRVariantAdBiz
          ? { fontSize: '11px', lineHeight: '16px', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '0', maxWidth: '72px' }
          : {};
        const adBizAdjustedStyle = (isNVariantAdBiz || isOPQRVariantAdBiz)
          ? adjustFontSizeForText(
              adBizBaseStyle,
              business,
              11,
              { medium: 18, large: 28, mediumFactor: 0.8, largeFactor: 0.6 }
            )
          : adBizBaseStyle;
        const adBizFinalStyle = (isNVariantAdBiz || isOPQRVariantAdBiz)
          ? applyLineClamp(adBizAdjustedStyle, 2)
          : adBizAdjustedStyle;
        return (
          <div key={slot} className={styles.adBiz} style={adBizFinalStyle}>
            <span className={styles.badgeAd} style={(isNVariantAdBiz || isOPQRVariantAdBiz) ? { fontSize: '11px', padding: '0 4px', height: '16px', lineHeight: '16px', flexShrink: 0 } : {}}>Ad</span>
            <span className={styles.biz} style={(isNVariantAdBiz || isOPQRVariantAdBiz) ? { fontSize: adBizAdjustedStyle.fontSize, lineHeight: '16px', textDecoration: 'none', overflowWrap: 'anywhere', whiteSpace: 'normal' } : {}}>{business}</span>
          </div>
        );
      case 'yt-thumb':
        const ytThumbUrl = mediaUrl || squareMediaUrl;
        return ytThumbUrl ? (
          <div key={slot} className={styles.ytThumb}>
            <img src={ytThumbUrl} alt="" className={styles.ytThumbImg} />
          </div>
        ) : null;
      case 'yt-cta':
        return (
          <button key={slot} className={styles.ytCta} aria-label={cta} title={cta}>
            {cta}
          </button>
        );
      case 'y2-thumb':
        const y2ThumbUrl = mediaUrl || squareMediaUrl;
        return y2ThumbUrl ? (
          <div key={slot} className={styles.y2Thumb}>
            <img src={y2ThumbUrl} alt="" className={styles.y2ThumbImg} />
          </div>
        ) : (
          <div key={slot} className={styles.y2Thumb}>
            <div className={styles.y2ThumbImg} />
          </div>
        );
      case 'ad-badge':
        return (
          <span key={slot} className={styles.badgeAd}>Ad</span>
        );
      case 'thumb':
        const isNVariantThumb = variantKey === 'mobile.inline.thumb-longheadline-adbiz-button';
        const isOPQVariantThumb = variantKey === 'mobile.inline.thumb-title-desc-adbiz-button' || 
                                   variantKey === 'mobile.inline.thumb-title-adbiz-button' ||
                                   variantKey === 'mobile.inline.header-title-thumbgrid-desc-adbiz-button';
        const isPVariantThumb = variantKey === 'mobile.inline.thumb-title-adbiz-button';
        const isRVariantThumb = variantKey === 'mobile.inline.header-title-thumb-desc-adbiz-button';
        const isNOPQRVariantThumb = isNVariantThumb || isOPQVariantThumb || isPVariantThumb || isRVariantThumb;
        const thumbStyle = isNVariantThumb ? { width: '56px', height: '56px', minWidth: '56px', flexShrink: 0 } : 
                           isPVariantThumb ? { width: '107px', height: '56px', minWidth: '107px', flexShrink: 0 } :
                           isRVariantThumb ? { width: '107px', height: '56px', minWidth: '107px', flexShrink: 0 } :
                           isOPQVariantThumb ? { width: '56px', height: '56px', minWidth: '56px', flexShrink: 0 } : {};
        const thumbContainerStyle = isNOPQRVariantThumb ? { borderRadius: '0', border: 'none' } : {};
        return (
          <div key={slot} className={styles.thumb} style={{ ...thumbStyle, ...thumbContainerStyle }}>
            {mediaUrl ? (
              <img src={mediaUrl} alt="" className={styles.thumbImg} style={(isNVariantThumb || isOPQVariantThumb) ? { aspectRatio: '1', objectFit: 'cover', borderRadius: '0' } : 
                                                                          (isPVariantThumb || isRVariantThumb) ? { aspectRatio: '1.91/1', objectFit: 'cover', borderRadius: '0' } : {}} />
            ) : (
              <div className={styles.thumbImg} style={(isNVariantThumb || isOPQVariantThumb) ? { aspectRatio: '1', borderRadius: '0' } : 
                                                      (isPVariantThumb || isRVariantThumb) ? { aspectRatio: '1.91/1', borderRadius: '0' } : {}} />
            )}
          </div>
        );
      case 'thumb-grid':
        return (
          <div key={slot} className={styles.thumbGrid}>
            {[mediaImage, squareImage].slice(0, 4).map((img, idx) => {
              const url = getMediaUrl(img);
              return (
                <div key={idx} className={styles.thumbCell}>
                  {url ? (
                    <img src={url} alt="" className={styles.thumbCellImg} />
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      case 'cta-arrow':
        return (
          <button
            key={slot}
            className={styles.ctaRound}
            disabled={viewOnly}
            aria-disabled={viewOnly}
          >
            <svg className={styles.arrow} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        );
      case 'cta-text':
        const isIVariantCTA = variantKey === 'mobile.landscape.title-desc-biz-textcta';
        const isJVariantCTA = variantKey === 'mobile.landscape.image-plus-whitecard-below';
        const isLVariantCTA = variantKey === 'mobile.landscape.logo-longheadline-biz-textcta';
        const isMVariantCTA = variantKey === 'mobile.landscape.image-logo-title-desc-biz-textcta';
        const ctaTextStyle = isIVariantCTA ? { fontSize: '16px', height: '32px' } : isJVariantCTA ? { fontSize: '20px', color: '#2563eb', fontWeight: '500', alignSelf: 'flex-end' } : (isLVariantCTA || isMVariantCTA) ? { fontSize: '12px' } : {};
        return (
          <button
            key={slot}
            className={styles.ctaText}
            style={ctaTextStyle}
            disabled={viewOnly}
            aria-disabled={viewOnly}
          >
            {isIVariantCTA ? 'Open' : cta}
            <svg className={styles.ctaTextIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        );
      case 'btn-primary':
        const isHVariantBtn = variantKey === 'mobile.landscape.centered-whitecard';
        const isKVariantBtn = variantKey === 'mobile.portrait.dark-hero-biz-title-desc-innerimage-pillcta';
        const isSVariantBtn = variantKey === 'mobile.inline.whitecard-logo-title-desc-biz-cta';
        const isWVariantBtn = variantKey === 'mobile.landscape.video-title-logo-desc-button';
        const btnPrimaryStyle = isEVariantBtn ? { 
          fontSize: '13px', 
          height: '32px', 
          flex: '1', 
          padding: '0 12px',
          background: '#fff',
          color: '#111827',
          borderColor: '#e5e7eb',
          fontWeight: '500'
        } : isHVariantBtn ? {
          width: '80%',
          minWidth: '200px',
          height: '40px',
          fontSize: '14px'
        } : isKVariantBtn ? {
          background: '#fff',
          color: '#2563eb',
          borderRadius: '24px',
          padding: '12px 32px',
          fontSize: '16px',
          fontWeight: '600',
          border: 'none',
          minWidth: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        } : isSVariantBtn ? {
          borderRadius: '24px',
          padding: '12px 24px',
          fontSize: '14px',
          fontWeight: '500',
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        } : {};
        return (
          <button
            key={slot}
            className={`${styles.btn} ${styles.btnPrimary}`}
            style={btnPrimaryStyle}
            disabled={viewOnly}
            aria-disabled={viewOnly}
          >
            {isWVariantBtn ? `${cta} >` : cta}
          </button>
        );
      case 'btn-primary-wide':
        const isYVariantBtnWide = variantKey === 'mobile.sheet.light-logoTitle-desc-video-cta';
        const btnWideStyle = isYVariantBtnWide ? {
          borderRadius: '8px',
          fontWeight: '400',
          fontSize: '14px',
          height: '40px'
        } : {};
        return (
          <button
            key={slot}
            className={`${styles.btnRounded} ${styles.btnPrimaryRounded} ${styles.btnWide}`}
            style={btnWideStyle}
            disabled={viewOnly}
            aria-disabled={viewOnly}
          >
            {isYVariantBtnWide ? `${cta} >` : cta}
          </button>
        );
      case 'btn-ghost':
        const btnGhostStyle = isEVariantBtn ? { 
          fontSize: '13px', 
          height: '32px', 
          flex: '1', 
          padding: '0 12px',
          background: '#f3f4f6',
          color: '#111827',
          borderColor: '#e5e7eb',
          fontWeight: '500'
        } : {};
        return (
          <button
            key={slot}
            className={`${styles.btn} ${styles.btnGhost}`}
            style={btnGhostStyle}
            disabled={viewOnly}
            aria-disabled={viewOnly}
          >
            Close
          </button>
        );
      case 'btn-outline':
        const isNVariantBtn = variantKey === 'mobile.inline.thumb-longheadline-adbiz-button';
        const isOVariantBtn = variantKey === 'mobile.inline.thumb-title-desc-adbiz-button';
        const isPVariantBtn = variantKey === 'mobile.inline.thumb-title-adbiz-button';
        const isQVariantBtn = variantKey === 'mobile.inline.header-title-thumbgrid-desc-adbiz-button';
        const isRVariantBtn = variantKey === 'mobile.inline.header-title-thumb-desc-adbiz-button';
        const isNOPQRBtn = isNVariantBtn || isOVariantBtn || isPVariantBtn || isQVariantBtn || isRVariantBtn;
        const btnOutlineStyle = isNOPQRBtn ? { borderRadius: '0' } : {};
        const btnOutlineFontSize = isNVariantBtn
          ? { fontSize: '11px', padding: '0 8px', height: '16px', lineHeight: '16px' }
          : (isOVariantBtn || isPVariantBtn || isQVariantBtn || isRVariantBtn)
            ? {
                fontSize: '11px',
                padding: isPVariantBtn ? '0 6px' : '0 8px',
                height: '16px',
                lineHeight: '16px',
                minWidth: isPVariantBtn ? '56px' : undefined
              }
            : {};
        return (
          <button
            key={slot}
            className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`}
            style={{ ...btnOutlineStyle, ...btnOutlineFontSize }}
            disabled={viewOnly}
            aria-disabled={viewOnly}
          >
            {cta}
          </button>
        );
      case 'btn-row':
        const isBvariantBtn = variantKey === 'mobile.portrait.hero-logo-title-desc-buttons';
        const isTVariantBtn = variantKey === 'mobile.sheet.logo-title-biz-desc-buttons';
        const btnRowStyle = isBvariantBtn ? { fontSize: '13px', height: '32px', flex: '1', padding: '0 12px' } : 
                           isTVariantBtn ? { fontSize: '14px', height: '44px', flex: '1', padding: '0 16px', borderRadius: '24px' } : {};
        const btnRowContainerStyle = isBvariantBtn ? { justifyContent: 'space-between', gap: '12px' } : 
                                    isTVariantBtn ? { justifyContent: 'space-between', gap: '12px', marginTop: 'auto', paddingTop: '16px' } : {};
        return (
          <div key={slot} className={styles.btnRow} style={btnRowContainerStyle}>
            <button className={`${styles.btn} ${styles.btnGhost}`} style={btnRowStyle} disabled={viewOnly} aria-disabled={viewOnly}>
              Close
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={btnRowStyle} disabled={viewOnly} aria-disabled={viewOnly}>
              {cta}
            </button>
          </div>
        );
      case 'btn-row-check':
        const isXVariantBtnRowCheck = variantKey === 'mobile.sheet.dark-logo-title-desc-videothumb-buttons';
        const btnRowCheckStyle = isXVariantBtnRowCheck ? {
          display: 'flex',
          justifyContent: 'space-between',
          gap: '12px',
          width: '100%'
        } : {};
        const btnCheckStyle = isXVariantBtnRowCheck ? {
          flex: '1',
          fontSize: '14px',
          height: '44px',
          padding: '0 16px',
          borderRadius: '8px'
        } : {};
        const btnGhostCheckStyle = isXVariantBtnRowCheck ? {
          background: '#6b7280',
          color: '#fff',
          border: 'none'
        } : {};
        return (
          <div key={slot} className={styles.btnRow} style={btnRowCheckStyle}>
            <button className={`${styles.btn} ${styles.btnGhost}`} disabled={viewOnly} aria-disabled={viewOnly} style={{ ...btnCheckStyle, ...btnGhostCheckStyle }}>
              <span className={styles.checkIcon}>✓</span>
              Close
            </button>
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={viewOnly} aria-disabled={viewOnly} style={btnCheckStyle}>
              {cta}
            </button>
          </div>
        );
      case 'cta-fab':
        const isUVariantFab = variantKey === 'mobile.inline.inlinebox-title-desc-fab-footer';
        const isVVariantFab = variantKey === 'mobile.inline.darkcard-title-desc-fab-footer';
        const fabStyle = isUVariantFab ? {
          position: 'static',
          marginTop: '0',
          alignSelf: 'flex-start',
          borderRadius: '16px'
        } : isVVariantFab ? {
          position: 'static',
          marginTop: '0',
          alignSelf: 'flex-start'
        } : {
          position: 'absolute',
          right: '16px',
          bottom: '16px'
        };
        return (
          <button
            key={slot}
            className={styles.fab}
            disabled={viewOnly}
            aria-disabled={viewOnly}
            style={fabStyle}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        );
      case 'cta-bar':
        const isGVariantCTA = variantKey === 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar';
        const ctaBarStyle = isGVariantCTA ? {
          borderRadius: '0',
          margin: '0 -16px 0',
          width: 'calc(100% + 32px)',
          height: '48px'
        } : {};
        return (
          <button
            key={slot}
            className={styles.ctaBar}
            style={ctaBarStyle}
            disabled={viewOnly}
            aria-disabled={viewOnly}
          >
            <span className={styles.ctaBarText}>{cta}</span>
            <svg className={styles.ctaBarIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        );
      case 'cta-bar-dark':
        return (
          <div key={slot} className={styles.ctaBarDark}>
            <span className={styles.ctaBarText}>{cta}</span>
            <svg className={styles.ctaBarIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );
      case 'info-icon':
        return (
          <div key={slot} style={{ 
            background: '#bfdbfe', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600'
          }}>i</div>
        );
      case 'close':
        const isGVariantClose = variantKey === 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar';
        const isTVariantClose = variantKey === 'mobile.sheet.logo-title-biz-desc-buttons';
        const closeStyle = isGVariantClose ? {
          background: '#0f265c',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          fontSize: '16px',
          lineHeight: '1'
        } : isTVariantClose ? {
          background: '#f3f4f6',
          color: '#111827',
          border: '1px solid #e5e7eb',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          fontSize: '18px',
          lineHeight: '1',
          fontWeight: '500'
        } : {};
        return (
          <button
            key={slot}
            className={styles.closeBadge}
            style={closeStyle}
            disabled={viewOnly}
            aria-disabled={viewOnly}
          >
            ×
          </button>
        );
      case 'inner-image':
        const isGVariantInner = variantKey === 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar';
        const isKVariantInner = variantKey === 'mobile.portrait.dark-hero-biz-title-desc-innerimage-pillcta';
        const innerImageStyle = isGVariantInner ? {
          borderRadius: '0',
          marginBottom: '4px'
        } : isKVariantInner ? {
          borderRadius: '0',
          border: 'none',
          marginBottom: '8px'
        } : {};
        return (
          <div key={slot} className={styles.innerImage} style={innerImageStyle}>
            {mediaUrl ? (
              <img src={mediaUrl} alt="" className={styles.innerImg} />
            ) : null}
          </div>
        );
      case 'inner-video':
        const isWVariant = variantKey === 'mobile.landscape.video-title-logo-desc-button';
        const isXVariant = variantKey === 'mobile.sheet.dark-logo-title-desc-videothumb-buttons';
        const isYVariant = variantKey === 'mobile.sheet.light-logoTitle-desc-video-cta';
        const isPlayableVideo = (isWVariant || isXVariant || isYVariant) && displayVideoUrl;
        
        if (isPlayableVideo) {
          return (
            <div key={slot} className={styles.videoThumb} style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
              <iframe
                src={displayVideoUrl}
                className={styles.videoIframe}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  borderRadius: '8px'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }
        
        return (
          <div key={slot} className={styles.videoThumb}>
            {videoImageUrl ? (
              <>
                <img src={videoImageUrl} alt="" className={styles.videoImg} />
                <div className={styles.playBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </>
            ) : mediaUrl ? (
              <>
                <img src={mediaUrl} alt="" className={styles.videoImg} />
                <div className={styles.playBadge}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </>
            ) : null}
          </div>
        );
      case 'logo-title':
        const isXVariantLogoTitle = variantKey === 'mobile.sheet.dark-logo-title-desc-videothumb-buttons';
        const isYVariantLogoTitle = variantKey === 'mobile.sheet.light-logoTitle-desc-video-cta';
        const isXYVariantLogoTitle = isXVariantLogoTitle || isYVariantLogoTitle;
        const buildLogoTitleStyle = (): Record<string, any> => {
          let style: Record<string, any> = isXVariantLogoTitle
            ? { fontSize: '32px', fontWeight: 700, color: '#fff' }
            : isYVariantLogoTitle
              ? { fontSize: '32px', fontWeight: 700 }
              : {};

          if (isXYVariantLogoTitle) {
            style = {
              ...style,
              whiteSpace: 'normal',
              overflowWrap: 'anywhere'
            };
            style = adjustFontSizeForText(style, title, 30, {
              medium: 40,
              large: 70,
              mediumFactor: 0.7,
              largeFactor: 0.5
            });
            style = applyLineClamp(style, 2);
          }
          return style;
        };
        return (
          <div key={slot} className={styles.logoTitleRow}>
            {logoUrl ? (
              <img src={logoUrl} alt="" className={styles.logoImg} style={isXYVariantLogoTitle ? { width: '80px', height: '80px', borderRadius: '0', objectFit: 'cover' } : { width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} />
            ) : (
              <div className={styles.logo} style={isXYVariantLogoTitle ? { width: '80px', height: '80px', borderRadius: '0' } : {}}>
                <span className={styles.logoText}>LOGO</span>
              </div>
            )}
            {title && <div className={styles.headlineLT} style={buildLogoTitleStyle()}>{title}</div>}
          </div>
        );
      case 'logo-float':
        const isKVariantLogo = variantKey === 'mobile.portrait.dark-hero-biz-title-desc-innerimage-pillcta';
        return logoUrl ? (
          <div key={slot} className={styles.logoFloat} style={isKVariantLogo ? { position: 'static' } : {}}>
            <img src={logoUrl} alt="" className={styles.logoImg} style={{ width: isKVariantLogo ? '64px' : '44px', height: isKVariantLogo ? '64px' : '44px', borderRadius: isKVariantLogo ? '0' : '8px', objectFit: 'cover' }} />
          </div>
        ) : null;
      case 'dash-divider':
        const isJVariantDivider = variantKey === 'mobile.landscape.image-plus-whitecard-below';
        const dividerStyle = isJVariantDivider ? { width: 'calc(100% + 32px)', margin: '0 -16px', height: '1px' } : {};
        return <div key={slot} className={styles.dashDivider} style={dividerStyle} />;
      case 'info':
        return (
          <div key={slot} className={styles.infoDot}>
            i
          </div>
        );
      default:
        return null;
    }
  };

  const renderBody = () => {
    if (!config.body) return null;
    const { cols, rows } = config.body;
    const isStandardFrame = STANDARD_FRAME_VARIANTS.includes(variantKey);
    const isAVariant = variantKey === 'mobile.landscape.image-headline-logo-desc-arrow';
    const isCVariant = variantKey === 'mobile.landscape.logo-headline-arrow';
    const isDVariant = variantKey === 'mobile.landscape.overlay-headline-desc-business-arrow';
    const isIVariant = variantKey === 'mobile.landscape.title-desc-biz-textcta';
    const isMVariant = variantKey === 'mobile.landscape.image-logo-title-desc-biz-textcta';
    const isNVariant = variantKey === 'mobile.inline.thumb-longheadline-adbiz-button';
    const isOVariant = variantKey === 'mobile.inline.thumb-title-desc-adbiz-button';
    const isPVariant = variantKey === 'mobile.inline.thumb-title-adbiz-button';
    const isQVariant = variantKey === 'mobile.inline.header-title-thumbgrid-desc-adbiz-button';
    const isRVariant = variantKey === 'mobile.inline.header-title-thumb-desc-adbiz-button';
    const isSVariant = variantKey === 'mobile.inline.whitecard-logo-title-desc-biz-cta';
    const isBVariant = variantKey === 'mobile.portrait.hero-logo-title-desc-buttons';
    const isWVariant = variantKey === 'mobile.landscape.video-title-logo-desc-button';
    const isNOPQRVariant = isNVariant || isOVariant || isPVariant || isQVariant || isRVariant;
    const bodyStyle: any = {};
    
    if (isWVariant) {
      bodyStyle.gap = '4px';
    }

    if (isStandardFrame) {
      bodyStyle.padding = '12px';
      bodyStyle.flexGrow = 4;
      bodyStyle.flexBasis = '36.36%';
      bodyStyle.flexShrink = 0;
      if (isAVariant) {
        bodyStyle.gap = '6px';
      } else if (isCVariant) {
        bodyStyle.padding = '16px 12px';
      } else if (isDVariant) {
        bodyStyle.padding = '10px 12px';
        bodyStyle.gap = '4px';
        bodyStyle.display = 'grid';
        bodyStyle.gridTemplateColumns = cols.join(' ');
        bodyStyle.gridTemplateRows = `repeat(${rows.length}, auto)`;
      } else if (isIVariant) {
        bodyStyle.padding = '10px 12px';
        bodyStyle.gap = '4px';
        bodyStyle.display = 'grid';
        bodyStyle.gridTemplateColumns = cols.join(' ');
        bodyStyle.gridTemplateRows = `repeat(${rows.length}, auto)`;
      } else if (isMVariant) {
        bodyStyle.padding = '10px 12px';
        bodyStyle.gap = '4px';
        bodyStyle.display = 'grid';
        bodyStyle.gridTemplateColumns = cols.join(' ');
        bodyStyle.gridTemplateRows = `repeat(${rows.length}, auto)`;
      }
    }
    
    if (isBVariant) {
      const logoSlot = renderSlot('logo');
      const titleSlot = renderSlot('title');
      const descSlot = renderSlot('desc');
      const btnRowSlot = renderSlot('btn-row');
      return (
        <div
          className={styles.body}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            flex: '0 0 50%',
            maxHeight: '50%',
            minHeight: '50%',
            overflow: 'hidden'
          }}
        >
          {logoSlot && <div style={{ flexShrink: 0 }}>{logoSlot}</div>}
          {(titleSlot || descSlot) && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                flex: 1,
                minHeight: 0
              }}
            >
              {titleSlot && <div style={{ flexShrink: 0 }}>{titleSlot}</div>}
              {descSlot && <div style={{ flexShrink: 0 }}>{descSlot}</div>}
            </div>
          )}
          {btnRowSlot && (
            <div style={{ marginTop: 'auto', flexShrink: 0 }}>
              {btnRowSlot}
            </div>
          )}
        </div>
      );
    }
    
    if (isDVariant) {
      const gridItems: Array<{ slot: string; gridColumn: string; gridRow: string }> = [];
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell !== '') {
            const gridColumn = `${colIdx + 1} / ${colIdx + 2}`;
            let gridRow = `${rowIdx + 1} / ${rowIdx + 2}`;
            if (cell === 'cta-arrow') {
              gridRow = `1 / ${rows.length + 1}`;
            }
            gridItems.push({ slot: cell, gridColumn, gridRow });
          }
        });
      });
      
      return (
        <div className={styles.body} style={bodyStyle}>
          {gridItems.map((item, idx) => {
            const cellStyle: any = {
              gridColumn: item.gridColumn,
              gridRow: item.gridRow
            };
            if (item.slot === 'cta-arrow') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.justifyContent = 'center';
            }
            return (
              <div key={idx} style={cellStyle}>
                {renderSlot(item.slot)}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (isMVariant) {
      const gridItems: Array<{ slot: string; gridColumn: string; gridRow: string }> = [];
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell !== '') {
            const gridColumn = `${colIdx + 1} / ${colIdx + 2}`;
            let gridRow = `${rowIdx + 1} / ${rowIdx + 2}`;
            if (cell === 'logo') {
              gridRow = `1 / 3`;
            } else if (cell === 'title') {
              gridRow = `1 / 2`;
            } else if (cell === 'desc') {
              gridRow = `2 / 3`;
            }
            gridItems.push({ slot: cell, gridColumn, gridRow });
          }
        });
      });
      
      return (
        <div className={styles.body} style={bodyStyle}>
          {gridItems.map((item, idx) => {
            const cellStyle: any = {
              gridColumn: item.gridColumn,
              gridRow: item.gridRow
            };
            if (item.slot === 'title' || item.slot === 'desc') {
              cellStyle.display = 'flex';
              cellStyle.flexDirection = 'column';
              cellStyle.justifyContent = 'center';
            }
            if (item.slot === 'logo') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.justifyContent = 'flex-start';
            }
            if (item.slot === 'biz' || item.slot === 'cta-text') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
            }
            return (
              <div key={idx} style={cellStyle}>
                {renderSlot(item.slot)}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (isOVariant || isPVariant) {
      const gridItems: Array<{ slot: string; gridColumn: string; gridRow: string }> = [];
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell !== '') {
            let gridColumn = `${colIdx + 1} / ${colIdx + 2}`;
            let gridRow = `${rowIdx + 1} / ${rowIdx + 2}`;
            if (cell === 'thumb') {
              gridRow = `1 / ${rows.length + 1}`;
            } else if (cell === 'title') {
              gridRow = `1 / 2`;
            } else if (cell === 'desc') {
              gridRow = `2 / 3`;
            } else if (cell === 'ad-biz') {
              gridRow = isOVariant ? `3 / 4` : isPVariant ? `3 / 4` : `2 / 3`;
            } else if (cell === 'btn-outline') {
              gridRow = isOVariant ? `3 / 4` : isPVariant ? `3 / 4` : `2 / 3`;
              gridColumn = `3 / 4`;
            }
            gridItems.push({ slot: cell, gridColumn, gridRow });
          }
        });
      });
      
      return (
        <div className={styles.body} style={{ ...bodyStyle, display: 'grid', gridTemplateColumns: cols.join(' '), gridTemplateRows: `repeat(${rows.length}, auto)`, gap: '10px', alignItems: 'start', position: 'relative', padding: '12px' }}>
          {gridItems.map((item, idx) => {
            const cellStyle: any = {
              gridColumn: item.gridColumn,
              gridRow: item.gridRow
            };
            if (item.slot === 'thumb') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
            }
            if (item.slot === 'title') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
              cellStyle.flexDirection = 'column';
              cellStyle.justifyContent = 'flex-start';
              cellStyle.height = isOVariant ? '16px' : '24px';
              cellStyle.overflow = 'hidden';
              cellStyle.lineHeight = '16px';
              if (isPVariant) {
                cellStyle.marginBottom = '-4px';
              }
            }
            if (item.slot === 'desc') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
              cellStyle.height = '14px';
              cellStyle.overflow = 'hidden';
              cellStyle.lineHeight = '14px';
              if (isPVariant) {
                cellStyle.marginTop = '-4px';
              }
            }
            if (item.slot === 'ad-biz') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.gap = '4px';
              cellStyle.flexDirection = 'row';
              cellStyle.height = '16px';
            }
            if (item.slot === 'btn-outline') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.justifyContent = 'flex-end';
              cellStyle.height = '16px';
              if (isPVariant) {
                cellStyle.marginLeft = '-4px';
              }
            }
            return (
              <div key={idx} style={cellStyle}>
                {renderSlot(item.slot)}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (isQVariant || isRVariant) {
      const gridItems: Array<{ slot: string; gridColumn: string; gridRow: string }> = [];
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell !== '') {
            let gridColumn = `${colIdx + 1} / ${colIdx + 2}`;
            let gridRow = `${rowIdx + 1} / ${rowIdx + 2}`;
            if (cell === 'thumb') {
              gridRow = `1 / ${rows.length + 1}`;
            } else if (cell === 'desc') {
              gridRow = `1 / 2`;
              gridColumn = `2 / 3`;
            } else if (cell === 'ad-biz') {
              gridRow = `2 / 3`;
              gridColumn = `2 / 3`;
            } else if (cell === 'btn-outline') {
              gridRow = `2 / 3`;
              gridColumn = `3 / 4`;
            }
            gridItems.push({ slot: cell, gridColumn, gridRow });
          }
        });
      });
      
      return (
        <div className={styles.body} style={{ ...bodyStyle, display: 'grid', gridTemplateColumns: cols.join(' '), gridTemplateRows: `repeat(${rows.length}, auto)`, gap: '12px', alignItems: 'start', position: 'relative', padding: '12px', paddingTop: '4px' }}>
          {gridItems.map((item, idx) => {
            const cellStyle: any = {
              gridColumn: item.gridColumn,
              gridRow: item.gridRow
            };
            if (item.slot === 'thumb') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
            }
            if (item.slot === 'desc') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
              cellStyle.flexDirection = 'column';
              cellStyle.justifyContent = 'flex-start';
              cellStyle.height = '14px';
              cellStyle.overflow = 'hidden';
              cellStyle.lineHeight = '14px';
            }
            if (item.slot === 'ad-biz') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.gap = '4px';
              cellStyle.flexDirection = 'row';
              cellStyle.height = '16px';
            }
            if (item.slot === 'btn-outline') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.justifyContent = 'flex-end';
              cellStyle.height = '16px';
            }
            return (
              <div key={idx} style={cellStyle}>
                {renderSlot(item.slot)}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (isNVariant) {
      const gridItems: Array<{ slot: string; gridColumn: string; gridRow: string }> = [];
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell !== '') {
            let gridColumn = `${colIdx + 1} / ${colIdx + 2}`;
            let gridRow = `${rowIdx + 1} / ${rowIdx + 2}`;
            if (cell === 'thumb') {
              gridRow = `1 / ${rows.length + 1}`;
            } else if (cell === 'longHeadline') {
              gridRow = `1 / 2`;
            } else if (cell === 'ad-biz') {
              gridRow = `2 / 3`;
            } else if (cell === 'btn-outline') {
              gridRow = `2 / 3`;
              gridColumn = `3 / 4`;
            }
            gridItems.push({ slot: cell, gridColumn, gridRow });
          }
        });
      });
      
      return (
        <div className={styles.body} style={{ ...bodyStyle, display: 'grid', gridTemplateColumns: cols.join(' '), gridTemplateRows: `repeat(${rows.length}, auto)`, gap: '12px', alignItems: 'start', position: 'relative', padding: '12px' }}>
          {gridItems.map((item, idx) => {
            const cellStyle: any = {
              gridColumn: item.gridColumn,
              gridRow: item.gridRow
            };
            if (item.slot === 'thumb') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
            }
            if (item.slot === 'longHeadline') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
              cellStyle.flexDirection = 'column';
              cellStyle.justifyContent = 'flex-start';
              cellStyle.height = '36px';
              cellStyle.overflow = 'hidden';
            }
            if (item.slot === 'ad-biz') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.gap = '4px';
              cellStyle.flexDirection = 'row';
              cellStyle.height = '16px';
              cellStyle.marginTop = '-4px';
            }
            if (item.slot === 'btn-outline') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.justifyContent = 'flex-end';
              cellStyle.marginTop = '-4px';
              cellStyle.height = '16px';
            }
            return (
              <div key={idx} style={cellStyle}>
                {renderSlot(item.slot)}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (isSVariant) {
      const gridItems: Array<{ slot: string; gridColumn: string; gridRow: string }> = [];
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell !== '') {
            let gridColumn = `${colIdx + 1} / ${colIdx + 2}`;
            let gridRow = `${rowIdx + 1} / ${rowIdx + 2}`;
            if (cell === 'desc' || cell === 'biz' || cell === 'btn-primary') {
              gridColumn = `1 / -1`;
            }
            gridItems.push({ slot: cell, gridColumn, gridRow });
          }
        });
      });
      
      return (
        <div className={styles.body} style={{ ...bodyStyle, display: 'grid', gridTemplateColumns: cols.join(' '), gridTemplateRows: `repeat(${rows.length}, auto)`, gap: '12px', alignItems: 'start', padding: '16px' }}>
          {gridItems.map((item, idx) => {
            const cellStyle: any = {
              gridColumn: item.gridColumn,
              gridRow: item.gridRow
            };
            if (item.slot === 'logo') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.justifyContent = 'flex-start';
            }
            if (item.slot === 'title') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
              cellStyle.marginTop = '8px';
            }
            if (item.slot === 'desc' || item.slot === 'biz') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'flex-start';
              cellStyle.justifyContent = 'flex-start';
            }
            if (item.slot === 'btn-primary') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.justifyContent = 'center';
              cellStyle.marginTop = '8px';
            }
            return (
              <div key={idx} style={cellStyle}>
                {renderSlot(item.slot)}
              </div>
            );
          })}
        </div>
      );
    }
    
    if (isIVariant) {
      const gridItems: Array<{ slot: string; gridColumn: string; gridRow: string }> = [];
      rows.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          if (cell !== '') {
            const gridColumn = `${colIdx + 1} / ${colIdx + 2}`;
            const gridRow = `${rowIdx + 1} / ${rowIdx + 2}`;
            gridItems.push({ slot: cell, gridColumn, gridRow });
          }
        });
      });
      
      return (
        <div className={styles.body} style={bodyStyle}>
          {gridItems.map((item, idx) => {
            const cellStyle: any = {
              gridColumn: item.gridColumn,
              gridRow: item.gridRow
            };
            if (item.slot === 'cta-text') {
              cellStyle.display = 'flex';
              cellStyle.alignItems = 'center';
              cellStyle.justifyContent = 'center';
            }
            return (
              <div key={idx} style={cellStyle}>
                {renderSlot(item.slot)}
              </div>
            );
          })}
        </div>
      );
    }
    
    return (
      <div className={styles.body} style={bodyStyle}>
        {rows.map((row: string[], rowIdx: number) => {
          const nonEmptyCells = row.filter(c => c !== '');
          const isEmptyRow = nonEmptyCells.length === 0;
          
          if (isEmptyRow) return null;
          
          const shouldUseFullRow = nonEmptyCells.length === 1 && row.length > 1;
          const rowCols = shouldUseFullRow ? ['1fr'] : cols;
          
          return (
            <div key={rowIdx} className={styles.row} style={{ gridTemplateColumns: rowCols.join(' ') }}>
              {row.map((cell, cellIdx) => {
                const isEmpty = cell === '';
                if (isEmpty) return <div key={cellIdx} className={styles.cell} />;
                
                const shouldSpan = shouldUseFullRow && cellIdx === row.findIndex(c => c !== '');
                
                return (
                  <div 
                    key={cellIdx} 
                    className={styles.cell}
                    style={shouldSpan ? { gridColumn: `1 / -1` } : {}}
                  >
                    {renderSlot(cell)}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  const renderHeader = () => {
    if (!config.header) return null;
    const isQRVariantHeader = variantKey === 'mobile.inline.header-title-thumbgrid-desc-adbiz-button' ||
                              variantKey === 'mobile.inline.header-title-thumb-desc-adbiz-button';
    const headerStyle = isQRVariantHeader ? { marginBottom: '2px', paddingBottom: '8px' } : {};
    return (
      <div className={styles.header} style={headerStyle}>
        {config.header.slots.map((slot: string) => renderSlot(slot))}
      </div>
    );
  };

  const renderPanel = () => {
    if (!config.panel) return null;
    const { type, slots, position, infoPosition, pattern } = config.panel;
    const panelSlots = slots.map((slot: string) => renderSlot(slot)).filter(Boolean);

    if (type === 'whiteCard') {
      const panelClass = position === 'below' ? styles.whiteBelow : styles.heroPanel;
      const positionClass = position === 'center' ? styles.heroCenter : position === 'below' ? '' : styles.heroBottom;
      const isBvariant = variantKey === 'mobile.portrait.hero-logo-title-desc-buttons';
      const isHVariant = variantKey === 'mobile.landscape.centered-whitecard';
      const isJVariant = variantKey === 'mobile.landscape.image-plus-whitecard-below';
      const panelStyle = isBvariant && position === 'below' ? { 
        margin: '0', 
        borderRadius: '0', 
        border: 'none', 
        boxShadow: 'none', 
        flexGrow: 1, 
        flexBasis: '45%',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        padding: '24px 16px',
        minHeight: 0
      } : isJVariant && position === 'below' ? {
        margin: '0',
        borderRadius: '0',
        border: 'none',
        boxShadow: 'none',
        flexGrow: 1,
        flexBasis: '65%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        padding: '20px 16px',
        gap: '12px',
        minHeight: 0
      } : isHVariant && position === 'center' ? {
        width: 'calc(100% - 48px)',
        maxWidth: 'calc(100% - 48px)',
        height: 'calc(100% - 48px)',
        maxHeight: 'calc(100% - 48px)',
        aspectRatio: '1',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px',
        gap: '12px'
      } : {};
      
      if (isHVariant && position === 'center') {
        const getPanelSlot = (slotName: string) => {
          const idx = config.panel?.slots.indexOf(slotName) ?? -1;
          return idx >= 0 ? panelSlots[idx] : null;
        };
        const logoSlot = getPanelSlot('logo');
        const titleSlot = getPanelSlot('title');
        const descSlot = getPanelSlot('desc');
        const btnPrimarySlot = getPanelSlot('btn-primary');

        return (
          <div className={`${panelClass} ${positionClass}`} style={{ ...panelStyle, overflow: 'hidden', justifyContent: 'space-between', alignItems: 'center' }}>
            {config.panel.info === 'inside' && config.media?.info && (
              <div className={styles.infoBadgePanel}>i</div>
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                justifyContent: 'space-between',
                gap: '12px',
                width: '100%',
                height: '100%',
                minHeight: 0
              }}
            >
              {logoSlot && (
                <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  {logoSlot}
                </div>
              )}
              {(titleSlot || descSlot) && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    flex: 1,
                    minHeight: 0,
                    width: '100%',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    padding: '8px 0'
                  }}
                >
                  {titleSlot && <div style={{ width: '100%', flexShrink: 0 }}>{titleSlot}</div>}
                  {descSlot && <div style={{ width: '100%', flexShrink: 0 }}>{descSlot}</div>}
                </div>
              )}
              {btnPrimarySlot && (
                <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
                  {btnPrimarySlot}
                </div>
              )}
            </div>
          </div>
        );
      }

      if (isJVariant && position === 'below') {
        const getPanelSlot = (slotName: string) => {
          const idx = config.panel?.slots.indexOf(slotName) ?? -1;
          return idx >= 0 ? panelSlots[idx] : null;
        };
        const logoSlot = getPanelSlot('logo');
        const titleSlot = getPanelSlot('titleXL');
        const descSlot = getPanelSlot('desc');
        const bizSlot = getPanelSlot('biz');
        const dividerSlot = getPanelSlot('dash-divider');
        const ctaSlot = getPanelSlot('cta-text');

        return (
          <div className={`${panelClass} ${positionClass}`} style={{ ...panelStyle, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {config.panel.info === 'inside' && config.media?.info && (
              <div className={styles.infoBadgePanel}>i</div>
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                flex: 1,
                minHeight: 0
              }}
            >
              {logoSlot && (
                <div style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
                  {logoSlot}
                </div>
              )}
              {(titleSlot || descSlot || bizSlot) && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    flex: 1,
                    minHeight: 0,
                    overflow: 'hidden'
                  }}
                >
                  {titleSlot && <div style={{ flexShrink: 0 }}>{titleSlot}</div>}
                  {descSlot && <div style={{ flexShrink: 0 }}>{descSlot}</div>}
                  {bizSlot && <div style={{ flexShrink: 0 }}>{bizSlot}</div>}
                </div>
              )}
              {(dividerSlot || ctaSlot) && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    flexShrink: 0,
                    marginTop: 'auto'
                  }}
                >
                  {dividerSlot && <div style={{ flexShrink: 0 }}>{dividerSlot}</div>}
                  {ctaSlot && <div style={{ flexShrink: 0, alignSelf: 'flex-end' }}>{ctaSlot}</div>}
                </div>
              )}
            </div>
          </div>
        );
      }
      
      return (
        <div className={`${panelClass} ${positionClass}`} style={panelStyle}>
          {config.panel.info === 'inside' && config.media?.info && (
            <div className={styles.infoBadgePanel}>i</div>
          )}
          {panelSlots.map((slot: any, idx: number) => {
            const slotElement = slot;
            const slotType = config.panel?.slots[idx];
            let itemStyle: any = {};
            
            if (isJVariant && position === 'below') {
              if (slotType === 'dash-divider') {
                itemStyle = { width: 'calc(100% + 32px)', margin: '0 -16px', alignSelf: 'stretch', height: '1px', flexShrink: 0 };
              } else if (slotType === 'cta-text') {
                itemStyle = { alignSelf: 'flex-end', flexShrink: 0 };
              } else if (slotType === 'logo') {
                itemStyle = { alignSelf: 'flex-start', flexShrink: 0 };
              } else if (slotType === 'titleXL' || slotType === 'desc' || slotType === 'biz') {
                itemStyle = { textAlign: 'left', alignSelf: 'flex-start', width: '100%', flexShrink: 0 };
              }
            } else if (isHVariant && idx === 0) {
              itemStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '4px' };
            } else if (isHVariant) {
              itemStyle = { marginTop: idx > 0 ? '8px' : '0' };
            }
            
            return (
              <div key={idx} className={position === 'below' ? styles.whiteBelowItem : styles.heroItem} style={itemStyle}>
                {slotElement}
              </div>
            );
          })}
        </div>
      );
    }

    if (type === 'darkOverlay') {
      const isEVariant = variantKey === 'mobile.portrait.dark-hero-title-desc-biz-buttons';
      const isKVariant = variantKey === 'mobile.portrait.dark-hero-biz-title-desc-innerimage-pillcta';
      const overlayStyle = isEVariant ? {
        justifyContent: 'flex-end',
        paddingBottom: '24px',
        paddingTop: '20px'
      } : isKVariant ? {
        justifyContent: 'space-between',
        paddingBottom: '24px',
        paddingTop: '20px',
        alignItems: 'center'
      } : {};
      
      if (isEVariant && slots.includes('btn-ghost') && slots.includes('btn-primary')) {
        const btnGhostIndex = slots.indexOf('btn-ghost');
        const btnPrimaryIndex = slots.indexOf('btn-primary');
        const btnRowSlots = [panelSlots[btnGhostIndex], panelSlots[btnPrimaryIndex]];
        const otherSlots = panelSlots.filter((_: any, idx: number) => idx !== btnGhostIndex && idx !== btnPrimaryIndex);
        
        return (
          <div className={styles.darkOverlay} style={overlayStyle}>
            {otherSlots.map((slot: any, idx: number) => (
              <div key={idx} className={styles.overlayItem}>{slot}</div>
            ))}
            <div className={styles.overlayItem} style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '8px' }}>
              {btnRowSlots}
            </div>
          </div>
        );
      }
      
      if (isKVariant) {
        const logoFloatIndex = slots.indexOf('logo-float');
        const btnPrimaryIndex = slots.indexOf('btn-primary');
        const logoFloatSlot = logoFloatIndex >= 0 ? panelSlots[logoFloatIndex] : null;
        const btnPrimarySlot = btnPrimaryIndex >= 0 ? panelSlots[btnPrimaryIndex] : null;
        const otherSlots = panelSlots.filter((_: any, idx: number) => idx !== logoFloatIndex && idx !== btnPrimaryIndex);
        
        return (
          <div className={styles.darkOverlay} style={overlayStyle}>
            {infoPosition === 'bottom-left' && (
              <div className={styles.infoBadgeBL}>i</div>
            )}
            {otherSlots.map((slot: any, idx: number) => (
              <div key={idx} className={styles.overlayItem}>{slot}</div>
            ))}
            {logoFloatSlot && (
              <div style={{ position: 'absolute', bottom: '120px', right: '24px', zIndex: 10 }}>{logoFloatSlot}</div>
            )}
            <div className={styles.overlayItem} style={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingTop: '20px', position: 'relative' }}>
              {btnPrimarySlot}
            </div>
          </div>
        );
      }
      
      return (
        <div className={styles.darkOverlay} style={overlayStyle}>
          {panelSlots.map((slot: any, idx: number) => (
            <div key={idx} className={styles.overlayItem}>{slot}</div>
          ))}
        </div>
      );
    }

    if (type === 'lightSheet') {
      const isGVariant = variantKey === 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar';
      const isTVariant = variantKey === 'mobile.sheet.logo-title-biz-desc-buttons';
      const isYVariant = variantKey === 'mobile.sheet.light-logoTitle-desc-video-cta';
      const sheetClass = pattern ? styles.lightSheetPattern : styles.lightSheet;
      const sheetStyle = isGVariant ? {
        background: '#f0f9ff',
        padding: '16px',
        gap: '12px',
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        position: 'relative'
      } : isTVariant ? {
        background: '#f0f9ff',
        padding: '20px 16px',
        gap: '12px',
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        position: 'relative'
      } : {};
      
      if (isYVariant) {
        const logoTitleIndex = slots.indexOf('logo-title');
        const descIndex = slots.indexOf('desc');
        const innerVideoIndex = slots.indexOf('inner-video');
        const btnPrimaryWideIndex = slots.indexOf('btn-primary-wide');
        
        const logoTitleSlot = logoTitleIndex >= 0 ? panelSlots[logoTitleIndex] : null;
        const descSlot = descIndex >= 0 ? panelSlots[descIndex] : null;
        const innerVideoSlot = innerVideoIndex >= 0 ? panelSlots[innerVideoIndex] : null;
        const btnPrimaryWideSlot = btnPrimaryWideIndex >= 0 ? panelSlots[btnPrimaryWideIndex] : null;
        
        return (
          <div className={sheetClass} style={{
            gap: '40px',
            justifyContent: 'space-between',
            padding: '32px 20px 32px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {infoPosition === 'top-right' && (
              <div className={styles.infoBadgeTR}>i</div>
            )}
            {logoTitleSlot && <div className={styles.sheetItem}>{logoTitleSlot}</div>}
            {descSlot && <div className={styles.sheetItem}>{descSlot}</div>}
            {innerVideoSlot && <div className={styles.sheetItem} style={{ flex: '1', display: 'flex', alignItems: 'center' }}>{innerVideoSlot}</div>}
            {btnPrimaryWideSlot && <div className={styles.sheetItem} style={{ marginTop: 'auto' }}>{btnPrimaryWideSlot}</div>}
          </div>
        );
      }
      
      if (isGVariant) {
        const ctaBarIndex = slots.indexOf('cta-bar');
        const closeIndex = slots.indexOf('close');
        const infoIconIndex = slots.indexOf('info-icon');
        const logoIndex = slots.indexOf('logo');
        const bizIndex = slots.indexOf('biz');
        const titleXLIndex = slots.indexOf('titleXL');
        const descIndex = slots.indexOf('desc');
        const innerImageIndex = slots.indexOf('inner-image');
        
        const ctaBarSlot = ctaBarIndex >= 0 ? panelSlots[ctaBarIndex] : null;
        const closeSlot = closeIndex >= 0 ? panelSlots[closeIndex] : null;
        const infoIconSlot = infoIconIndex >= 0 ? panelSlots[infoIconIndex] : null;
        const logoSlot = logoIndex >= 0 ? panelSlots[logoIndex] : null;
        const bizSlot = bizIndex >= 0 ? panelSlots[bizIndex] : null;
        const titleXLSlot = titleXLIndex >= 0 ? panelSlots[titleXLIndex] : null;
        const descSlot = descIndex >= 0 ? panelSlots[descIndex] : null;
        const innerImageSlot = innerImageIndex >= 0 ? panelSlots[innerImageIndex] : null;
        
        return (
          <div className={sheetClass} style={sheetStyle}>
            {infoIconSlot && (
              <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 10 }}>{infoIconSlot}</div>
            )}
            {closeSlot && (
              <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>{closeSlot}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '44px', marginBottom: '16px' }}>
              {logoSlot}
              {bizSlot}
            </div>
            {titleXLSlot && <div className={styles.sheetItem} style={{ marginBottom: '8px' }}>{titleXLSlot}</div>}
            {descSlot && <div className={styles.sheetItem} style={{ marginBottom: '12px' }}>{descSlot}</div>}
            {innerImageSlot && <div className={styles.sheetItem}>{innerImageSlot}</div>}
            {ctaBarSlot && (
              <div style={{ marginTop: 'auto', paddingTop: '4px', marginBottom: '0' }}>{ctaBarSlot}</div>
            )}
          </div>
        );
      }
      
      if (isTVariant) {
        const btnRowIndex = slots.indexOf('btn-row');
        const closeIndex = slots.indexOf('close');
        const logoIndex = slots.indexOf('logo');
        const titleXLIndex = slots.indexOf('titleXL');
        const bizIndex = slots.indexOf('biz');
        const descIndex = slots.indexOf('desc');
        
        const btnRowSlot = btnRowIndex >= 0 ? panelSlots[btnRowIndex] : null;
        const closeSlot = closeIndex >= 0 ? panelSlots[closeIndex] : null;
        const logoSlot = logoIndex >= 0 ? panelSlots[logoIndex] : null;
        const titleXLSlot = titleXLIndex >= 0 ? panelSlots[titleXLIndex] : null;
        const bizSlot = bizIndex >= 0 ? panelSlots[bizIndex] : null;
        const descSlot = descIndex >= 0 ? panelSlots[descIndex] : null;
        
        return (
          <div className={sheetClass} style={sheetStyle}>
            {infoPosition === 'bottom-left' && (
              <div className={styles.infoBadgeBL}>i</div>
            )}
            {closeSlot && (
              <div style={{ position: 'absolute', top: '20px', right: '16px', zIndex: 10 }}>{closeSlot}</div>
            )}
            {logoSlot && (
              <div className={styles.sheetItem} style={{ marginBottom: '16px' }}>{logoSlot}</div>
            )}
            {titleXLSlot && (
              <div className={styles.sheetItem} style={{ marginBottom: '12px' }}>{titleXLSlot}</div>
            )}
            {bizSlot && (
              <div className={styles.sheetItem} style={{ marginBottom: '8px' }}>{bizSlot}</div>
            )}
            {descSlot && (
              <div className={styles.sheetItem}>{descSlot}</div>
            )}
            {btnRowSlot && (
              <div style={{ marginTop: 'auto', paddingTop: '16px' }}>{btnRowSlot}</div>
            )}
          </div>
        );
      }
      
      return (
        <div className={sheetClass} style={sheetStyle}>
          {infoPosition === 'top-right' && !isGVariant && (
            <div className={styles.infoBadgeTR}>i</div>
          )}
          {infoPosition === 'bottom-left' && !isGVariant && (
            <div className={styles.infoBadgeBL}>i</div>
          )}
          {panelSlots.map((slot: any, idx: number) => (
            <div key={idx} className={styles.sheetItem}>{slot}</div>
          ))}
        </div>
      );
    }

    if (type === 'darkSheet') {
      const isXVariantDarkSheet = variantKey === 'mobile.sheet.dark-logo-title-desc-videothumb-buttons';
      if (isXVariantDarkSheet) {
        const logoTitleIndex = slots.indexOf('logo-title');
        const descIndex = slots.indexOf('desc');
        const innerVideoIndex = slots.indexOf('inner-video');
        const btnRowCheckIndex = slots.indexOf('btn-row-check');
        
        const logoTitleSlot = logoTitleIndex >= 0 ? panelSlots[logoTitleIndex] : null;
        const descSlot = descIndex >= 0 ? panelSlots[descIndex] : null;
        const innerVideoSlot = innerVideoIndex >= 0 ? panelSlots[innerVideoIndex] : null;
        const btnRowCheckSlot = btnRowCheckIndex >= 0 ? panelSlots[btnRowCheckIndex] : null;
        
        return (
          <div className={styles.darkSheet} style={{
            gap: '32px',
            justifyContent: 'space-between',
            padding: '32px 20px 32px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {infoPosition === 'top-left' && (
              <div className={styles.infoBadgeTL}>i</div>
            )}
            {infoPosition === 'bottom-left' && (
              <div className={styles.infoBadgeBL}>i</div>
            )}
            {logoTitleSlot && <div className={styles.sheetItem}>{logoTitleSlot}</div>}
            {descSlot && <div className={styles.sheetItem}>{descSlot}</div>}
            {innerVideoSlot && <div className={styles.sheetItem} style={{ flex: '1', display: 'flex', alignItems: 'center' }}>{innerVideoSlot}</div>}
            {btnRowCheckSlot && <div className={styles.sheetItem} style={{ marginTop: 'auto' }}>{btnRowCheckSlot}</div>}
          </div>
        );
      }
      const darkSheetStyle = {};
      return (
        <div className={styles.darkSheet} style={darkSheetStyle}>
          {infoPosition === 'top-left' && (
            <div className={styles.infoBadgeTL}>i</div>
          )}
          {panelSlots.map((slot: any, idx: number) => (
            <div key={idx} className={styles.sheetItem}>{slot}</div>
          ))}
        </div>
      );
    }

    if (type === 'darkSheet' && config.panel.infoPosition === 'top-left') {
      return (
        <div className={styles.darkSheetSimple}>
          <div className={styles.infoBadgeTL}>i</div>
          {panelSlots.map((slot: any, idx: number) => (
            <div key={idx} className={styles.sheetItem}>{slot}</div>
          ))}
        </div>
      );
    }

    if (type === 'inlineBox') {
      const isUVariant = variantKey === 'mobile.inline.inlinebox-title-desc-fab-footer';
      if (isUVariant) {
        const titleXLIndex = slots.indexOf('titleXL');
        const descIndex = slots.indexOf('desc');
        const fabIndex = slots.indexOf('cta-fab');
        
        const titleXLSlot = titleXLIndex >= 0 ? panelSlots[titleXLIndex] : null;
        const descSlot = descIndex >= 0 ? panelSlots[descIndex] : null;
        const fabSlot = fabIndex >= 0 ? panelSlots[fabIndex] : null;
        
        return (
          <div className={styles.inlineBox} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '24px', border: '2px solid #111827', background: '#fff' }}>
            {titleXLSlot && <div className={styles.inlineItem} style={{ marginTop: 0 }}>{titleXLSlot}</div>}
            {(descSlot || fabSlot) && (
              <div className={styles.inlineItem} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px', marginTop: 0 }}>
                {descSlot && <div style={{ flex: 1 }}>{descSlot}</div>}
                {fabSlot && <div>{fabSlot}</div>}
              </div>
            )}
          </div>
        );
      }
      return (
        <div className={styles.inlineBox}>
          {panelSlots.map((slot: any, idx: number) => (
            <div key={idx} className={styles.inlineItem}>{slot}</div>
          ))}
        </div>
      );
    }

    if (type === 'darkCard') {
      const isVVariant = variantKey === 'mobile.inline.darkcard-title-desc-fab-footer';
      if (isVVariant) {
        const titleXLIndex = slots.indexOf('titleXL');
        const descIndex = slots.indexOf('desc');
        const fabIndex = slots.indexOf('cta-fab');
        
        const titleXLSlot = titleXLIndex >= 0 ? panelSlots[titleXLIndex] : null;
        const descSlot = descIndex >= 0 ? panelSlots[descIndex] : null;
        const fabSlot = fabIndex >= 0 ? panelSlots[fabIndex] : null;
        
        return (
          <div className={styles.darkCardBox} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '24px' }}>
            {titleXLSlot && <div>{titleXLSlot}</div>}
            {(descSlot || fabSlot) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '12px' }}>
                {descSlot && <div style={{ flex: 1 }}>{descSlot}</div>}
                {fabSlot && <div>{fabSlot}</div>}
              </div>
            )}
          </div>
        );
      }
      return (
        <div className={styles.darkCardBox}>
          {panelSlots.map((slot: any, idx: number) => (
            <div key={idx}>{slot}</div>
          ))}
        </div>
      );
    }

    return null;
  };

  const mediaRatio = getMediaRatio();
  const hasMedia = config.media && config.media.ratio !== 'none';
  const showInfoBadge = config.media?.info && (!config.panel || config.panel?.position === 'below' || (config.panel?.type === 'darkOverlay' && config.panel?.infoPosition !== 'bottom-left'));
  const showCloseBadge = config.media?.close;
  const showMuteBadge = config.media?.mute;
  const showOverlayTitle = config.media?.overlayTitle === 'blackBar' && title;

  const isBvariant = variantKey === 'mobile.portrait.hero-logo-title-desc-buttons';
  const isEVariant = variantKey === 'mobile.portrait.dark-hero-title-desc-biz-buttons';
  const isGVariant = variantKey === 'mobile.sheet.logo-biz-title-desc-innerimage-ctabar';
  const isJVariant = variantKey === 'mobile.landscape.image-plus-whitecard-below';
  const isKVariant = variantKey === 'mobile.portrait.dark-hero-biz-title-desc-innerimage-pillcta';
  const isLVariant = variantKey === 'mobile.landscape.logo-longheadline-biz-textcta';
  const isMVariant = variantKey === 'mobile.landscape.image-logo-title-desc-biz-textcta';
  const isNVariant = variantKey === 'mobile.inline.thumb-longheadline-adbiz-button';
  const isOVariant = variantKey === 'mobile.inline.thumb-title-desc-adbiz-button';
  const isPVariant = variantKey === 'mobile.inline.thumb-title-adbiz-button';
  const isQVariant = variantKey === 'mobile.inline.header-title-thumbgrid-desc-adbiz-button';
  const isRVariant = variantKey === 'mobile.inline.header-title-thumb-desc-adbiz-button';
  const isSVariant = variantKey === 'mobile.inline.whitecard-logo-title-desc-biz-cta';
  const isTVariant = variantKey === 'mobile.sheet.logo-title-biz-desc-buttons';
  const isUVariant = variantKey === 'mobile.inline.inlinebox-title-desc-fab-footer';
  const isVVariant = variantKey === 'mobile.inline.darkcard-title-desc-fab-footer';
  const isWVariant = variantKey === 'mobile.landscape.video-title-logo-desc-button';
  const isXVariant = variantKey === 'mobile.sheet.dark-logo-title-desc-videothumb-buttons';
  const isYVariant = variantKey === 'mobile.sheet.light-logoTitle-desc-video-cta';
  const isNOPQRVariant = isNVariant || isOVariant || isPVariant || isQVariant || isRVariant;
  const showNOPQRInfoBadge = isNOPQRVariant && config.media?.info;
  const showSVariantInfoBadge = isSVariant && config.media?.info;
  
  return (
    <article 
      className={styles.card} 
      style={
        isBvariant || isEVariant || isGVariant || isJVariant || isKVariant || isTVariant || isXVariant || isYVariant || isGmailList || isYouTubeFeed || isYouTubeHome
          ? { 
              background: isBvariant ? '#f3f4f6' : isEVariant || isKVariant || isXVariant ? '#000' : isGVariant ? '#fff' : isJVariant ? '#fff' : isTVariant ? '#fff' : isYVariant ? '#fff' : isGmailList ? '#fff' : isYouTubeFeed ? '#fff' : isYouTubeHome ? '#fff' : '#fff',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              borderRadius: 0,
              minHeight: '100%',
              flex: '1 1 auto' 
            }
          : isUVariant || isVVariant
            ? { background: 'transparent', border: 'none', display: 'flex', flexDirection: 'column', overflow: 'visible', position: 'relative' }
            : isLVariant || isMVariant || isNVariant || isOVariant || isPVariant || isQVariant || isRVariant
              ? { border: 'none', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }
              : isSVariant
                ? { border: '1px solid #d1d5db', borderRadius: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }
                : isStandardFrame
                  ? { borderRadius: 0, border: '1px solid #d1d5db', display: 'flex', flexDirection: 'column', overflow: 'hidden' }
                  : {}
      } 
      role="listitem" 
      aria-label="ad preview"
    >
      {isGmailList && (
        <div className={styles.gmailWrap}>
          {/* Promotions label */}
          <div className={styles.gmailSection}>PROMOTIONS</div>

          {/* Ad row */}
          <div className={styles.gmailRow}>
            <div className={styles.gmailRowLeft}>
              {renderSlot('gmail-avatar')}
            </div>
            <div className={styles.gmailRowBody}>
              <div className={styles.gmailLine1}>
                {renderSlot('gmail-sponsored')}
                <span className={styles.gmailDot}>•</span>
                {renderSlot('gmail-biz-strong')}
              </div>
              <div className={styles.gmailLine2}>
                {isG1Variant ? renderSlot('title') : isG2Variant ? renderSlot('desc') : renderSlot('title')}
              </div>
              {isG3Variant ? (
                <>
                  <div className={styles.gmailLine3Image}>
                    {renderSlot('gmail-image')}
                  </div>
                  <div className={styles.gmailImageDescBar}>
                    {renderSlot('desc')}
                  </div>
                </>
              ) : (
                <div className={styles.gmailLine3}>
                  {isG1Variant ? renderSlot('desc') : renderSlot('title')}
                </div>
              )}
            </div>
            <div className={styles.gmailRowRight}>
              <div className={styles.gmailRightColumn}>
                {renderSlot('gmail-kebab')}
                {!isG3Variant && renderSlot('gmail-star')}
              </div>
            </div>
          </div>

          {/* List skeletons */}
          <div className={styles.gmailSkeletonList}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={styles.gmailSkeletonItem}>
                <div className={styles.gmailSkAvatar} />
                <div className={styles.gmailSkLines}>
                  <div className={styles.gmailSkLineShort} />
                  <div className={styles.gmailSkLineLong} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isYouTubeFeed && (
        <div className={styles.ytWrap}>
          {/* 1) HERO with YouTube player style */}
          <div className={styles.ytHero}>
            {/* Center play button */}
            <div className={styles.ytPlayerControls}>
              <div className={styles.ytPlayBtn}>
                <svg width="68" height="48" viewBox="0 0 68 48" fill="none">
                  <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.63-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f5f5f5"/>
                  <path d="M45 24L27 14v20l18-10z" fill="#9e9e9e"/>
                </svg>
              </div>
            </div>
            {/* Bottom progress bar */}
            <div className={styles.ytProgressBarBottom}></div>
          </div>

          {/* 2) Title bars */}
          <div className={`${styles.ytBar} ${styles.ytb1}`}/>
          <div className={`${styles.ytBar} ${styles.ytb2}`}/>

          {/* 3) Meta row: avatar + name + chip */}
          <div className={styles.ytMetaRow}>
            <div className={styles.ytAvatarSk}/>
            <div className={styles.ytNameSk}/>
            <div className={styles.ytChipSk}/>
          </div>

          {/* 4) Chips row */}
          <div className={styles.ytChips}>
            <div className={styles.ytChipSk}/><div className={styles.ytChipSk}/>
            <div className={styles.ytChipSk}/><div className={styles.ytChipSk}/>
          </div>

          {/* 5) Large rounded block */}
          <div className={styles.ytCardSk}/>

          {/* 6) Ad block (LEFT thumb, RIGHT text) */}
          <div className={styles.ytAdRow}>
            <div className={styles.ytAdColL}>{renderSlot('yt-thumb')}</div>
            <div className={styles.ytAdColR}>
              {renderSlot('title')}
              {renderSlot('ad-biz')}
              {renderSlot('yt-cta')}
            </div>
          </div>
        </div>
      )}
      {isYouTubeHome && (
        <div className={styles.y2Wrap}>
          {/* Top App Bar */}
          <div className={styles.ytTopBar}>
            <div className={styles.ytBrand}>
              <span className={styles.ytPlayIcon}/>
              <span className={styles.ytWord}>YouTube</span>
            </div>
            <div className={styles.ytTopIcons}>
              <span className={styles.ytIcast}/>
              <span className={styles.ytIbell}/>
              <span className={styles.ytIsearch}/>
              <span className={styles.ytIavatar}/>
            </div>
          </div>

          {/* Ad Card */}
          <div className={styles.y2Card}>
            <div className={styles.y2CardMedia}>
              {renderSlot('y2-thumb')}
            </div>
            <div className={styles.y2CardBody}>
              {renderSlot('title')}
              {renderSlot('desc')}
              <div className={styles.y2MetaRow}>
                <div className={styles.y2MetaLeft}>
                  {renderSlot('biz')}
                  {renderSlot('ad-badge')}
                </div>
                <div className={styles.y2MetaRight}>
                  {renderSlot('yt-cta')}
                </div>
              </div>
            </div>
          </div>

          {/* Next feed hero placeholder */}
          <div className={styles.y2NextHero}>
            <div className={styles.y2NextPlay}/>
          </div>

          {/* Bottom Nav */}
          <div className={styles.ytBottomNav}>
            <div className={styles.ytNavSquare}/>
            <div className={styles.ytNavSquare}/>
            <div className={styles.ytNavPlus}><span>+</span></div>
            <div className={styles.ytNavSquare}/>
            <div className={styles.ytNavSquare}/>
          </div>
        </div>
      )}
      {renderHeader()}
      {hasMedia && !isGVariant && !isTVariant && !isXVariant && !isYVariant && !isGmailList && !isYouTubeFeed && !isYouTubeHome && (
        <div 
          className={styles.mediaWrapper} 
          style={
            isBvariant || isEVariant || isJVariant || isKVariant || isXVariant
              ? { 
                  margin: '0', 
                  flexShrink: 0, 
                  flexGrow: isBvariant ? 0 : 1, 
                  flexBasis: isBvariant ? '50%' : isJVariant ? '35%' : isXVariant ? '100%' : '100%', 
                  maxHeight: isBvariant ? '50%' : undefined,
                  minHeight: isBvariant ? '50%' : 0,
                  display: 'flex', 
                  flexDirection: 'column', 
                  minHeight: 0, 
                  position: 'relative' 
                }
              : isStandardFrame
                ? { margin: 0, flexGrow: 7, flexBasis: '63.64%', flexShrink: 0 }
                : {}
          }
        >
          <div 
            className={`${styles.media} ${isEVariant || isJVariant || isKVariant || isXVariant ? '' : mediaRatio}`} 
            style={
              isBvariant || isEVariant || isJVariant || isKVariant || isXVariant || isXVariant
                ? { 
                    borderRadius: 0, 
                    overflow: 'hidden', 
                    flexGrow: 1, 
                    height: '100%', 
                    minHeight: 0,
                    width: '100%'
                  }
                : isStandardFrame
                  ? { borderRadius: 0, overflow: 'hidden' }
                  : {}
            }
          >
            {isWVariant && displayVideoUrl ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', width: '100%' }}>
                <iframe
                  src={displayVideoUrl}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : mediaUrl ? (
              <img src={mediaUrl} alt="" className={styles.mediaImg} />
            ) : null}
            {showInfoBadge && !isGVariant && !isKVariant && <div className={styles.infoBadge}>i</div>}
            {showCloseBadge && !isGVariant && !isKVariant && <div className={styles.closeBadge}>×</div>}
            {showMuteBadge && <div className={styles.muteBadge}>🔇</div>}
            {showOverlayTitle && <div className={styles.overlayTitle}>{title}</div>}
            {config.panel && config.panel.withinMedia && renderPanel()}
            {isKVariant && showCloseBadge && <div className={styles.closeBadge} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 20 }}>×</div>}
          </div>
        </div>
      )}
      {config.body && !isUVariant && !isVVariant && !isGmailList && !isYouTubeFeed && !isYouTubeHome && renderBody()}
      {config.panel && !config.panel.withinMedia && !isGVariant && !isTVariant && !isUVariant && !isVVariant && !isGmailList && !isYouTubeFeed && !isYouTubeHome && !isYVariant && !isXVariant && renderPanel()}
      {isGVariant && (
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {renderPanel()}
        </div>
      )}
      {isTVariant && (
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {renderPanel()}
        </div>
      )}
      {isXVariant && (
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {renderPanel()}
        </div>
      )}
      {isYVariant && (
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {renderPanel()}
        </div>
      )}
      {isSearchAd && (
        (() => {
          if (!searchAdInfo) return null;

          const headline1 = searchAdInfo.headlines?.[0]?.text || 'First headline';
          const headline2 = searchAdInfo.headlines?.[1]?.text || 'Second headline';
          const headline3 = searchAdInfo.headlines?.[2]?.text || 'Third headline';
          const desc1 = searchAdInfo.descriptions?.[0]?.text || '';
          const desc2 = searchAdInfo.descriptions?.[1]?.text || '';
          
          // Get display URL from final_urls or display_url
          let displayUrl = 'www.example.com';
          if (ad.final_urls && ad.final_urls.length > 0) {
            try {
              const url = new URL(ad.final_urls[0]);
              displayUrl = url.hostname.replace(/^www\./, '');
            } catch (e) {
              displayUrl = ad.final_urls[0].replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
            }
          } else if (ad.display_url) {
            displayUrl = ad.display_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
          }
          
          const path1 = searchAdInfo.path1 || '';
          const path2 = searchAdInfo.path2 || '';
          
          const displayPath = displayUrl + (path1 ? ` › ${path1}` : '') + (path2 ? ` › ${path2}` : '');
          const combinedDesc = desc2 ? `${desc2}. ${desc1}.` : `${desc1}`;
          const isExpanded = config.panel?.variant === 'expanded';

          return (
            <div className={styles.searchAdWrap}>
              {/* Sponsored */}
              <span className={styles.searchSponsored}>Sponsored</span>
              
              {/* URL Row */}
              <div className={styles.searchUrlRow}>
                <div className={styles.searchFavicon}>
                  <svg className={styles.searchFaviconIcon} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                </div>
                <span className={styles.searchDisplayPath}>{displayPath}</span>
              </div>

              {/* Headline Row */}
              {isExpanded ? (
                <div className={styles.searchHeadlineMulti}>
                  {headline1} | {headline2} | {headline3}
                </div>
              ) : (
                <div className={styles.searchHeadline}>
                  {headline1} - {headline2}
                </div>
              )}

              {/* Description Row */}
              <div className={styles.searchDesc}>{combinedDesc}</div>
            </div>
          );
        })()
      )}
      {isUVariant && (
        <>
          {config.panel && renderPanel()}
          {config.body && renderBody()}
        </>
      )}
      {isVVariant && (
        <>
          {config.panel && renderPanel()}
          {config.body && renderBody()}
        </>
      )}
      {showNOPQRInfoBadge && (
        <div className={styles.infoBadge} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>i</div>
      )}
      {showSVariantInfoBadge && (
        <div className={styles.infoBadge} style={{ position: 'absolute', top: '8px', right: '8px', zIndex: 10 }}>i</div>
      )}

      {locked && config.lockHints && (
        <div className={styles.lockOverlay} aria-live="polite">
          <div className={styles.lockCard}>
            <div className={styles.lockTitle}>To unlock this format, add:</div>
            <ul className={styles.lockList}>
              {config.lockHints.map((hint: string, idx: number) => (
                <li key={idx}>{hint}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}

