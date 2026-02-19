import React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import AdTable from "@/components/google_ads/AdTable";
import ErrorState from "@/components/state-feedback/ErrorState";
import { baseGoogleAds, tableCallbacks } from "@/stories/google-ads/shared/googleAdsStoryData";

type StoryProps = {
  loading?: boolean;
  error?: Error | null;
  ads?: typeof baseGoogleAds;
};

function GoogleAdsPageStory({ loading = false, error = null, ads = baseGoogleAds }: StoryProps) {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Google Ads</h1>
            <p className="text-gray-600">Manage your Google Ads campaigns</p>
          </div>
          <button className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            New Ad
          </button>
        </div>

        {error ? (
          <ErrorState title="Failed to load ads" description={error.message} actionLabel="Retry" onAction={() => {}} />
        ) : (
          <AdTable
            {...tableCallbacks}
            ads={ads}
            loading={loading}
            currentPage={1}
            totalPages={1}
            totalCount={ads.length}
            pageSize={10}
            hasNext={false}
            hasPrevious={false}
            sortBy=""
            sortOrder="asc"
            filters={{}}
          />
        )}
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "AdsDraft/GoogleAds/Pages/GoogleAdsPage",
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj;

export const FullPage: Story = {
  render: () => <GoogleAdsPageStory />,
};

export const Loading: Story = {
  render: () => <GoogleAdsPageStory loading={true} ads={[]} />,
};

export const Error: Story = {
  render: () => <GoogleAdsPageStory error={new Error("Unable to fetch Google Ads right now.")} />,
};

export const Empty: Story = {
  render: () => <GoogleAdsPageStory ads={[]} />,
};
