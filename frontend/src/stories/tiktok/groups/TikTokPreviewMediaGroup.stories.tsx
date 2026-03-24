import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import TiktokPreview from "@/components/tiktok/TiktokPreview";
import CreativeLibraryDrawer from "@/components/tiktok/CreativeLibraryDrawer";
import TiktokMaterialSelection from "@/components/tiktok/TiktokMaterialSelection";
import TiktokUploadDrawer from "@/components/tiktok/TiktokUploadDrawer";
import TiktokCropImageDrawer from "@/components/tiktok/TiktokCropImageDrawer";
import { sampleImages, sampleVideo } from "@/stories/tiktok/shared/tiktokStoryData";

const meta: Meta = {
  title: "AdsDraft/TikTok/Groups/TikTokPreviewMediaGroup",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "TikTok preview states, material selection, and creative/upload drawers.",
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

export const PreviewStates: Story = {
  render: () => (
    <div className="grid gap-6 p-6 lg:grid-cols-2">
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-gray-700">In-feed (video)</div>
        <TiktokPreview
          creative={sampleVideo}
          placement="In feed"
          text="Sample in-feed ad copy for Storybook."
          cta={{ mode: "standard", label: "Sign up" }}
        />
      </div>
      <div className="rounded-lg border bg-white p-4">
        <div className="mb-3 text-sm font-semibold text-gray-700">Search feed (images)</div>
        <TiktokPreview
          creative={sampleImages[0]}
          images={sampleImages}
          placement="Search feed"
          text="Sample search feed ad copy."
          cta={{ mode: "dynamic", label: "Learn more" }}
        />
      </div>
    </div>
  ),
};

export const MaterialSelection: Story = {
  render: () => (
    <div className="mx-auto max-w-3xl rounded-lg border bg-white p-6">
      <TiktokMaterialSelection
        selectedVideo={sampleVideo}
        selectedImages={sampleImages}
        onOpenLibrary={() => {}}
        onOpenLibraryVideo={() => {}}
        onOpenLibraryImages={() => {}}
        onRemoveImage={() => {}}
        onClearImages={() => {}}
        onPreviewImage={() => {}}
      />
    </div>
  ),
};

export const CreativeLibraryDrawerOpen: Story = {
  decorators: [
    (Story) => (
      <div className="min-h-[600px] w-full relative">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <CreativeLibraryDrawer
      isOpen={true}
      onClose={() => {}}
      onConfirm={() => {}}
      forceType="video"
    />
  ),
};

export const UploadDrawerOpen: Story = {
  decorators: [
    (Story) => (
      <div className="min-h-[600px] w-full relative">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <TiktokUploadDrawer
      isOpen={true}
      onClose={() => {}}
      onUploadBegin={() => {}}
      onUploadProgress={() => {}}
      onUploadDone={() => {}}
    />
  ),
};
