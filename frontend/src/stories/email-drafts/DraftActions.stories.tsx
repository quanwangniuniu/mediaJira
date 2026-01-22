import React from "react"
import { DraftActions } from "@/components/email-drafts/DraftActions"

// Storybook coverage for decoupled action buttons.
const meta = {
  title: "EmailDrafts/DraftActions",
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component: "Action button group for draft operations.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta

export const AllEnabled = {
  render: () => <DraftActions />,
}

export const SendDisabled = {
  render: () => <DraftActions sendDisabled />,
}

export const DeleteLoading = {
  render: () => <DraftActions deleteLoading />,
}

export const KeyboardFocus = {
  render: () => (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">
        Press Tab to inspect focus-visible styles.
      </div>
      <DraftActions />
    </div>
  ),
}
