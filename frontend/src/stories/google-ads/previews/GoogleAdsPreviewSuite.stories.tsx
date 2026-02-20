import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import ResponsiveDisplayAdPreview from "@/components/google_ads/preview/ResponsiveDisplayAdPreview";
import SearchAdPreviewShell from "@/components/google_ads/preview/SearchAdPreviewShell";
import VideoAdPreviewShell from "@/components/google_ads/preview/VideoAdPreviewShell";
import PreviewModal from "@/components/google_ads/preview/PreviewModal";
import PlacementCard from "@/components/google_ads/preview/PlacementCard";
import { baseGoogleAds } from "@/stories/google-ads/shared/googleAdsStoryData";

const variants = [
  { id: "v1", kind: "LANDSCAPE" as const, variantKey: "mobile.landscape.image-headline-logo-desc-arrow" },
  { id: "v2", kind: "SQUARE" as const, variantKey: "mobile.portrait.hero-logo-title-desc-buttons", locked: true },
];

const meta: Meta = {
  title: "AdsDraft/GoogleAds/Previews/GoogleAdsPreviewSuite",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Google Ads preview variants: display, search, video, and placement cards.",
      },
    },
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const ResponsiveDisplayPreview: Story = {
  render: () => (
    <div className="p-6">
      <ResponsiveDisplayAdPreview ad={baseGoogleAds[1]} />
    </div>
  ),
};

export const SearchPreviewShell: Story = {
  render: () => (
    <div className="p-6">
      <SearchAdPreviewShell ad={baseGoogleAds[0]} />
    </div>
  ),
};

export const VideoPreviewShell: Story = {
  render: () => (
    <div className="p-6">
      <VideoAdPreviewShell ad={baseGoogleAds[2]} />
    </div>
  ),
};

export const PreviewModalSurface: Story = {
  render: () => (
    <PreviewModal
      surface="ALL"
      device="MOBILE"
      onSurfaceChange={() => {}}
      onDeviceChange={() => {}}
      variants={variants}
      ad={baseGoogleAds[1]}
      onClose={() => {}}
    />
  ),
};

export const PlacementCardVariants: Story = {
  render: () => (
    <div className="grid gap-4 p-6 md:grid-cols-2">
      <PlacementCard
        kind="LANDSCAPE"
        title="Landscape Variant"
        description="Placement preview"
        ad={baseGoogleAds[1]}
      />
      <PlacementCard
        kind="SQUARE"
        title="Square Variant"
        description="Locked sample"
        ad={baseGoogleAds[1]}
        locked={true}
      />
    </div>
  ),
};
