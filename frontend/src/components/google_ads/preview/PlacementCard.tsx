'use client';

import { GoogleAd } from '@/lib/api/googleAdsApi';
import { resolvePlacementComponent } from './cards/registry';

interface PlacementCardProps {
  locked?: boolean;
  kind: 'LANDSCAPE' | 'SQUARE' | 'PORTRAIT';
  title: string;
  description?: string;
  cta?: string;
  business?: string;
  ad: GoogleAd;
  variantKey?: string;
  videoUrl?: string;
  imageUrl?: string;
  data?: Record<string, any>;
}

export default function PlacementCard({
  locked,
  kind,
  title,
  description,
  cta = 'Learn more',
  business = 'Ad',
  ad,
  variantKey,
  videoUrl,
  imageUrl,
  data,
}: PlacementCardProps) {
  const displayAdInfo = ad.responsive_display_ad;
  
  const defaultVariantKey = kind === 'LANDSCAPE'
    ? 'mobile.landscape.image-headline-logo-desc-arrow'
    : kind === 'SQUARE'
      ? 'mobile.portrait.hero-logo-title-desc-buttons'
      : 'mobile.portrait.hero-logo-title-desc-buttons';

  const finalVariantKey = variantKey || defaultVariantKey;
  const CardComponent = resolvePlacementComponent(finalVariantKey);

  return (
    <CardComponent
      variantKey={finalVariantKey}
      ad={ad}
      locked={locked}
      viewOnly={false}
      videoUrl={videoUrl}
      imageUrl={imageUrl}
      data={data}
    />
  );
}
