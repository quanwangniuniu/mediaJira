import React from "react"
import { DraftCard } from "@/components/email-drafts/DraftCard"
import { DraftActions } from "@/components/email-drafts/DraftActions"

// Story variants for the base draft card.
// Storybook coverage for the presentation-only draft card.
const meta = {
  title: "EmailDrafts/DraftCard",
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component:
          "Presentation-only card for draft information. No click handlers.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta

// Shared layout wrapper to keep cards aligned.
const cardFrameClass = "max-w-3xl"

export const Default = {
  render: () => (
    <div className={cardFrameClass}>
      <DraftCard
        subject="Welcome to Our Newsletter"
        previewText="Thanks for subscribing to our newsletter."
        fromName="Newsletter Team"
        status="draft"
        sendTime="2024-01-15T10:00:00Z"
        recipients={0}
        type="Regular email"
      />
    </div>
  ),
}

export const Scheduled = {
  render: () => (
    <div className={cardFrameClass}>
      <DraftCard
        subject="Product Launch Announcement"
        previewText="Exciting news about our latest product launch."
        fromName="Product Team"
        status="scheduled"
        sendTime="2024-02-01T08:00:00Z"
        recipients={1250}
        type="Campaign"
      />
    </div>
  ),
}

export const LongText = {
  render: () => (
    <div className={cardFrameClass}>
      <DraftCard
        subject="This is a very long subject line meant to test truncation and layout behavior when the title exceeds the available space"
        previewText="This preview text is intentionally verbose to verify how multi-line descriptions behave when the content runs long and should wrap or truncate based on the design."
        fromName="Marketing Operations"
        status="draft"
        sendTime="2024-02-12T11:30:00Z"
        recipients={340}
        type="Newsletter"
      />
    </div>
  ),
}

export const ErrorState = {
  render: () => (
    <div className={cardFrameClass}>
      <DraftCard
        subject="January Newsletter"
        previewText="Draft failed to sync with the remote system."
        fromName="Marketing Team"
        status="error"
        helperText="Sync failed. Please retry later."
        sendTime="2024-01-12T11:30:00Z"
        recipients={2500}
        type="Newsletter"
      />
    </div>
  ),
}

export const ReadOnly = {
  render: () => (
    <div className={cardFrameClass}>
      <DraftCard
        subject="Read-only Draft"
        previewText="This draft is locked and cannot be edited."
        fromName="Ops"
        status="draft"
        sendTime="2024-03-10T09:00:00Z"
        recipients={42}
        type="System"
        readOnly
      />
    </div>
  ),
}

export const CardWithActions = {
  render: () => (
    <div className="max-w-3xl space-y-3">
      <DraftCard
        subject="Launch Campaign"
        previewText="Ready to send once approvals are complete."
        fromName="Marketing Team"
        status="scheduled"
        sendTime="2024-04-01T08:00:00Z"
        recipients={980}
        type="Campaign"
        menu={<DraftActions size="sm" variant="menu" />}
      />
    </div>
  ),
}
