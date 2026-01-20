import React from "react"
import { EmailDraftListCard } from "@/components/mailchimp/EmailDraftListCard"
import { EmailDraft } from "@/hooks/useMailchimpData"
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"

// Storybook coverage for table-level list states.
const meta = {
  title: "Mailchimp/EmailDraftListTable",
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component: "Email drafts list/table states using existing row component.",
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

// Table scaffold matching the page markup.
const TableFrame = ({
  children,
  fixedHeight = false,
}: {
  children: React.ReactNode
  fixedHeight?: boolean
}) => (
  <AppRouterContext.Provider value={routerMock}>
    <div className={fixedHeight ? "max-w-5xl h-[420px] overflow-y-auto" : "max-w-5xl"}>
      <table className="w-full text-sm">
        <thead className="border-b text-gray-600">
          <tr>
            <th className="w-10 p-3 text-left">
              <input type="checkbox" className="accent-emerald-600" />
            </th>
            <th className="p-3 text-left font-medium">Name</th>
            <th className="p-3 text-left font-medium">Status</th>
            <th className="p-3 text-left font-medium">Audience</th>
            <th className="p-3 text-left font-medium">Analytics</th>
            <th className="p-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  </AppRouterContext.Provider>
)

// Baseline data reused across list state stories.
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

// Long list data to validate scrolling behavior.
const manyDrafts = Array.from({ length: 14 }, (_, index) => ({
  ...baseDrafts[index % baseDrafts.length],
  id: index + 10,
  subject: `Draft ${index + 1} - ${baseDrafts[index % baseDrafts.length].subject}`,
  recipients: (index + 1) * 42,
}))

export const ThreeDrafts = {
  render: () => (
    <TableFrame>
      {baseDrafts.map((draft) => (
        <EmailDraftListCard key={draft.id} draft={draft} />
      ))}
    </TableFrame>
  ),
}

export const Loading = {
  render: () => (
    <TableFrame>
      <tr>
        <td colSpan={6} className="p-8 text-center text-gray-500">
          Loading email drafts...
        </td>
      </tr>
    </TableFrame>
  ),
}

export const ErrorState = {
  render: () => (
    <TableFrame>
      <tr>
        <td colSpan={6} className="p-8 text-center text-red-500">
          Failed to load email drafts
        </td>
      </tr>
    </TableFrame>
  ),
}

export const Empty = {
  render: () => (
    <TableFrame>
      {/* Empty state when there are no drafts */}
      <tr>
        <td colSpan={6} className="p-8 text-center text-gray-500">
          No email drafts found. Click &quot;Create&quot; to create a new one.
        </td>
      </tr>
    </TableFrame>
  ),
}

export const FilteredEmpty = {
  render: () => (
    <TableFrame>
      {/* Empty state after applying filters/search */}
      <tr>
        <td colSpan={6} className="p-8 text-center text-gray-500">
          No email drafts match your search query.
        </td>
      </tr>
    </TableFrame>
  ),
}

export const ManyRows = {
  render: () => (
    <TableFrame fixedHeight>
      {manyDrafts.map((draft) => (
        <EmailDraftListCard key={draft.id} draft={draft} />
      ))}
    </TableFrame>
  ),
}
