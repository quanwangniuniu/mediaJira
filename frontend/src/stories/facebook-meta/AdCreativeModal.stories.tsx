import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import AdCreativeModal from "@/components/facebook_meta/AdCreativeModal";
import type { AdCreative } from "@/lib/api/facebookMetaApi";

const updateSample: AdCreative = {
  id: "120099",
  name: "Q1 Lead Gen Creative",
  status: "IN_PROCESS",
  call_to_action_type: "LEARN_MORE",
  object_story_spec: {
    link_data: {
      name: "Download the 2026 Benchmark Report",
      message: "See how top teams improve conversion velocity.",
      description: "Free report with real campaign benchmarks.",
      link: "https://mediajira.com/report",
      call_to_action: {
        type: "LEARN_MORE",
      },
    },
  },
};

const meta: Meta<typeof AdCreativeModal> = {
  title: "FacebookMeta/AdCreativeModal",
  component: AdCreativeModal,
  decorators: [
    (Story) => (
      <div className="relative min-h-[1200px] bg-slate-100 p-4">
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
      inlineStories: false,
      description: {
        component:
          "Create and update modal for Facebook Meta ad creatives, including submitting and validation states.",
      },
    },
  },
  tags: ["autodocs"],
  args: {
    isOpen: true,
    submitting: false,
    mode: "create",
    onClose: () => {},
    onSubmit: async () => {},
    adCreative: null,
  },
};

export default meta;
type Story = StoryObj<typeof AdCreativeModal>;

export const CreateMode: Story = {};

export const CreateSubmitting: Story = {
  args: {
    submitting: true,
  },
};

export const CreateValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Create Ad Creative" }));
    await expect(
      canvas.getByText("Ad creative name is required and must be at least 2 characters"),
    ).toBeInTheDocument();
  },
};

export const UpdateMode: Story = {
  args: {
    mode: "update",
    adCreative: updateSample,
  },
};

export const UpdateSubmitting: Story = {
  args: {
    mode: "update",
    adCreative: updateSample,
    submitting: true,
  },
};
