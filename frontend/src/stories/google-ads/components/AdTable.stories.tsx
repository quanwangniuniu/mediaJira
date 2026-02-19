import type { Meta, StoryObj } from "@storybook/react";
import AdTable from "@/components/google_ads/AdTable";
import { allStatusAds, baseGoogleAds, tableCallbacks } from "@/stories/google-ads/shared/googleAdsStoryData";

const meta: Meta<typeof AdTable> = {
  title: "AdsDraft/GoogleAds/Components/AdTable",
  component: AdTable,
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
  args: {
    ...tableCallbacks,
    ads: baseGoogleAds,
    loading: false,
    currentPage: 1,
    totalPages: 1,
    totalCount: baseGoogleAds.length,
    pageSize: 10,
    hasNext: false,
    hasPrevious: false,
    sortBy: "",
    sortOrder: "asc",
    filters: {},
  },
};

export default meta;
type Story = StoryObj<typeof AdTable>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    ads: [],
    loading: true,
  },
};

export const AllStatuses: Story = {
  args: {
    ads: allStatusAds,
    totalCount: allStatusAds.length,
  },
};

export const Empty: Story = {
  args: {
    ads: [],
    loading: false,
    totalCount: 0,
  },
};

export const Paginated: Story = {
  args: {
    ads: allStatusAds.slice(0, 3),
    currentPage: 2,
    totalPages: 4,
    totalCount: 12,
    pageSize: 3,
    hasNext: true,
    hasPrevious: true,
  },
};
