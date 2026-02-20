import React, { useState, useCallback } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import ShareLinkModal from "@/components/facebook_meta/ShareLinkModal";

function ShareLinkModalInContainer(props: React.ComponentProps<typeof ShareLinkModal>) {
  const [portalEl, setPortalEl] = useState<HTMLDivElement | null>(null);
  const setRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setPortalEl(el);
  }, []);
  return (
    <div ref={setRef} className="relative min-h-[500px] w-full overflow-hidden">
      <ShareLinkModal {...props} portalTarget={portalEl} />
    </div>
  );
}

const meta: Meta<typeof ShareLinkModal> = {
  title: "AdsDraft/FacebookMeta/Components/ShareLinkModal",
  component: ShareLinkModalInContainer,
  decorators: [
    (Story) => (
      <div className="relative min-h-[500px] w-full overflow-hidden">
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
      inlineStories: true,
      description: {
        component: "Modal for sharing ad creative preview links with configurable expiry.",
      },
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

export const CloseButton: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const closeButton = canvas.getByRole("button", { name: /close/i });
    await expect(closeButton).toBeInTheDocument();
    await userEvent.click(closeButton);
  },
};
