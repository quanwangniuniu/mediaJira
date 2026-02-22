import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import TiktokMaterialSelection from "@/components/tiktok/TiktokMaterialSelection";
import { sampleImages, sampleVideo } from "@/stories/tiktok/shared/tiktokStoryData";

const meta: Meta<typeof TiktokMaterialSelection> = {
  title: "AdsDraft/TikTok/Components/TiktokMaterialSelection",
  component: TiktokMaterialSelection,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Video or image selection for TikTok ad creative.",
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
type Story = StoryObj<typeof TiktokMaterialSelection>;

export const WithVideo: Story = {
  args: {
    selectedVideo: sampleVideo,
    selectedImages: [],
    onOpenLibrary: () => {},
    onOpenLibraryVideo: () => {},
    onOpenLibraryImages: () => {},
    onRemoveImage: () => {},
    onClearImages: () => {},
    onPreviewImage: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Demo product video")).toBeInTheDocument();
    await expect(canvas.getByText(/Update/i)).toBeInTheDocument();
  },
};

export const WithImages: Story = {
  args: {
    selectedVideo: null,
    selectedImages: sampleImages,
    onOpenLibrary: () => {},
    onOpenLibraryVideo: () => {},
    onOpenLibraryImages: () => {},
    onRemoveImage: () => {},
    onClearImages: () => {},
    onPreviewImage: () => {},
  },
};

export const Empty: Story = {
  args: {
    selectedVideo: null,
    selectedImages: [],
    onOpenLibrary: () => {},
    onOpenLibraryVideo: () => {},
    onOpenLibraryImages: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Add videos or images")).toBeInTheDocument();
  },
};
