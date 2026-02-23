import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import { Toaster } from "react-hot-toast";
import MediaSelectionModal from "@/components/facebook_meta/MediaSelectionModal";
import PhotoCard from "@/components/facebook_meta/PhotoCard";
import VideoCard from "@/components/facebook_meta/VideoCard";

const samplePhoto = {
  id: 1,
  url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
  caption: "Workspace scene",
  image_hash: "hash-1",
};

const sampleVideo = {
  id: 1,
  url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  title: "Demo reel",
  message: "Short promo cut",
  video_id: "vid-1",
};

const meta: Meta<typeof MediaSelectionModal> = {
  title: "AdsDraft/FacebookMeta/Components/MediaSelectionModal",
  component: MediaSelectionModal,
  decorators: [
    (Story) => (
      <div className="relative min-h-[600px] w-full border border-gray-200 rounded-lg overflow-hidden">
        <Story />
        <Toaster position="top-right" containerStyle={{ zIndex: 999999 }} />
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
      inlineStories: true,
      description: {
        component:
          "Modal for selecting images or videos from account, URL, or recommended sources. Includes PhotoCard and VideoCard for media display.",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    isOpen: true,
    mediaType: "image",
    selectedMediaIds: [],
    onClose: () => {},
    onContinue: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof MediaSelectionModal>;

export const ImageMode: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Select images")).toBeInTheDocument();
  },
};

export const VideoMode: Story = {
  args: { mediaType: "video" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Select videos")).toBeInTheDocument();
  },
};

export const MediaCards: Story = {
  render: () => {
    const [selectedPhoto, setSelectedPhoto] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState(false);
    const [hoveredPhoto, setHoveredPhoto] = useState(false);
    const [hoveredVideo, setHoveredVideo] = useState(false);

    return (
      <div className="p-6 space-y-6">
        <h3 className="text-lg font-semibold">PhotoCard & VideoCard (used in MediaSelectionModal)</h3>
        <div className="flex flex-wrap gap-4">
          <PhotoCard
            photo={samplePhoto}
            section="account"
            isSelected={selectedPhoto}
            isHovered={hoveredPhoto}
            onSelect={() => setSelectedPhoto(!selectedPhoto)}
            onMouseEnter={() => setHoveredPhoto(true)}
            onMouseLeave={() => setHoveredPhoto(false)}
            onPreviewShow={() => {}}
            onPreviewHide={() => {}}
          />
          <PhotoCard
            photo={{ ...samplePhoto, id: 2, isUploading: true }}
            section="account"
            isSelected={false}
            isHovered={false}
            onSelect={() => {}}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
            onPreviewShow={() => {}}
            onPreviewHide={() => {}}
          />
          <PhotoCard
            photo={{ ...samplePhoto, id: 3, uploadError: true }}
            section="account"
            isSelected={false}
            isHovered={false}
            onSelect={() => {}}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
            onPreviewShow={() => {}}
            onPreviewHide={() => {}}
          />
          <VideoCard
            video={sampleVideo}
            isSelected={selectedVideo}
            isHovered={hoveredVideo}
            onSelect={() => setSelectedVideo(!selectedVideo)}
            onMouseEnter={() => setHoveredVideo(true)}
            onMouseLeave={() => setHoveredVideo(false)}
            onPreviewShow={() => {}}
            onPreviewHide={() => {}}
          />
          <VideoCard
            video={{ ...sampleVideo, id: 2, isUploading: true }}
            isSelected={false}
            isHovered={false}
            onSelect={() => {}}
            onMouseEnter={() => {}}
            onMouseLeave={() => {}}
            onPreviewShow={() => {}}
            onPreviewHide={() => {}}
          />
        </div>
      </div>
    );
  },
  parameters: { docs: { story: { inline: true } } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/PhotoCard & VideoCard/)).toBeInTheDocument();
  },
};

export const ImageSelectionFlow: Story = {
  args: { mediaType: "image" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for modal and photos to load (All tab shows same photos in Account + Recommended)
    await expect(canvas.getByText("Select images")).toBeInTheDocument();
    const workspaceImgs = await canvas.findAllByRole("img", { name: /Workspace scene/i });
    await expect(workspaceImgs.length).toBeGreaterThan(0);

    // Continue should be disabled with no selection
    await expect(canvas.getByRole("button", { name: /Continue/i })).toBeDisabled();

    // Select first image (Workspace scene - use first match since All tab duplicates)
    await userEvent.click(workspaceImgs[0]);

    // Continue should now be enabled
    await expect(canvas.getByRole("button", { name: /Continue/i })).toBeEnabled();

    // Select second image (Campaign creative)
    const campaignImgs = canvas.getAllByRole("img", { name: /Campaign creative/i });
    await userEvent.click(campaignImgs[0]);

    // Both selected - click Continue
    await userEvent.click(canvas.getByRole("button", { name: /Continue/i }));
  },
};

export const VideoSelectionFlow: Story = {
  args: { mediaType: "video" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Wait for modal and videos to load (Account tab is default for video)
    await expect(canvas.getByText("Select videos")).toBeInTheDocument();
    await canvas.findByText("Demo reel");

    // Continue should be disabled with no selection
    await expect(canvas.getByRole("button", { name: /Continue/i })).toBeDisabled();

    // Select first video (Demo reel - click the card by its title)
    const demoReelCard = canvas.getByText("Demo reel").closest("[class*='cursor-pointer']");
    if (demoReelCard) {
      await userEvent.click(demoReelCard as HTMLElement);
    } else {
      await userEvent.click(canvas.getByText("Demo reel"));
    }

    // Continue should now be enabled
    await expect(canvas.getByRole("button", { name: /Continue/i })).toBeEnabled();

    // Select second video
    const productCard = canvas.getByText("Product showcase").closest("[class*='cursor-pointer']");
    if (productCard) {
      await userEvent.click(productCard as HTMLElement);
    } else {
      await userEvent.click(canvas.getByText("Product showcase"));
    }

    // Click Continue
    await userEvent.click(canvas.getByRole("button", { name: /Continue/i }));
  },
};
