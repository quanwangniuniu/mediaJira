import React from "react"
import { EmailDraftListCard } from "@/components/mailchimp/EmailDraftListCard"
import { EmailDraft } from "@/hooks/useMailchimpData"
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"

// Storybook coverage for table row variants.
const meta = {
  title: "Mailchimp/EmailDraftListCard",
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

const routerMock = {
  push: () => {},
  replace: () => {},
  prefetch: async () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
}

// Table scaffold matching the page markup.
const TableFrame = ({ children }: { children: React.ReactNode }) => (
  <AppRouterContext.Provider value={routerMock}>
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
  </AppRouterContext.Provider>
)

// Baseline draft data used for multiple row variants.
const baseDraft: EmailDraft = {
  id: 1,
  subject: "Welcome to Our Newsletter",
  preview_text: "Thanks for subscribing",
  from_name: "Newsletter Team",
  reply_to: "newsletter@company.com",
  status: "draft",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2024-01-15T10:00:00Z",
  recipients: 0,
  type: "Regular email",
}

export const Draft = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard draft={baseDraft} />
    </TableFrame>
  ),
}

export const Scheduled = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        draft={{
          ...baseDraft,
          id: 2,
          status: "scheduled",
          recipients: 1250,
          settings: {
            subject_line: "Product Launch Announcement",
            preview_text: "Exciting news about our latest product launch",
          },
          send_time: "2024-02-01T08:00:00Z",
        }}
      />
    </TableFrame>
  ),
}

export const Sent = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        draft={{
          ...baseDraft,
          id: 3,
          status: "sent",
          subject: "Monthly Newsletter - January 2024",
          recipients: 2500,
          send_time: "2024-01-12T11:30:00Z",
        }}
      />
    </TableFrame>
  ),
}

export const MissingFields = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        draft={{
          id: 4,
          status: "draft",
        }}
      />
    </TableFrame>
  ),
}

export const DisabledActions = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        draft={{
          ...baseDraft,
          id: 5,
          subject: "Rename in progress",
        }}
        disabled
      />
    </TableFrame>
  ),
}

export const ErrorStatus = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        draft={{
          ...baseDraft,
          id: 6,
          status: "error",
          subject: "January Newsletter",
        }}
      />
    </TableFrame>
  ),
}

export const LockedStatus = {
  render: () => (
    <TableFrame>
      <EmailDraftListCard
        draft={{
          ...baseDraft,
          id: 7,
          status: "locked",
          subject: "Read-only Draft",
        }}
        disabled
      />
    </TableFrame>
  ),
}
