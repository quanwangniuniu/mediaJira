'use client';

import { GoogleAd } from '@/lib/api/googleAdsApi';
import AdPreviewShell from './AdPreviewShell';

interface ResponsiveDisplayAdPreviewProps {
  ad: GoogleAd;
}

export default function ResponsiveDisplayAdPreview({ ad }: ResponsiveDisplayAdPreviewProps) {
  const displayAdInfo = ad.responsive_display_ad;
  
  if (!displayAdInfo) {
    return (
      <div className="p-6 text-center text-gray-500">
        No responsive display ad data available
      </div>
    );
  }

  return <AdPreviewShell ad={ad} />;
}
