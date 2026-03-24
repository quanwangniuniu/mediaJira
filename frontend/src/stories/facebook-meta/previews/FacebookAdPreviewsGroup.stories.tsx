import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import FacebookAdPreviews from "@/components/facebook_meta/FacebookAdPreviews";
import FacebookFeedPreview from "@/components/facebook_meta/previews/FacebookFeedPreview";
import InstagramFeedPreview from "@/components/facebook_meta/previews/InstagramFeedPreview";
import FacebookStoriesPreview from "@/components/facebook_meta/previews/FacebookStoriesPreview";
import InstagramStoriesPreview from "@/components/facebook_meta/previews/InstagramStoriesPreview";
import FacebookReelsPreview from "@/components/facebook_meta/previews/FacebookReelsPreview";
import InstagramReelsPreview from "@/components/facebook_meta/previews/InstagramReelsPreview";
import AdsOnFacebookReelsPreview from "@/components/facebook_meta/previews/AdsOnFacebookReelsPreview";
import FacebookMarketplacePreview from "@/components/facebook_meta/previews/FacebookMarketplacePreview";
import InstagramExplorePreview from "@/components/facebook_meta/previews/InstagramExplorePreview";
import InstagramProfileFeedPreview from "@/components/facebook_meta/previews/InstagramProfileFeedPreview";
import FacebookProfileFeedsPreview from "@/components/facebook_meta/previews/FacebookProfileFeedsPreview";
import FacebookVideoFeedsPreview from "@/components/facebook_meta/previews/FacebookVideoFeedsPreview";
import { previewMedia } from "@/stories/facebook-meta/shared/facebookMetaStoryData";

const media = previewMedia[0] as any;
const videoMedia = previewMedia[2] as any;

const meta: Meta<typeof FacebookAdPreviews> = {
  title: "AdsDraft/FacebookMeta/Previews/FacebookAdPreviewsGroup",
  component: FacebookAdPreviews,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Facebook and Instagram ad preview placements (feed, stories, reels, marketplace).",
      },
    },
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
  args: {
    selectedMedia: previewMedia as any,
    selectedContent: "all",
    primaryText: "Preview text for placement validation.",
    scale: 75,
  },
};

export default meta;
type Story = StoryObj<typeof FacebookAdPreviews>;

export const AllPlacements: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const matches = canvas.getAllByText(/Preview text for placement validation/i);
    await expect(matches.length).toBeGreaterThan(0);
  },
};

export const FacebookFeed: Story = {
  render: () => <FacebookFeedPreview mediaToShow={media} primaryText="Feed preview text" showHeaderOnHover={true} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Feed preview text")).toBeInTheDocument();
  },
};

export const InstagramFeed: Story = {
  render: () => <InstagramFeedPreview mediaToShow={media} primaryText="Instagram feed copy" showHeaderOnHover={true} />,
};

export const FacebookStories: Story = {
  render: () => <FacebookStoriesPreview mediaToShow={media} primaryText="Stories copy" showHeaderOnHover={true} />,
};

export const InstagramStories: Story = {
  render: () => <InstagramStoriesPreview mediaToShow={media} />,
};

export const FacebookReels: Story = {
  render: () => <FacebookReelsPreview mediaToShow={media} primaryText="Reels text" showHeaderOnHover={true} />,
};

export const InstagramReels: Story = {
  render: () => <InstagramReelsPreview mediaToShow={media} primaryText="Reels text" showHeaderOnHover={true} />,
};

export const AdsOnFacebookReels: Story = {
  render: () => (
    <AdsOnFacebookReelsPreview mediaToShow={media} primaryText="Sponsored headline" showHeaderOnHover={true} />
  ),
};

export const FacebookMarketplace: Story = {
  render: () => <FacebookMarketplacePreview mediaToShow={media} primaryText="Marketplace text" showHeaderOnHover={true} />,
};

export const InstagramExplore: Story = {
  render: () => <InstagramExplorePreview mediaToShow={media} primaryText="Explore caption" showHeaderOnHover={true} />,
};

export const InstagramProfileFeed: Story = {
  render: () => (
    <InstagramProfileFeedPreview mediaToShow={media} primaryText="Profile feed text" showHeaderOnHover={true} />
  ),
};

export const FacebookProfileFeeds: Story = {
  render: () => (
    <FacebookProfileFeedsPreview mediaToShow={media} primaryText="Profile feed text" showHeaderOnHover={true} />
  ),
};

export const FacebookVideoFeeds: Story = {
  render: () => <FacebookVideoFeedsPreview mediaToShow={videoMedia} />,
};
