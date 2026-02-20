import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";
import AdModal from "@/components/google_ads/AdModal";
import { baseGoogleAds } from "@/stories/google-ads/shared/googleAdsStoryData";

const meta: Meta<typeof AdModal> = {
  title: "AdsDraft/GoogleAds/Components/AdModal",
  component: AdModal,
  decorators: [
    (Story) => (
      <div className="min-h-[600px] w-full">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      inlineStories: false,
      description: {
        component: "Create and update modal for Google Ads, including submitting states.",
      },
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

export const CreateMode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Create New Ad")).toBeInTheDocument();
    await expect(canvas.getByLabelText(/Ad Name/i)).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Next/i })).toBeInTheDocument();
    await userEvent.type(canvas.getByLabelText(/Ad Name/i), "Test Ad");
    await expect(canvas.getByDisplayValue("Test Ad")).toBeInTheDocument();
  },
};

export const CreateSubmitting: Story = {
  args: {
    submitting: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Saving...")).toBeInTheDocument();
  },
};

export const UpdateMode: Story = {
  args: {
    mode: "update",
    ad: baseGoogleAds[0],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Edit Ad")).toBeInTheDocument();
    await expect(await canvas.findByDisplayValue("Search - Brand Terms")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Save Changes/i })).toBeInTheDocument();
  },
};

export const UpdateSubmitting: Story = {
  args: {
    mode: "update",
    ad: baseGoogleAds[1],
    submitting: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Saving...")).toBeInTheDocument();
  },
};

