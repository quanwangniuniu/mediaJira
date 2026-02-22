import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import TikTokSidebar from "@/components/tiktok/TikTokSidebar";
import TiktokAdDetail from "@/components/tiktok/TiktokAdDetail";
import TiktokPreview from "@/components/tiktok/TiktokPreview";
import TikTokActionBar from "@/components/tiktok/TikTokActionBar";
import { sampleImages, sampleVideo } from "@/stories/tiktok/shared/tiktokStoryData";

const meta: Meta = {
  title: "AdsDraft/TikTok/Pages/TikTokPage",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Full TikTok ads draft page with ad details, preview, and sidebar.",
      },
    },
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["!autodocs"],
};

export default meta;
type Story = StoryObj;

export const FullPage: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Ad Name")).toBeInTheDocument();
    await expect(canvas.getByText("Ad Details")).toBeInTheDocument();
    await expect(canvas.getByText("Preview")).toBeInTheDocument();
    await expect(canvas.getByText("Demo product video")).toBeInTheDocument();
  },
  render: () => (
    <div className="h-screen flex flex-row bg-gray-50">
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="h-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
          <div className="flex-1 overflow-y-auto py-8">
            <div className="mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h1 className="text-xl font-semibold text-gray-900">Ad Name</h1>
                </div>
                <input
                  type="text"
                  readOnly
                  value="Video Draft A"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
              <div className="lg:col-span-3 bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Ad Details</h2>
                </div>
                <div className="p-6">
                  <TiktokAdDetail
                    selectedCreative={sampleVideo}
                    selectedImages={sampleImages}
                    text="Turn campaign ideas into production-ready ads."
                    ctaMode="standard"
                    ctaLabel="Sign up"
                    ctaEnabled={true}
                    onOpenLibrary={() => {}}
                    onOpenLibraryVideo={() => {}}
                    onOpenLibraryImages={() => {}}
                    onChange={() => {}}
                    onToggleCta={() => {}}
                  />
                </div>
              </div>
              <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden min-w-[20rem]">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
                </div>
                <TiktokPreview
                  creative={sampleVideo}
                  images={sampleImages}
                  placement="In feed"
                  text="Turn campaign ideas into production-ready ads."
                  cta={{ mode: "standard", label: "Sign up" }}
                />
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200">
            <TikTokActionBar onSave={() => {}} onSharePreview={() => {}} hasUnsaved={true} />
          </div>
        </div>
      </div>
      <div className="w-80 h-full flex-shrink-0 flex flex-col min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border bg-white">
          <TikTokSidebar onSelectAd={() => {}} />
        </div>
      </div>
    </div>
  ),
};

export const LoadingLike: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".animate-pulse")).toBeInTheDocument();
  },
  render: () => (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto grid max-w-7xl animate-pulse gap-4 lg:grid-cols-[1fr_340px]">
        <div className="h-[700px] rounded-lg bg-gray-200" />
        <div className="h-[700px] rounded-lg bg-gray-200" />
      </div>
    </div>
  ),
};
