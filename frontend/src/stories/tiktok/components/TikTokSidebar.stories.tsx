import type { Meta, StoryObj } from "@storybook/react";
import TikTokSidebar from "@/components/tiktok/TikTokSidebar";

const meta: Meta<typeof TikTokSidebar> = {
  title: "AdsDraft/TikTok/Components/TikTokSidebar",
  component: TikTokSidebar,
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      inlineStories: false,
      description: {
        component:
          "Sidebar for TikTok ad groups and drafts. In Storybook it may show empty/fallback state if backend is unavailable.",
      },
    },
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-[640px] w-[340px] overflow-hidden rounded-lg border bg-white">
        <Story />
      </div>
    ),
  ],
  args: {
    selectedAdId: null,
    refreshKey: 0,
    onSelectAd: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof TikTokSidebar>;

export const Default: Story = {};
