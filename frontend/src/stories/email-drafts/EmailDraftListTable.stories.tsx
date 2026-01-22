import React from "react"
import { EmailDraftListCard } from "@/components/email-drafts/EmailDraftListCard"

// Storybook coverage for table-level list states.
const meta = {
  title: "EmailDrafts/EmailDraftListTable",
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

// Table scaffold matching the page markup.
const TableFrame = ({
  children,
  fixedHeight = false,
}: {
  children: React.ReactNode
  fixedHeight?: boolean
}) => (
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
)

// Baseline data reused across list state stories.
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

// Long list data to validate scrolling behavior.
const manyDrafts = Array.from({ length: 14 }, (_, index) => ({
  ...baseDrafts[index % baseDrafts.length],
  id: index + 10,
  title: `Draft ${index + 1} - ${baseDrafts[index % baseDrafts.length].title}`,
  recipients: (index + 1) * 42,
}))

export const ThreeDrafts = {
  render: () => (
    <TableFrame>
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
        <EmailDraftListCard
          key={draft.id}
          title={draft.title}
          status={draft.status}
          typeLabel={draft.typeLabel}
          date={draft.date}
          recipients={draft.recipients}
        />
      ))}
    </TableFrame>
  ),
}
