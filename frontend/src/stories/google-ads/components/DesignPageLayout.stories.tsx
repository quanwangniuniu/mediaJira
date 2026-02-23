import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import DesignPageLayout from "@/components/google_ads/design/DesignPageLayout";
import { baseGoogleAds } from "@/stories/google-ads/shared/googleAdsStoryData";

const meta: Meta<typeof DesignPageLayout> = {
  title: "AdsDraft/GoogleAds/Components/DesignPageLayout",
  component: DesignPageLayout,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Layout for Google Ads design page with header, save/publish actions, and completeness.",
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
type Story = StoryObj<typeof DesignPageLayout>;

export const Default: Story = {
  args: {
    ad: baseGoogleAds[0],
    completenessPercentage: 70,
    isComplete: false,
    missingFields: ["headlines", "descriptions"],
    onSave: async () => {},
    onPublish: async () => {},
    onBack: () => {},
    saving: false,
    videoAdValidation: { isValid: true, errors: [] },
  },
  render: (args) => (
    <DesignPageLayout {...args}>
      <div className="p-6">Form content placeholder</div>
    </DesignPageLayout>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Search - Brand Terms")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Back to Ads/i })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Publish/i })).toBeInTheDocument();
  },
};
