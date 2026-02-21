import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";
import AdCreativeTable from "@/components/facebook_meta/AdCreativeTable";
import FeedbackErrorState from "@/components/state-feedback/ErrorState";
import {
  baseCreatives,
  manyCreatives,
  defaultTableCallbacks,
} from "@/stories/facebook-meta/shared/facebookMetaStoryData";

const meta: Meta<typeof AdCreativeTable> = {
  title: "AdsDraft/FacebookMeta/Components/AdCreativeTable",
  component: AdCreativeTable,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Table of Facebook Meta ad creatives with filters, sorting, and pagination.",
      },
    },
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
  args: {
    ...defaultTableCallbacks,
    creatives: baseCreatives,
    loading: false,
    currentPage: 1,
    totalPages: 1,
    totalCount: baseCreatives.length,
    pageSize: 10,
    hasNext: false,
    hasPrevious: false,
    sortBy: "",
    sortOrder: "asc",
    filters: {},
  },
};

export default meta;
type Story = StoryObj<typeof AdCreativeTable>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Spring Sale Carousel")).toBeInTheDocument();
    const filtersButton = canvas.getByRole("button", { name: /Filters/i });
    await expect(filtersButton).toBeInTheDocument();
    await userEvent.click(filtersButton);
    await expect(canvas.getByRole("button", { name: /Apply/i })).toBeInTheDocument();
    await expect(canvas.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
    await userEvent.click(canvas.getByRole("button", { name: /Close/i }));
    await expect(canvas.getByText("Spring Sale Carousel")).toBeInTheDocument();
  },
};

export const AllStatuses: Story = {
  args: {
    creatives: baseCreatives,
    totalCount: baseCreatives.length,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Spring Sale Carousel")).toBeInTheDocument();
    await expect(canvas.getByText("Webinar Lead Campaign")).toBeInTheDocument();
    await expect(canvas.getByText("Retargeting Variant B")).toBeInTheDocument();
    await expect(canvas.getByText("Legacy Promo Draft")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: { creatives: [], loading: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: {
    creatives: [],
    loading: false,
    totalCount: 0,
    currentPage: 1,
    totalPages: 1,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No Ad Creatives Found")).toBeInTheDocument();
    await expect(canvas.getByText(/Get started by creating your first Facebook Ad Creative/i)).toBeInTheDocument();
  },
};

export const FilteredState: Story = {
  args: {
    filters: { status: "IN_PROCESS", call_to_action_type: "SIGN_UP" },
    creatives: baseCreatives.filter(
      (c) => c.status === "IN_PROCESS" && c.call_to_action_type === "SIGN_UP"
    ),
    totalCount: 1,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Status: IN_PROCESS/i)).toBeInTheDocument();
    await expect(canvas.getByText(/CTA: Sign Up/i)).toBeInTheDocument();
    await expect(canvas.getByText("Webinar Lead Campaign")).toBeInTheDocument();
  },
};

export const FilterPanelFlow: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const filtersButton = canvas.getByRole("button", { name: /Filters/i });
    await userEvent.click(filtersButton);
    const comboboxes = canvas.getAllByRole("combobox");
    await expect(comboboxes[0]).toBeInTheDocument();
    await expect(comboboxes[1]).toBeInTheDocument();
    await userEvent.selectOptions(comboboxes[0], "IN_PROCESS");
    await userEvent.selectOptions(comboboxes[1], "SIGN_UP");
    await userEvent.click(canvas.getByRole("button", { name: /Apply/i }));
    await expect(canvas.getByRole("button", { name: /Filters/i })).toBeInTheDocument();
  },
};

export const SortedState: Story = {
  args: {
    creatives: [...baseCreatives].sort((a, b) => a.status.localeCompare(b.status)),
    sortBy: "status",
    sortOrder: "asc",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Sorted by:/i)).toBeInTheDocument();
    await expect(canvas.getByText(/↑ Ascending/i)).toBeInTheDocument();
  },
};

function PaginationFlowWrapper() {
  const pageSize = 5;
  const totalCount = manyCreatives.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const [currentPage, setCurrentPage] = useState(1);
  const start = (currentPage - 1) * pageSize;
  const creatives = manyCreatives.slice(start, start + pageSize);

  return (
    <AdCreativeTable
      {...defaultTableCallbacks}
      creatives={creatives}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      hasNext={currentPage < totalPages}
      hasPrevious={currentPage > 1}
      onPageChange={(page) => setCurrentPage(page)}
      onNextPage={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
      onPreviousPage={() => setCurrentPage((p) => Math.max(p - 1, 1))}
    />
  );
}

export const PaginationFlow: Story = {
  render: () => <PaginationFlowWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Page 1: wait for table, verify first creative and pagination buttons
    await canvas.findByText(/Creative 1 - Spring Sale Carousel/);
    await expect(canvas.getByRole("button", { name: /Previous/i })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /Next/i })).toBeEnabled();

    // Click Next → page 2
    await userEvent.click(canvas.getByRole("button", { name: /Next/i }));
    await expect(canvas.getByText(/Creative 6 - Webinar Lead Campaign/)).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Previous/i })).toBeEnabled();

    // Click Previous → back to page 1
    await userEvent.click(canvas.getByRole("button", { name: /Previous/i }));
    await expect(canvas.getByText(/Creative 1 - Spring Sale Carousel/)).toBeInTheDocument();

    // Click Next twice → page 3
    await userEvent.click(canvas.getByRole("button", { name: /Next/i }));
    await userEvent.click(canvas.getByRole("button", { name: /Next/i }));
    await expect(canvas.getByText(/Creative 11 - Retargeting Variant B/)).toBeInTheDocument();

    // Click page 1 button → back to page 1
    await userEvent.click(canvas.getByRole("button", { name: "1" }));
    await expect(canvas.getByText(/Creative 1 - Spring Sale Carousel/)).toBeInTheDocument();
  },
};

export const ErrorState: Story = {
  render: (args) => (
    <div className="space-y-4">
      <FeedbackErrorState
        title="We couldn't load ad creatives"
        description="Please retry in a moment or check your network connection."
        actionLabel="Retry"
        onAction={() => {}}
      />
      <AdCreativeTable {...args} creatives={[]} totalCount={0} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("We couldn't load ad creatives")).toBeInTheDocument();
    const retryButton = canvas.getByRole("button", { name: /Retry/i });
    await expect(retryButton).toBeInTheDocument();
    await userEvent.click(retryButton);
    await expect(canvas.getByText("We couldn't load ad creatives")).toBeInTheDocument();
  },
};
