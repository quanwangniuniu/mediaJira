import React from "react"
import { Search } from "lucide-react"

// Storybook coverage for search and filter UI fragments.
const meta = {
  title: "Mailchimp/DraftFilters",
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
    <div className="relative w-full max-w-xl">
      <input
        type="text"
        defaultValue=""
        placeholder="Search email drafts"
        className="w-full border border-gray-300 rounded-md px-8 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black pointer-events-none" />
    </div>
  ),
}

export const SearchWithQuery = {
  render: () => (
    <div className="relative w-full max-w-xl">
      <input
        type="text"
        defaultValue="newsletter"
        placeholder="Search email drafts"
        className="w-full border border-gray-300 rounded-md px-8 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black pointer-events-none" />
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
      <div className="relative w-full max-w-xl">
        <input
          type="text"
          defaultValue="launch"
          placeholder="Search email drafts"
          className="w-full border border-gray-300 rounded-md px-8 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black pointer-events-none" />
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
