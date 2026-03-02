import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import EditAdCreativePage from "@/components/facebook_meta/EditAdCreativePage";
import AdNameSection from "@/components/facebook_meta/AdNameSection";
import AdSetupSection from "@/components/facebook_meta/AdSetupSection";
import AdCreativeSection from "@/components/facebook_meta/AdCreativeSection";
import CreativeTestingSection from "@/components/facebook_meta/CreativeTestingSection";
import EventDetailsSection from "@/components/facebook_meta/EventDetailsSection";
import TrackingSection from "@/components/facebook_meta/TrackingSection";
import CampaignScoreSection from "@/components/facebook_meta/CampaignScoreSection";
import AdPreviewSection from "@/components/facebook_meta/AdPreviewSection";
import BottomFooterSection from "@/components/facebook_meta/BottomFooterSection";
import { baseCreatives, previewMedia } from "@/stories/facebook-meta/shared/facebookMetaStoryData";

const mockRouter = {
  back: () => {},
  forward: () => {},
  prefetch: async () => {},
  push: () => {},
  refresh: () => {},
  replace: () => {},
};

const adCreative = {
  ...baseCreatives[0],
  object_story_spec: {
    ...baseCreatives[0].object_story_spec,
    photo_data: [
      {
        id: 1,
        url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
        caption: "Preview image",
      },
    ],
  },
};

const meta: Meta = {
  title: "AdsDraft/FacebookMeta/Groups/EditAdCreativePageGroup",
  decorators: [
    (Story) => (
      <AppRouterContext.Provider value={mockRouter}>
        <Story />
      </AppRouterContext.Provider>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Edit ad creative page layout and section overview.",
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

export const FullEditLayout: Story = {
  render: () => <EditAdCreativePage adCreative={adCreative} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByDisplayValue(/Spring Sale Carousel/i)).toBeInTheDocument();
  },
};

export const SectionsOverview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByDisplayValue("Storybook Draft")).toBeInTheDocument();
  },
  render: () => {
    const [format, setFormat] = React.useState<"single" | "carousel">("single");
    const [multiAdvertiserAds, setMultiAdvertiserAds] = React.useState(true);
    const [selectedMedia] = React.useState(previewMedia as any[]);

    return (
      <div className="mx-auto grid max-w-6xl gap-4 p-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4">
          <AdNameSection adName="Storybook Draft" onAdNameChange={() => {}} onCreateTemplate={() => {}} />
        </div>
        <div className="rounded-lg border bg-white p-4">
          <AdSetupSection
            format={format}
            onFormatChange={setFormat}
            multiAdvertiserAds={multiAdvertiserAds}
            onMultiAdvertiserAdsChange={setMultiAdvertiserAds}
          />
        </div>
        <div className="rounded-lg border bg-white p-4">
          <CreativeTestingSection />
        </div>
        <div className="rounded-lg border bg-white p-4">
          <EventDetailsSection />
        </div>
        <div className="rounded-lg border bg-white p-4">
          <TrackingSection />
        </div>
        <div className="rounded-lg border bg-white p-4">
          <CampaignScoreSection />
        </div>
        <div className="rounded-lg border bg-white p-4 lg:col-span-2">
          <AdPreviewSection
            isPreviewEnabled={true}
            onPreviewToggle={() => {}}
            selectedFormat="desktop"
            onFormatChange={() => {}}
            onAdvancedPreview={() => {}}
            onShare={() => {}}
            selectedMedia={selectedMedia as any}
            primaryText="Storybook preview of grouped sections."
            adCreative={{ id: adCreative.id, name: adCreative.name }}
          />
        </div>
        <div className="lg:col-span-2">
          <BottomFooterSection onClose={() => {}} onBack={() => {}} onPublish={() => {}} />
        </div>
      </div>
    );
  },
};

export const AdCreativeSectionStateful: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByDisplayValue("Primary ad message")).toBeInTheDocument();
  },
  render: () => {
    const [primaryText, setPrimaryText] = React.useState("Primary ad message");
    const [headline, setHeadline] = React.useState("Compelling headline");
    const [description, setDescription] = React.useState("Description copy");
    const [websiteUrl, setWebsiteUrl] = React.useState("https://mediajira.com");
    const [addWebsiteUrl, setAddWebsiteUrl] = React.useState(true);
    const [displayLink, setDisplayLink] = React.useState("mediajira.com");
    const [callToAction, setCallToAction] = React.useState("Learn More");
    const [optimizeCreative, setOptimizeCreative] = React.useState(true);
    const [selectedMedia, setSelectedMedia] = React.useState(previewMedia as any[]);

    return (
      <div className="mx-auto max-w-4xl rounded-lg border bg-white p-6">
        <AdCreativeSection
          adCreativeId={adCreative.id}
          primaryText={primaryText}
          onPrimaryTextChange={setPrimaryText}
          headline={headline}
          onHeadlineChange={setHeadline}
          description={description}
          onDescriptionChange={setDescription}
          websiteUrl={websiteUrl}
          onWebsiteUrlChange={setWebsiteUrl}
          addWebsiteUrl={addWebsiteUrl}
          onAddWebsiteUrlChange={setAddWebsiteUrl}
          displayLink={displayLink}
          onDisplayLinkChange={setDisplayLink}
          callToAction={callToAction}
          onCallToActionChange={setCallToAction}
          optimizeCreative={optimizeCreative}
          onOptimizeCreativeChange={setOptimizeCreative}
          selectedMedia={selectedMedia}
          onSelectedMediaChange={setSelectedMedia}
        />
      </div>
    );
  },
};
