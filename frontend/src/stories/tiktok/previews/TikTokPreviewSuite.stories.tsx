import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import TiktokPreview from "@/components/tiktok/TiktokPreview";
import { sampleImages, sampleVideo } from "@/stories/tiktok/shared/tiktokStoryData";

const meta: Meta = {
  title: "AdsDraft/TikTok/Previews/TikTokPreviewSuite",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "TikTok shared preview page: video and image placements, CTA variants.",
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

function PreviewPageLayout({
  children,
  showCloseButton = true,
}: {
  children: React.ReactNode;
  showCloseButton?: boolean;
}) {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="relative z-50 max-w-5xl w-full mx-auto">
        <div className="relative bg-white rounded-2xl shadow-2xl p-6">
          {showCloseButton && (
            <button
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center hover:bg-gray-100"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.3 5.71L12 12l6.3 6.29-1.41 1.41L10.59 13.41 4.29 19.7 2.88 18.29 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.29z" />
              </svg>
            </button>
          )}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-semibold text-gray-900">TikTok Preview</h1>
            <span className="text-sm text-gray-400">Shared view</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-6">{children}</div>
          <p className="mt-4 text-xs text-gray-500 text-center">
            This preview link expires seven days after it was generated.
          </p>
        </div>
      </div>
    </div>
  );
}

export const VideoInFeed: Story = {
  render: () => (
    <PreviewPageLayout>
      <TiktokPreview
        creative={sampleVideo}
        placement="In feed"
        text="Turn campaign ideas into production-ready ads."
        cta={{ mode: "standard", label: "Sign up" }}
        enablePlacementSwitch={false}
        allowFullscreen={false}
      />
    </PreviewPageLayout>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("TikTok Preview")).toBeInTheDocument();
    await expect(canvas.getByText(/Turn campaign ideas into production-ready ads/i)).toBeInTheDocument();
    await expect(canvas.getByText("Shared view")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Close preview/i })).toBeInTheDocument();
  },
};

export const ImageSearchFeed: Story = {
  render: () => (
    <PreviewPageLayout>
      <TiktokPreview
        creative={sampleImages[0]}
        images={sampleImages}
        placement="Search feed"
        text="Sample search feed ad copy."
        cta={{ mode: "dynamic", label: "Learn more" }}
        enablePlacementSwitch={false}
        allowFullscreen={false}
      />
    </PreviewPageLayout>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("TikTok Preview")).toBeInTheDocument();
    await expect(canvas.getByText(/Sample search feed ad copy/i)).toBeInTheDocument();
    await expect(canvas.getByText(/expires seven days/i)).toBeInTheDocument();
  },
};


