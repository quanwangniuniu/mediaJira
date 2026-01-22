import React from "react"
import { DraftViewToggle } from "@/components/email-drafts/DraftViewToggle"

const meta = {
  title: "EmailDrafts/DraftViewToggle",
  parameters: {
    layout: "padded",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component: "List/card view toggle used across email draft pages.",
      },
    },
  },
  tags: ["autodocs"],
}

export default meta

export const TabsListActive = {
  render: () => <DraftViewToggle view="list" onChange={() => {}} />,
}

export const TabsCardActive = {
  render: () => <DraftViewToggle view="card" onChange={() => {}} />,
}

export const IconListActive = {
  render: () => (
    <DraftViewToggle view="list" onChange={() => {}} variant="icon" />
  ),
}

export const IconCardActive = {
  render: () => (
    <DraftViewToggle view="card" onChange={() => {}} variant="icon" />
  ),
}
