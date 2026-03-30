import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import React from "react";
import JiraTicketKey from "@/components/jira-ticket/JiraTicketKey";
import JiraTicketSummary from "@/components/jira-ticket/JiraTicketSummary";
import JiraTicketTypeIcon from "@/components/jira-ticket/JiraTicketTypeIcon";

const meta: Meta = {
  title: "Jira Ticket/Identity",
  parameters: {
    layout: "centered",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component:
          "Jira-inspired ticket identity components for a ticket header: type icon, ticket key link, and inline-editable summary.",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj;

const JiraTicketHeader = ({
  type,
  jiraTicketKey,
  summary,
  startInEdit = false,
}: {
  type: "task" | "bug" | "story" | "custom";
  jiraTicketKey: string;
  summary: string;
  startInEdit?: boolean;
}) => {
  const [value, setValue] = React.useState(summary);

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="flex items-center gap-2">
        <JiraTicketTypeIcon type={type} />
        <JiraTicketKey jiraTicketKey={jiraTicketKey} onClick={() => {}} />
      </div>
      <JiraTicketSummary
        value={value}
        onSave={setValue}
        startInEdit={startInEdit}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => (
    <JiraTicketHeader
      type="task"
      jiraTicketKey="SCRUM-2"
      summary="Create Jira ticket identity components"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("SCRUM-2")).toBeInTheDocument();
    await expect(
      canvas.getByText("Create Jira ticket identity components")
    ).toBeInTheDocument();
  },
};

export const LongMultilineSummary: Story = {
  render: () => (
    <JiraTicketHeader
      type="story"
      jiraTicketKey="SCRUM-122"
      summary={
        "Support long, multiline summaries that wrap across lines without truncation.\nEnsure line breaks are preserved and editing remains smooth."
      }
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Support long, multiline summaries/)).toBeInTheDocument();
  },
};

export const EditingState: Story = {
  render: () => (
    <JiraTicketHeader
      type="bug"
      jiraTicketKey="SCRUM-88"
      summary="Fix jitter in inline edit focus"
      startInEdit
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const field = canvas.getByRole("textbox");
    await userEvent.clear(field);
    await userEvent.type(field, "Updated summary for Storybook");
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByText("Updated summary for Storybook")).toBeInTheDocument();
  },
};

export const DifferentJiraTicketTypes: Story = {
  render: () => (
    <div className="space-y-6">
      <JiraTicketHeader
        type="task"
        jiraTicketKey="OPS-14"
        summary="Task: align ticket header styles"
      />
      <JiraTicketHeader
        type="bug"
        jiraTicketKey="BUG-7"
        summary="Bug: summary edit loses focus"
      />
      <JiraTicketHeader
        type="story"
        jiraTicketKey="STORY-42"
        summary="Story: ticket identity layout"
      />
      <JiraTicketHeader
        type="custom"
        jiraTicketKey="CUST-3"
        summary="Custom: adjust type icons"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("OPS-14")).toBeInTheDocument();
    await expect(canvas.getByText("BUG-7")).toBeInTheDocument();
  },
};
