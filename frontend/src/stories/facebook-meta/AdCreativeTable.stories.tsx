import type { Meta, StoryObj } from "@storybook/react";
import AdCreativeTable from "@/components/facebook_meta/AdCreativeTable";
import FeedbackErrorState from "@/components/state-feedback/ErrorState";
import {
  baseCreatives,
  manyCreatives,
  defaultTableCallbacks,
} from "@/stories/facebook-meta/facebookMetaStoryData";

const meta: Meta<typeof AdCreativeTable> = {
  title: "FacebookMeta/AdCreativeTable",
  component: AdCreativeTable,
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component:
          "Facebook Meta ad creatives list table with sorting, filtering, statuses, loading, and pagination states.",
      },
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

export const Default: Story = {};

export const AllStatuses: Story = {
  args: {
    creatives: baseCreatives,
    totalCount: baseCreatives.length,
  },
};

export const Loading: Story = {
  args: {
    creatives: [],
    loading: true,
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
};

export const FilteredState: Story = {
  args: {
    creatives: baseCreatives.filter((creative) => creative.status === "IN_PROCESS"),
    filters: {
      status: "IN_PROCESS",
      call_to_action_type: "SIGN_UP",
    },
    totalCount: 1,
  },
};

export const SortedState: Story = {
  args: {
    creatives: [...baseCreatives].sort((a, b) => a.status.localeCompare(b.status)),
    sortBy: "status",
    sortOrder: "asc",
  },
};

export const Paginated: Story = {
  args: {
    creatives: manyCreatives.slice(5, 10),
    currentPage: 2,
    totalPages: 4,
    totalCount: manyCreatives.length,
    pageSize: 5,
    hasNext: true,
    hasPrevious: true,
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
};
