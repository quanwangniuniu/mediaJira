import type { Meta, StoryObj } from "@storybook/react";
import PhotoCard from "@/components/facebook_meta/PhotoCard";

const samplePhoto = {
  id: 1,
  url: "https://images.unsplash.com/photo-1519389950473-47ba0277781c",
  caption: "Workspace scene",
  image_hash: "hash-1",
};

const meta: Meta<typeof PhotoCard> = {
  title: "AdsDraft/FacebookMeta/Components/PhotoCard",
  component: PhotoCard,
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
  args: {
    photo: samplePhoto,
    section: "account",
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
type Story = StoryObj<typeof PhotoCard>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    isSelected: true,
  },
};

export const Uploading: Story = {
  args: {
    photo: {
      ...samplePhoto,
      isUploading: true,
    },
  },
};

export const UploadError: Story = {
  args: {
    photo: {
      ...samplePhoto,
      uploadError: true,
    },
  },
};
