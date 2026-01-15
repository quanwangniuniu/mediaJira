import React from "react"
import { MoreHorizontal, Plus } from "lucide-react"
import JiraTicketCard, {
  JiraTicketCardBody,
  JiraTicketCardFooter,
  JiraTicketCardHeader,
} from "../components/jira-ticket/JiraTicketCard"

const meta = {
  title: "Jira Ticket/Card",
  parameters: {
    layout: "centered",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component:
          "Composition-only Jira ticket cards with header, body, and footer slots.",
      },
    },
  },
  tags: ["autodocs"],
}
export default meta

export const Default = {
  render: () => (
    <JiraTicketCard className="w-[560px]">
      <JiraTicketCardHeader>Description</JiraTicketCardHeader>
      <JiraTicketCardBody>
        <div className="text-sm text-slate-700">
          Add a clear summary of the work and any constraints that might affect
          delivery.
        </div>
      </JiraTicketCardBody>
      <JiraTicketCardFooter>Last updated 2 days ago</JiraTicketCardFooter>
    </JiraTicketCard>
  ),
}

export const WithHeaderActions = {
  render: () => (
    <JiraTicketCard className="w-[560px]">
      <JiraTicketCardHeader>
        <div className="flex w-full items-center justify-between">
          <span>Subtasks</span>
          <div className="flex items-center gap-2 text-slate-500">
            <button
              type="button"
              className="rounded p-1 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Add"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 hover:bg-slate-100 hover:text-slate-800"
              aria-label="More actions"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </JiraTicketCardHeader>
      <JiraTicketCardBody>
        <div className="space-y-2 text-sm text-slate-700">
          <div>Define acceptance criteria</div>
          <div>Review QA checklist</div>
        </div>
      </JiraTicketCardBody>
      <JiraTicketCardFooter>3 of 5 complete</JiraTicketCardFooter>
    </JiraTicketCard>
  ),
}

export const CompactVariant = {
  render: () => (
    <JiraTicketCard className="w-[560px]">
      <JiraTicketCardHeader className="px-3 py-2 text-sm">
        Activity
      </JiraTicketCardHeader>
      <JiraTicketCardBody className="px-3 py-2">
        <div className="text-sm text-slate-700">
          Recent work and discussions are shown here.
        </div>
      </JiraTicketCardBody>
      <JiraTicketCardFooter className="px-3 py-2 text-[11px]">
        Updated 5 minutes ago
      </JiraTicketCardFooter>
    </JiraTicketCard>
  ),
}

export const WithoutFooter = {
  render: () => (
    <JiraTicketCard className="w-[560px]">
      <JiraTicketCardHeader>Attachments</JiraTicketCardHeader>
      <JiraTicketCardBody>
        <div className="text-sm text-slate-700">
          Drag files here or browse to add new attachments.
        </div>
      </JiraTicketCardBody>
    </JiraTicketCard>
  ),
}

export const EmptyPlaceholder = {
  render: () => (
    <JiraTicketCard className="w-[560px]">
      <JiraTicketCardHeader>Description</JiraTicketCardHeader>
      <JiraTicketCardBody>
        <div className="text-sm text-slate-400">Add a description...</div>
      </JiraTicketCardBody>
    </JiraTicketCard>
  ),
}
