import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import AdCreativeTable from "@/components/facebook_meta/AdCreativeTable";
import FeedbackErrorState from "@/components/state-feedback/ErrorState";
import { baseCreatives, manyCreatives } from "@/stories/facebook-meta/facebookMetaStoryData";

type FacebookMetaPageStoryProps = {
  loading?: boolean;
  error?: Error | null;
  creatives?: typeof baseCreatives;
};

function FacebookMetaPageStory({
  loading = false,
  error = null,
  creatives = baseCreatives,
}: FacebookMetaPageStoryProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortBy, setSortBy] = React.useState("");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [filters, setFilters] = React.useState<{
    status?: string;
    call_to_action_type?: string;
  }>({});

  const pageSize = 5;

  const filteredCreatives = React.useMemo(() => {
    let next = [...creatives];
    if (filters.status) {
      next = next.filter((creative) => creative.status === filters.status);
    }
    if (filters.call_to_action_type) {
      next = next.filter(
        (creative) => creative.call_to_action_type === filters.call_to_action_type,
      );
    }
    if (sortBy) {
      next.sort((a, b) => {
        const left =
          sortBy === "title" ? a.object_story_spec?.link_data?.name || "" : (a as any)[sortBy] || "";
        const right =
          sortBy === "title" ? b.object_story_spec?.link_data?.name || "" : (b as any)[sortBy] || "";
        const result = String(left).localeCompare(String(right));
        return sortOrder === "asc" ? result : -result;
      });
    }
    return next;
  }, [creatives, filters, sortBy, sortOrder]);

  const totalCount = filteredCreatives.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filteredCreatives.slice(startIndex, startIndex + pageSize);

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Facebook Meta Ad Creatives</h1>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            New Ad Creative
          </button>
        </div>

        {error ? (
          <div className="space-y-4">
            <FeedbackErrorState
              title="Failed to load ad creatives"
              description={error.message}
              actionLabel="Retry"
              onAction={() => {}}
            />
            <AdCreativeTable creatives={[]} loading={false} />
          </div>
        ) : (
          <AdCreativeTable
            creatives={pageRows}
            loading={loading}
            onView={() => {}}
            onEdit={() => {}}
            onDelete={() => {}}
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            hasNext={currentPage < totalPages}
            hasPrevious={currentPage > 1}
            onNextPage={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            onPreviousPage={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            onPageChange={(page) => setCurrentPage(page)}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={(field) => {
              if (!field) {
                setSortBy("");
                setSortOrder("asc");
                return;
              }
              if (field === sortBy) {
                setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
                return;
              }
              setSortBy(field);
              setSortOrder("asc");
            }}
            filters={filters}
            onFilterChange={(nextFilters) => {
              setFilters(nextFilters);
              setCurrentPage(1);
            }}
            onClearFilters={() => {
              setFilters({});
              setCurrentPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "FacebookMeta/FacebookMetaPage",
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
};

export default meta;
type Story = StoryObj;

export const FullPage: Story = {
  render: () => <FacebookMetaPageStory creatives={manyCreatives.slice(0, 12)} />,
};

export const Loading: Story = {
  render: () => <FacebookMetaPageStory loading={true} creatives={[]} />,
};

export const ErrorState: Story = {
  render: () => (
    <FacebookMetaPageStory
      error={new Error("Unable to fetch creatives right now. Please try again later.")}
      creatives={[]}
    />
  ),
};

export const EmptyState: Story = {
  render: () => <FacebookMetaPageStory creatives={[]} />,
};
