import React from "react"
import { List, Search } from "lucide-react"
import { EmailDraftListCard } from "@/components/mailchimp/EmailDraftListCard"
import { EmailDraft } from "@/hooks/useMailchimpData"
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"

// Full-page Storybook composition for the Email Drafts page layout.
const meta = {
  title: "Mailchimp/EmailDraftsPage",
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

// Router mock to satisfy useRouter usage in row component.
const routerMock = {
  push: () => {},
  replace: () => {},
  prefetch: async () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
}

const baseDrafts: EmailDraft[] = [
  {
    id: 1,
    subject: "Welcome to Our Newsletter",
    preview_text: "Thanks for subscribing to our newsletter",
    from_name: "Newsletter Team",
    status: "draft",
    updated_at: "2024-01-15T10:00:00Z",
    recipients: 0,
    type: "Regular email",
  },
  {
    id: 2,
    subject: "Product Launch Announcement",
    preview_text: "Exciting news about our latest product launch",
    from_name: "Product Team",
    status: "scheduled",
    send_time: "2024-02-01T08:00:00Z",
    recipients: 1250,
    type: "Campaign",
  },
  {
    id: 3,
    subject: "Monthly Newsletter - January 2024",
    preview_text: "Your monthly dose of company updates and insights",
    from_name: "Marketing Team",
    status: "sent",
    send_time: "2024-01-12T11:30:00Z",
    recipients: 2500,
    type: "Newsletter",
  },
]

export const Default = {
  render: () => (
    <AppRouterContext.Provider value={routerMock}>
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
          <div className="flex space-x-6 text-sm font-medium">
            <div className="p-1 border-b-2 border-blue-600">
              <button className="flex items-center rounded-md p-2 text-black hover:bg-gray-100">
                <List className="h-4" />
                List
              </button>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex w-full sm:w-1/2 px-8">
          <input
            type="text"
            defaultValue="newsletter"
            placeholder="Search email drafts"
            className="w-full border border-gray-300 rounded-md px-8 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-10 top-1/2 -translate-y-1/2 h-4 w-4 text-black pointer-events-none" />
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
          <table className="w-full text-sm">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="w-10 p-3 text-left">
                  <input type="checkbox" className="accent-blue-600" />
                </th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Audience</th>
                <th className="p-3 text-left font-medium">Analytics</th>
                <th className="p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {baseDrafts.map((draft) => (
                <EmailDraftListCard key={draft.id} draft={draft} />
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
    </AppRouterContext.Provider>
  ),
}
