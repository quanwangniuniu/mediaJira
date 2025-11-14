'use client';

import { GoogleAd } from '@/lib/api/googleAdsApi';
import SearchAdPreviewShell from './SearchAdPreviewShell';

interface ResponsiveSearchAdPreviewProps {
  ad: GoogleAd;
}

export default function ResponsiveSearchAdPreview({ ad }: ResponsiveSearchAdPreviewProps) {
  const searchAdInfo = ad.responsive_search_ad;
  
  if (!searchAdInfo) {
    return (
      <div className="p-6 text-center text-gray-500">
        No responsive search ad data available
      </div>
    );
  }

  return <SearchAdPreviewShell ad={ad} />;
}
