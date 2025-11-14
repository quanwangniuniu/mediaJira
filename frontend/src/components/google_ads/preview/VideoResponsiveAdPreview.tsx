'use client';

import { GoogleAd } from '@/lib/api/googleAdsApi';
import VideoAdPreviewShell from './VideoAdPreviewShell';

interface VideoResponsiveAdPreviewProps {
  ad: GoogleAd;
}

export default function VideoResponsiveAdPreview({ ad }: VideoResponsiveAdPreviewProps) {
  const videoAdInfo = ad.video_responsive_ad;
  
  if (!videoAdInfo) {
    return (
      <div className="p-6 text-center text-gray-500">
        No video responsive ad data available
      </div>
    );
  }

  return <VideoAdPreviewShell ad={ad} />;
}
