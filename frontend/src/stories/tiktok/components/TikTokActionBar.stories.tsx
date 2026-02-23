import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import TikTokActionBar from "@/components/tiktok/TikTokActionBar";

const meta: Meta<typeof TikTokActionBar> = {
  title: "AdsDraft/TikTok/Components/TikTokActionBar",
  component: TikTokActionBar,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Bottom action bar with Save and Share preview buttons.",
      },
    },
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
  args: {
    onSave: () => {},
    onSharePreview: () => {},
    isSaving: false,
    hasUnsaved: false,
    lastSavedAt: new Date("2026-02-05T10:00:00"),
  },
};

export default meta;
type Story = StoryObj<typeof TikTokActionBar>;

export const Saved: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: /Save/i })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Share preview/i })).toBeInTheDocument();
  },
};

export const Saving: Story = {
  args: {
    isSaving: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Saving…")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Save/i })).toBeInTheDocument();
  },
};

export const Unsaved: Story = {
  args: {
    hasUnsaved: true,
    lastSavedAt: null,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Unsaved changes")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Share preview/i })).toBeInTheDocument();
  },
};
