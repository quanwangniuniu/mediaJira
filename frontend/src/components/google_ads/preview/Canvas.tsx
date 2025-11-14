'use client';

import DeviceFrame from './DeviceFrame';
import DesktopCardFrame from './DesktopCardFrame';
import PlacementCard from './PlacementCard';
import { GoogleAd } from '@/lib/api/googleAdsApi';

type SurfaceType = 'ALL' | 'DISPLAY' | 'GMAIL' | 'YOUTUBE';
type DeviceType = 'MOBILE' | 'DESKTOP';

interface Variant {
  id: string;
  locked?: boolean;
  kind: 'LANDSCAPE' | 'SQUARE';
  variantKey?: string;
  surface?: 'DISPLAY' | 'GMAIL' | 'YOUTUBE';
}

interface CanvasProps {
  surface: SurfaceType;
  device: DeviceType;
  variants: Variant[];
  ad: GoogleAd;
}

export default function Canvas({ surface, device, variants, ad }: CanvasProps) {
  const displayAdInfo = ad.responsive_display_ad;
  
  const title = displayAdInfo?.long_headline?.text || displayAdInfo?.headlines?.[0]?.text || 'Headline';
  const description = displayAdInfo?.descriptions?.[0]?.text || 'Description';
  const cta = displayAdInfo?.call_to_action_text || 'Learn more';
  const business = displayAdInfo?.business_name || 'Ad';

  if (device === 'DESKTOP') {
    return (
      <div className="h-full overflow-y-auto py-2 pb-6">
        <div className="grid grid-cols-1 gap-6 justify-items-center" role="list">
          {variants
            .filter((v) => {
              // Filter out X variant in desktop view
              return v.variantKey !== 'mobile.sheet.dark-logo-title-desc-videothumb-buttons';
            })
            .map((v) => (
            <div key={v.id}>
              <DesktopCardFrame variantKey={v.variantKey}>
                <PlacementCard
                  locked={v.locked}
                  kind={v.kind}
                  title={title}
                  description={description}
                  cta={cta}
                  business={business}
                  ad={ad}
                  variantKey={v.variantKey}
                />
              </DesktopCardFrame>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full grid place-items-center py-2 pb-6">
      <DeviceFrame device={device}>
        <div className="grid grid-cols-1 gap-3" role="list">
          {variants.map((v) => (
            <PlacementCard
              key={v.id}
              locked={v.locked}
              kind={v.kind}
              title={title}
              description={description}
              cta={cta}
              business={business}
              ad={ad}
              variantKey={v.variantKey}
            />
          ))}
        </div>
      </DeviceFrame>
    </div>
  );
}
