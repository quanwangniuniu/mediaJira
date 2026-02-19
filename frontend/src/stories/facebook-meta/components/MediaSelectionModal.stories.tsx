import type { Meta, StoryObj } from "@storybook/react";
import MediaSelectionModal from "@/components/facebook_meta/MediaSelectionModal";

const meta: Meta<typeof MediaSelectionModal> = {
  title: "AdsDraft/FacebookMeta/Components/MediaSelectionModal",
  component: MediaSelectionModal,
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      inlineStories: false,
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

export const ImageMode: Story = {};

export const VideoMode: Story = {
  args: {
    mediaType: "video",
  },
};
