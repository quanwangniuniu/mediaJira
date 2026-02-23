import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";
import TiktokAdDetail from "@/components/tiktok/TiktokAdDetail";
import { sampleImages, sampleVideo } from "@/stories/tiktok/shared/tiktokStoryData";

const meta: Meta<typeof TiktokAdDetail> = {
  title: "AdsDraft/TikTok/Components/TiktokAdDetail",
  component: TiktokAdDetail,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "TikTok ad detail: creative selection, text input, and CTA toggle.",
      },
    },
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
  args: {
    selectedCreative: sampleVideo,
    selectedImages: [],
    text: "Discover better campaign workflows in one place.",
    ctaMode: "standard",
    ctaLabel: "Sign up",
    ctaEnabled: true,
    onOpenLibrary: () => {},
    onOpenLibraryVideo: () => {},
    onOpenLibraryImages: () => {},
    onChange: () => {},
    onToggleCta: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof TiktokAdDetail>;

export const VideoCreative: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Ad creative")).toBeInTheDocument();
    await expect(canvas.getByText("Demo product video")).toBeInTheDocument();
    await expect(canvas.getByText("Call to action")).toBeInTheDocument();
  },
};

export const ImageCreative: Story = {
  args: {
    selectedCreative: null,
    selectedImages: sampleImages,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Ad creative")).toBeInTheDocument();
    await expect(canvas.getByText("Creative image 1")).toBeInTheDocument();
    await expect(canvas.getByText("Creative image 2")).toBeInTheDocument();
  },
};

export const EmptyState: Story = {
  args: {
    selectedCreative: null,
    selectedImages: [],
    text: "",
    ctaEnabled: false,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Add videos or images")).toBeInTheDocument();
    await expect(canvas.getByText(/Upload creative for your ad/i)).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Add videos or images/i })).toBeInTheDocument();
  },
};

function CtaToggleFlowWrapper() {
  const [ctaEnabled, setCtaEnabled] = useState(true);
  return (
    <TiktokAdDetail
      selectedCreative={sampleVideo}
      selectedImages={[]}
      text="Test ad text"
      ctaMode="standard"
      ctaLabel="Sign up"
      ctaEnabled={ctaEnabled}
      onOpenLibrary={() => {}}
      onOpenLibraryVideo={() => {}}
      onOpenLibraryImages={() => {}}
      onChange={() => {}}
      onToggleCta={setCtaEnabled}
    />
  );
}

export const CtaToggleFlow: Story = {
  render: () => <CtaToggleFlowWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const ctaToggle = canvas.getByRole("button", { pressed: true });
    await expect(ctaToggle).toBeInTheDocument();
    await userEvent.click(ctaToggle);
    await expect(canvas.getByRole("button", { pressed: false })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { pressed: false }));
    await expect(canvas.getByRole("button", { pressed: true })).toBeInTheDocument();
  },
};

function TextEditFlowWrapper() {
  const [text, setText] = useState("");
  return (
    <TiktokAdDetail
      selectedCreative={sampleVideo}
      selectedImages={[]}
      text={text}
      ctaMode="standard"
      ctaLabel="Sign up"
      ctaEnabled={true}
      onOpenLibrary={() => {}}
      onOpenLibraryVideo={() => {}}
      onOpenLibraryImages={() => {}}
      onChange={(v) => setText(v.text)}
      onToggleCta={() => {}}
    />
  );
}

export const TextEditFlow: Story = {
  render: () => <TextEditFlowWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByPlaceholderText("Enter ad text");
    await userEvent.type(input, "New campaign text");
    await expect(canvas.getByDisplayValue("New campaign text")).toBeInTheDocument();
    await expect(canvas.getByText(/17\/100/)).toBeInTheDocument();
  },
};
