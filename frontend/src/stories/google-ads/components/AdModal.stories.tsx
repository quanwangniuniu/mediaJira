import type { Meta, StoryObj } from "@storybook/react";
import AdModal from "@/components/google_ads/AdModal";
import { baseGoogleAds } from "@/stories/google-ads/shared/googleAdsStoryData";

const meta: Meta<typeof AdModal> = {
  title: "AdsDraft/GoogleAds/Components/AdModal",
  component: AdModal,
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      inlineStories: false,
    },
  },
  tags: ["autodocs"],
  args: {
    isOpen: true,
    submitting: false,
    mode: "create",
    existingAds: baseGoogleAds,
    onClose: () => {},
    onSubmit: async () => ({ id: 999, name: "Created Ad" }),
    ad: null,
  },
};

export default meta;
type Story = StoryObj<typeof AdModal>;

export const CreateMode: Story = {};

export const CreateSubmitting: Story = {
  args: {
    submitting: true,
  },
};

export const UpdateMode: Story = {
  args: {
    mode: "update",
    ad: baseGoogleAds[0],
  },
};

export const UpdateSubmitting: Story = {
  args: {
    mode: "update",
    ad: baseGoogleAds[1],
    submitting: true,
  },
};
