import React from "react"
import { DraftActionMenu } from "@/components/email-drafts/DraftActionMenu"
import { DraftCard } from "@/components/email-drafts/DraftCard"
import { EmailDraftCard } from "@/components/email-drafts/EmailDraftCard"

// Story variants for the card grid layout wrapper.
const meta = {
  title: "EmailDrafts/EmailDraftCard",
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component: "Layout wrapper for displaying multiple draft cards together.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta

export const Default = {
  render: () => (
    <div className="max-w-5xl">
      <EmailDraftCard>
        <div className="space-y-3">
          <DraftCard
            subject="Welcome to Our Newsletter"
            previewText="Thanks for subscribing to our newsletter."
            fromName="Newsletter Team"
            status="draft"
            sendTime="2024-01-15T10:00:00Z"
            recipients={0}
            type="Regular email"
            menu={<DraftActionMenu size="sm" />}
          />
        </div>
        <div className="space-y-3">
          <DraftCard
            subject="Product Launch Announcement"
            previewText="Exciting news about our latest product launch."
            fromName="Product Team"
            status="scheduled"
            sendTime="2024-02-01T08:00:00Z"
            recipients={1250}
            type="Campaign"
            menu={<DraftActionMenu size="sm" />}
          />
        </div>
        <div className="space-y-3">
          <DraftCard
            subject="Monthly Newsletter - January 2024"
            previewText="Your monthly dose of company updates and insights."
            fromName="Marketing Team"
            status="sent"
            sendTime="2024-01-12T11:30:00Z"
            recipients={2500}
            type="Newsletter"
            menu={<DraftActionMenu size="sm" />}
          />
        </div>
      </EmailDraftCard>
    </div>
  ),
}

export const SingleColumn = {
  render: () => (
    <div className="max-w-3xl">
      <EmailDraftCard columns={1}>
        <div className="space-y-3">
          <DraftCard
            subject="January Newsletter"
            previewText="Draft failed to sync with the remote system."
            fromName="Marketing Team"
            status="error"
            helperText="Sync failed. Please retry later."
            sendTime="2024-01-12T11:30:00Z"
            recipients={2500}
            type="Newsletter"
            menu={<DraftActionMenu size="sm" />}
          />
        </div>
        <div className="space-y-3">
          <DraftCard
            subject="Read-only Draft"
            previewText="This draft is locked and cannot be edited."
            fromName="Ops"
            status="draft"
            sendTime="2024-03-10T09:00:00Z"
            recipients={42}
            type="System"
            readOnly
            menu={<DraftActionMenu size="sm" />}
          />
        </div>
      </EmailDraftCard>
    </div>
  ),
}
