import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import AdSetupSection from "@/components/facebook_meta/AdSetupSection";

const meta: Meta<typeof AdSetupSection> = {
  title: "AdsDraft/FacebookMeta/Components/AdSetupSection",
  component: AdSetupSection,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Ad setup options: format (single/carousel) and multi-advertiser ads toggle.",
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
type Story = StoryObj<typeof AdSetupSection>;

export const SingleFormat: Story = {
  args: {
    format: "single",
    onFormatChange: () => {},
    multiAdvertiserAds: true,
    onMultiAdvertiserAdsChange: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Ad setup")).toBeInTheDocument();
    await expect(canvas.getByText("Format")).toBeInTheDocument();
  },
};

export const CarouselFormat: Story = {
  args: {
    format: "carousel",
    onFormatChange: () => {},
    multiAdvertiserAds: false,
    onMultiAdvertiserAdsChange: () => {},
  },
};
