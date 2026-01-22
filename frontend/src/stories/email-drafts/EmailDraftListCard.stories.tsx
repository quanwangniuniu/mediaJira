import React from "react"
import { EmailDraftListCard } from "@/components/email-drafts/EmailDraftListCard"

// Story variants for list row states.
// Storybook coverage for table row variants.
const meta = {
  title: "EmailDrafts/EmailDraftListCard",
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component: "Email draft row used in the drafts list table.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta

// Table scaffold matching the page markup.
const TableFrame = ({ children }: { children: React.ReactNode }) => (
  <div className="max-w-5xl">
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

export const Draft = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        title="Welcome to Our Newsletter"
        status="draft"
        typeLabel="Regular email"
        date="2024-01-15T10:00:00Z"
        recipients={0}
      />
    </TableFrame>
  ),
}

export const Scheduled = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        title="Product Launch Announcement"
        status="scheduled"
        typeLabel="Campaign"
        date="2024-02-01T08:00:00Z"
        recipients={1250}
      />
    </TableFrame>
  ),
}

export const Sent = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        title="Monthly Newsletter - January 2024"
        status="sent"
        typeLabel="Newsletter"
        date="2024-01-12T11:30:00Z"
        recipients={2500}
      />
    </TableFrame>
  ),
}

export const MissingFields = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard />
    </TableFrame>
  ),
}

export const DisabledActions = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        title="Rename in progress"
        status="draft"
        typeLabel="Regular email"
        date="2024-01-22T10:00:00Z"
        recipients={200}
        disabled
      />
    </TableFrame>
  ),
}

export const ErrorStatus = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        title="January Newsletter"
        status="error"
        typeLabel="Newsletter"
        date="2024-01-12T11:30:00Z"
        recipients={2500}
      />
    </TableFrame>
  ),
}

export const LockedStatus = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        title="Read-only Draft"
        status="locked"
        typeLabel="System"
        date="2024-01-20T11:30:00Z"
        recipients={0}
        disabled
      />
    </TableFrame>
  ),
}
