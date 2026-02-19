import type { Meta, StoryObj } from "@storybook/react";
import ShareLinkModal from "@/components/facebook_meta/ShareLinkModal";

const meta: Meta<typeof ShareLinkModal> = {
  title: "AdsDraft/FacebookMeta/Components/ShareLinkModal",
  component: ShareLinkModal,
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
    onClose: () => {},
    adCreative: {
      id: "120001",
      name: "Spring Sale Carousel",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ShareLinkModal>;

export const Default: Story = {};
