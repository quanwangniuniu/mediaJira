import React from "react"
import IssueKey from "../components/issues/IssueKey"
import IssueSummary from "../components/issues/IssueSummary"
import IssueTypeIcon from "../components/issues/IssueTypeIcon"

const meta = {
  title: "Issue/Identity",
  parameters: {
    layout: "centered",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component:
          "Jira-inspired issue identity components for an issue header: type icon, issue key link, and inline-editable summary.",
      },
    },
  },
  tags: ["autodocs"],
}
export default meta

const IssueHeader = ({
  type,
  issueKey,
  summary,
  startInEdit = false,
}: {
  type: "task" | "bug" | "story" | "custom"
  issueKey: string
  summary: string
  startInEdit?: boolean
}) => {
  const [value, setValue] = React.useState(summary)

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="flex items-center gap-2">
        <IssueTypeIcon type={type} />
        <IssueKey issueKey={issueKey} onClick={() => {}} />
      </div>
      <IssueSummary value={value} onSave={setValue} startInEdit={startInEdit} />
    </div>
  )
}

export const Default = {
  render: () => (
    <IssueHeader
      type="task"
      issueKey="SCRUM-2"
      summary="Create issue identity components"
    />
  ),
}

export const LongMultilineSummary = {
  render: () => (
    <IssueHeader
      type="story"
      issueKey="SCRUM-122"
      summary={
        "Support long, multiline summaries that wrap across lines without truncation.\nEnsure line breaks are preserved and editing remains smooth."
      }
    />
  ),
}

export const EditingState = {
  render: () => (
    <IssueHeader
      type="bug"
      issueKey="SCRUM-88"
      summary="Fix jitter in inline edit focus"
      startInEdit
    />
  ),
}

export const DifferentIssueTypes = {
  render: () => (
    <div className="space-y-6">
      <IssueHeader
        type="task"
        issueKey="OPS-14"
        summary="Task: align issue header styles"
      />
      <IssueHeader
        type="bug"
        issueKey="BUG-7"
        summary="Bug: summary edit loses focus"
      />
      <IssueHeader
        type="story"
        issueKey="STORY-42"
        summary="Story: issue identity layout"
      />
      <IssueHeader
        type="custom"
        issueKey="CUST-3"
        summary="Custom: adjust type icons"
      />
    </div>
  ),
}
