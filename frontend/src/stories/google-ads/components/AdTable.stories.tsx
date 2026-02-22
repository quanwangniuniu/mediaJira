import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React, { useState } from "react";
import AdTable from "@/components/google_ads/AdTable";
import { allStatusAds, baseGoogleAds, tableCallbacks } from "@/stories/google-ads/shared/googleAdsStoryData";

const meta: Meta<typeof AdTable> = {
  title: "AdsDraft/GoogleAds/Components/AdTable",
  component: AdTable,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Table of Google Ads with filters, sorting, and pagination.",
      },
    },
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

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Search - Brand Terms")).toBeInTheDocument();
    await expect(canvas.getByText("Status")).toBeInTheDocument();
    await expect(canvas.getByText("Type")).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /Clear Filters/i })).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {
    ads: [],
    loading: true,
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".animate-pulse")).toBeInTheDocument();
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/No ads found/i)).toBeInTheDocument();
  },
};

function FilterFlowWrapper() {
  const [filters, setFilters] = useState<{ status?: string; type?: string }>({});
  const filteredAds = filters.status || filters.type
    ? allStatusAds.filter(
        (ad) =>
          (!filters.status || ad.status === filters.status) &&
          (!filters.type || ad.type === filters.type)
      )
    : allStatusAds;

  return (
    <AdTable
      {...tableCallbacks}
      ads={filteredAds}
      loading={false}
      currentPage={1}
      totalPages={1}
      totalCount={filteredAds.length}
      pageSize={10}
      hasNext={false}
      hasPrevious={false}
      sortBy=""
      sortOrder="asc"
      filters={filters as any}
      onFilterChange={(f) => setFilters(f)}
      onClearFilters={() => setFilters({})}
    />
  );
}

export const FilterFlow: Story = {
  render: () => <FilterFlowWrapper />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const comboboxes = canvas.getAllByRole("combobox");
    const statusSelect = comboboxes[0];
    const typeSelect = comboboxes[1];
    await userEvent.selectOptions(statusSelect, "DRAFT");
    await userEvent.selectOptions(typeSelect, "RESPONSIVE_SEARCH_AD");
    await expect(canvas.getByText("Search - Brand Terms")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /Clear Filters/i }));
    await expect(canvas.getByText("Search - Brand Terms")).toBeInTheDocument();
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
