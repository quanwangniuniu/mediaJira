import React from "react"
import { MoreHorizontal, Plus } from "lucide-react"
import IssueCard, {
  IssueCardBody,
  IssueCardFooter,
  IssueCardHeader,
} from "../components/issues/IssueCard"

export default {
  title: "Issue/Card",
  parameters: {
    layout: "centered",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component:
          "Composition-only Jira-style issue cards with header, body, and footer slots.",
      },
    },
  },
  tags: ["autodocs"],
}

export const Default = {
  render: () => (
    <IssueCard className="w-[560px]">
      <IssueCardHeader>Description</IssueCardHeader>
      <IssueCardBody>
        <div className="text-sm text-slate-700">
          Add a clear summary of the work and any constraints that might affect
          delivery.
        </div>
      </IssueCardBody>
      <IssueCardFooter>Last updated 2 days ago</IssueCardFooter>
    </IssueCard>
  ),
}

export const WithHeaderActions = {
  render: () => (
    <IssueCard className="w-[560px]">
      <IssueCardHeader>
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
      </IssueCardHeader>
      <IssueCardBody>
        <div className="space-y-2 text-sm text-slate-700">
          <div>Define acceptance criteria</div>
          <div>Review QA checklist</div>
        </div>
      </IssueCardBody>
      <IssueCardFooter>3 of 5 complete</IssueCardFooter>
    </IssueCard>
  ),
}

export const CompactVariant = {
  render: () => (
    <IssueCard className="w-[560px]">
      <IssueCardHeader className="px-3 py-2 text-sm">Activity</IssueCardHeader>
      <IssueCardBody className="px-3 py-2">
        <div className="text-sm text-slate-700">
          Recent work and discussions are shown here.
        </div>
      </IssueCardBody>
      <IssueCardFooter className="px-3 py-2 text-[11px]">
        Updated 5 minutes ago
      </IssueCardFooter>
    </IssueCard>
  ),
}

export const WithoutFooter = {
  render: () => (
    <IssueCard className="w-[560px]">
      <IssueCardHeader>Attachments</IssueCardHeader>
      <IssueCardBody>
        <div className="text-sm text-slate-700">
          Drag files here or browse to add new attachments.
        </div>
      </IssueCardBody>
    </IssueCard>
  ),
}

export const EmptyPlaceholder = {
  render: () => (
    <IssueCard className="w-[560px]">
      <IssueCardHeader>Description</IssueCardHeader>
      <IssueCardBody>
        <div className="text-sm text-slate-400">Add a description...</div>
      </IssueCardBody>
    </IssueCard>
  ),
}
