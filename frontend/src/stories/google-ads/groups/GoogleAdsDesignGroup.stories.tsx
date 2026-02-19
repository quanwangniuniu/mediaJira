import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import DesignPageLayout from "@/components/google_ads/design/DesignPageLayout";
import ResponsiveSearchAdForm from "@/components/google_ads/design/ResponsiveSearchAdForm";
import ResponsiveDisplayAdForm from "@/components/google_ads/design/ResponsiveDisplayAdForm";
import VideoResponsiveAdForm from "@/components/google_ads/design/VideoResponsiveAdForm";
import AdPreviewPanel from "@/components/google_ads/preview/AdPreviewPanel";
import { baseGoogleAds } from "@/stories/google-ads/shared/googleAdsStoryData";

function DesignShell({ ad }: { ad: any }) {
  return (
    <DesignPageLayout
      ad={ad}
      completenessPercentage={70}
      isComplete={false}
      missingFields={["headlines", "descriptions"]}
      onSave={async () => {}}
      onPublish={async () => {}}
      onBack={() => {}}
      saving={false}
      videoAdValidation={{ isValid: true, errors: [] }}
    >
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
        <div className="space-y-6 rounded-lg border bg-white p-4">
          {ad.type === "RESPONSIVE_SEARCH_AD" && (
            <ResponsiveSearchAdForm ad={ad} onUpdate={async () => {}} saving={false} />
          )}
          {ad.type === "RESPONSIVE_DISPLAY_AD" && (
            <ResponsiveDisplayAdForm ad={ad} onUpdate={async () => {}} saving={false} />
          )}
          {ad.type === "VIDEO_RESPONSIVE_AD" && (
            <VideoResponsiveAdForm ad={ad} onUpdate={async () => {}} saving={false} />
          )}
        </div>
        <div className="rounded-lg border bg-white p-4">
          <AdPreviewPanel ad={ad} />
        </div>
      </div>
    </DesignPageLayout>
  );
}

const meta: Meta = {
  title: "AdsDraft/GoogleAds/Groups/GoogleAdsDesignGroup",
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const ResponsiveSearchFlow: Story = {
  render: () => <DesignShell ad={baseGoogleAds[0]} />,
};

export const ResponsiveDisplayFlow: Story = {
  render: () => <DesignShell ad={baseGoogleAds[1]} />,
};

export const VideoResponsiveFlow: Story = {
  render: () => <DesignShell ad={baseGoogleAds[2]} />,
};
