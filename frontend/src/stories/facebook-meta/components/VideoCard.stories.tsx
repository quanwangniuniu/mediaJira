import type { Meta, StoryObj } from "@storybook/react";
import VideoCard from "@/components/facebook_meta/VideoCard";

const sampleVideo = {
  id: 1,
  url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  title: "Demo reel",
  message: "Short promo cut",
  video_id: "vid-1",
};

const meta: Meta<typeof VideoCard> = {
  title: "AdsDraft/FacebookMeta/Components/VideoCard",
  component: VideoCard,
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
  args: {
    video: sampleVideo,
    isSelected: false,
    isHovered: false,
    onSelect: () => {},
    onMouseEnter: () => {},
    onMouseLeave: () => {},
    onPreviewShow: () => {},
    onPreviewHide: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof VideoCard>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    isSelected: true,
  },
};

export const Uploading: Story = {
  args: {
    video: {
      ...sampleVideo,
      isUploading: true,
    },
  },
};

export const UploadError: Story = {
  args: {
    video: {
      ...sampleVideo,
      uploadError: true,
    },
  },
};
