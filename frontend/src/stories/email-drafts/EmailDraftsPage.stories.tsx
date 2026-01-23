import React from "react"
import { DraftActions } from "@/components/email-drafts/DraftActions"
import { DraftCard } from "@/components/email-drafts/DraftCard"
import { EmailDraftCard } from "@/components/email-drafts/EmailDraftCard"
import { EmailDraftListCard } from "@/components/email-drafts/EmailDraftListCard"
import { DraftSearchBar } from "@/components/email-drafts/DraftSearchBar"
import { DraftViewToggle } from "@/components/email-drafts/DraftViewToggle"

// Page-level compositions for list and card views.
// Full-page Storybook composition for the Email Drafts page layout.
const meta = {
  title: "EmailDrafts/EmailDraftsPage",
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component:
          "Composed Email Drafts page using existing markup and list row component.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta

const baseDrafts = [
  {
    id: 1,
    title: "Welcome to Our Newsletter",
    status: "draft",
    date: "2024-01-15T10:00:00Z",
    recipients: 0,
    typeLabel: "Regular email",
  },
  {
    id: 2,
    title: "Product Launch Announcement",
    status: "scheduled",
    date: "2024-02-01T08:00:00Z",
    recipients: 1250,
    typeLabel: "Campaign",
  },
  {
    id: 3,
    title: "Monthly Newsletter - January 2024",
    status: "sent",
    date: "2024-01-12T11:30:00Z",
    recipients: 2500,
    typeLabel: "Newsletter",
  },
]

export const ListView = {
  render: () => (
    <div className="h-full space-y-8 text-gray-800 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8">
        <h1 className="text-2xl font-semibold">All Email Drafts</h1>
        <div className="flex space-x-4">
          <button className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700">
            Create
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-b px-8 mt-0">
        <DraftViewToggle view="list" onChange={() => {}} />
      </div>

      {/* Search */}
      <div className="flex w-full sm:w-1/2 px-8">
        <DraftSearchBar
          defaultValue="newsletter"
          placeholder="Search email drafts"
          containerClassName="w-full"
          inputClassName="px-8 pr-10"
          iconClassName="left-10 text-black"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-8">
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

      {/* Table */}
      <div className="overflow-hidden px-8">
        <table className="w-full text-sm table-fixed">
          <thead className="border-b text-gray-600">
            <tr>
              <th className="w-10 py-1 px-3 text-left">
                <input type="checkbox" className="accent-emerald-600" />
              </th>
              <th className="py-1 px-3 text-left font-medium">Name</th>
              <th className="py-1 px-3 text-left font-medium">Status</th>
              <th className="py-1 px-3 text-left font-medium">Audience</th>
              <th className="py-1 px-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {baseDrafts.map((draft) => (
              <EmailDraftListCard
                key={draft.id}
                title={draft.title}
                status={draft.status}
                typeLabel={draft.typeLabel}
                date={draft.date}
                recipients={draft.recipients}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center text-sm text-gray-600 px-8">
        <div className="flex-1"></div>
        <div className="mr-8">
          <span>
            Showing results <b>1 - {baseDrafts.length}</b> of{" "}
            <b>{baseDrafts.length}</b>
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <span>Page</span>
          <div className="rounded-md border px-3 py-1 bg-gray-100">1</div>
          <span>of 1</span>
        </div>
      </div>
    </div>
  ),
}

export const CardView = {
  render: () => (
    <div className="h-full space-y-8 text-gray-800 bg-white">
      <div className="flex items-center justify-between px-8 pt-8">
        <h1 className="text-2xl font-semibold">All Email Drafts</h1>
        <div className="flex space-x-4">
          <button className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700">
            Create
          </button>
        </div>
      </div>

      <div className="border-t border-b px-8 mt-0">
        <DraftViewToggle view="card" onChange={() => {}} />
      </div>

      <div className="flex w-full sm:w-1/2 px-8">
        <DraftSearchBar
          defaultValue="newsletter"
          placeholder="Search email drafts"
          containerClassName="w-full"
          inputClassName="px-8 pr-10"
          iconClassName="left-10 text-black"
        />
      </div>

      <div className="px-8">
        <EmailDraftCard>
          {baseDrafts.map((draft) => (
            <div key={draft.id} className="space-y-3">
              <DraftCard
                subject={draft.title}
                status={draft.status}
                sendTime={draft.date}
                recipients={draft.recipients}
                type={draft.typeLabel}
                menu={<DraftActions size="sm" variant="menu" />}
              />
            </div>
          ))}
        </EmailDraftCard>
      </div>
    </div>
  ),
}

export const Overview = {
  render: () => (
    <div className="h-full space-y-12 text-gray-800 bg-white">
      <div className="px-8 pt-8">
        <h1 className="text-2xl font-semibold">Email Drafts Overview</h1>
        <p className="text-sm text-gray-500 mt-2">
          Composite view showing how search, view toggle, list rows, and cards
          fit together.
        </p>
      </div>

      <div className="space-y-6">
        <div className="border-t border-b px-8 mt-0">
          <DraftViewToggle view="list" onChange={() => {}} />
        </div>
        <div className="flex w-full sm:w-1/2 px-8">
          <DraftSearchBar
            defaultValue="newsletter"
            placeholder="Search email drafts"
            containerClassName="w-full"
            inputClassName="px-8 pr-10"
            iconClassName="left-10 text-black"
          />
        </div>
        <div className="overflow-hidden px-8">
          <table className="w-full text-sm table-fixed">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="w-10 py-1 px-3 text-left">
                  <input type="checkbox" className="accent-emerald-600" />
                </th>
                <th className="py-1 px-3 text-left font-medium">Name</th>
                <th className="py-1 px-3 text-left font-medium">Status</th>
                <th className="py-1 px-3 text-left font-medium">Audience</th>
                <th className="py-1 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {baseDrafts.map((draft) => (
                <EmailDraftListCard
                  key={`overview-list-${draft.id}`}
                  title={draft.title}
                  status={draft.status}
                  typeLabel={draft.typeLabel}
                  date={draft.date}
                  recipients={draft.recipients}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <div className="border-t border-b px-8 mt-0">
          <DraftViewToggle view="card" onChange={() => {}} />
        </div>
        <div className="flex w-full sm:w-1/2 px-8">
          <DraftSearchBar
            defaultValue="campaign"
            placeholder="Search email drafts"
            containerClassName="w-full"
            inputClassName="px-8 pr-10"
            iconClassName="left-10 text-black"
          />
        </div>
        <div className="px-8">
          <EmailDraftCard>
            {baseDrafts.map((draft) => (
              <div key={`overview-card-${draft.id}`} className="space-y-3">
              <DraftCard
                subject={draft.title}
                status={draft.status}
                sendTime={draft.date}
                recipients={draft.recipients}
                type={draft.typeLabel}
                menu={<DraftActions size="sm" variant="menu" />}
              />
            </div>
          ))}
        </EmailDraftCard>
        </div>
      </div>
    </div>
  ),
}
