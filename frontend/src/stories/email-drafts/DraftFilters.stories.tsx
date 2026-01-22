import React from "react"
import { DraftSearchBar } from "@/components/email-drafts/DraftSearchBar"

// Storybook coverage for search and filter UI fragments.
const meta = {
  title: "EmailDrafts/DraftFilters",
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component: "Search bar for email drafts (uses existing page markup).",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta

export const SearchEmpty = {
  render: () => (
    <div className="w-full max-w-xl">
      <DraftSearchBar
        defaultValue=""
        placeholder="Search email drafts"
        inputClassName="px-8 pr-10"
        iconClassName="left-10 text-black"
      />
    </div>
  ),
}

export const SearchWithQuery = {
  render: () => (
    <div className="w-full max-w-xl">
      <DraftSearchBar
        defaultValue="newsletter"
        placeholder="Search email drafts"
        inputClassName="px-8 pr-10"
        iconClassName="left-10 text-black"
      />
    </div>
  ),
}

export const FiltersRow = {
  render: () => (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-5xl">
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <div>
          Type:
          <select className="text-blue-600 ml-1">
            <option>All</option>
            <option>Regular</option>
            <option>Automated</option>
            <option>Newsletter</option>
            <option>Promotional</option>
            <option>A/B test</option>
          </select>
        </div>
        <div>
          Status:
          <select className="text-blue-600 ml-1">
            <option>All</option>
            <option>Draft</option>
            <option>Sent</option>
            <option>Scheduled</option>
            <option>Paused</option>
            <option>Error</option>
          </select>
        </div>
        <div>
          Folder:
          <select className="text-blue-600 ml-1">
            <option>All</option>
            <option>Campaigns</option>
            <option>Newsletters</option>
            <option>Promotions</option>
            <option>System</option>
          </select>
        </div>
        <div>
          Date:
          <select className="text-blue-600 ml-1">
            <option>All</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>This quarter</option>
            <option>Custom</option>
          </select>
        </div>
        <button className="text-blue-600 hover:underline">Clear</button>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
        <div className="relative">
          Sort by:
          <select className="text-blue-600 ml-1">
            <option>Send date</option>
            <option>Updated</option>
            <option>Created</option>
            <option>Recipients</option>
          </select>
        </div>
      </div>
    </div>
  ),
}

export const SearchAndFilters = {
  render: () => (
    <div className="space-y-4">
      <div className="w-full max-w-xl">
        <DraftSearchBar
          defaultValue="launch"
          placeholder="Search email drafts"
          inputClassName="px-8 pr-10"
          iconClassName="left-10 text-black"
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-5xl">
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div>
            Type:
            <select className="text-blue-600 ml-1">
              <option>All</option>
              <option>Regular</option>
              <option>Automated</option>
              <option>Newsletter</option>
              <option>Promotional</option>
              <option>A/B test</option>
            </select>
          </div>
          <div>
            Status:
            <select className="text-blue-600 ml-1">
              <option>All</option>
              <option>Draft</option>
              <option>Sent</option>
              <option>Scheduled</option>
              <option>Paused</option>
              <option>Error</option>
            </select>
          </div>
          <div>
            Folder:
            <select className="text-blue-600 ml-1">
              <option>All</option>
              <option>Campaigns</option>
              <option>Newsletters</option>
              <option>Promotions</option>
              <option>System</option>
            </select>
          </div>
          <div>
            Date:
            <select className="text-blue-600 ml-1">
              <option>All</option>
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>This quarter</option>
              <option>Custom</option>
            </select>
          </div>
          <button className="text-blue-600 hover:underline">Clear</button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div className="relative">
            Sort by:
            <select className="text-blue-600 ml-1">
              <option>Send date</option>
              <option>Updated</option>
              <option>Created</option>
              <option>Recipients</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  ),
}
