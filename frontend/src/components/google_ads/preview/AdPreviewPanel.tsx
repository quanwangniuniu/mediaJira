'use client';

import React from 'react';
import { GoogleAd } from '@/lib/api/googleAdsApi';
import ResponsiveDisplayAdPreview from './ResponsiveDisplayAdPreview';
import VideoResponsiveAdPreview from './VideoResponsiveAdPreview';
import SearchAdPreviewShell from './SearchAdPreviewShell';
import VideoAdPreviewShell from './VideoAdPreviewShell';

interface AdPreviewPanelProps {
  ad: GoogleAd;
}

export default function AdPreviewPanel({ ad }: AdPreviewPanelProps) {
  const renderPreview = () => {
    switch (ad.type) {
      case 'RESPONSIVE_SEARCH_AD':
        return <SearchAdPreviewShell ad={ad} />;
      case 'RESPONSIVE_DISPLAY_AD':
        return <ResponsiveDisplayAdPreview ad={ad} />;
      case 'VIDEO_RESPONSIVE_AD':
        return <VideoAdPreviewShell ad={ad} />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500">Unsupported ad type: {ad.type}</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Preview Content */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {renderPreview()}
      </div>

      {/* Preview Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Previews shown here are examples and don&apos;t include all possible formats.</p>
        <p>You&apos;re responsible for the content of your ads.</p>
        <p>Please make sure that your provided assets don&apos;t violate any Google policies or applicable laws, either individually, or in combination.</p>
      </div>
    </div>
  );
}
