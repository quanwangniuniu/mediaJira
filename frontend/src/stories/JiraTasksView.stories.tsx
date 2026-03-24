import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import JiraTasksView, {
  JiraTaskItem,
  JiraTasksViewMode,
} from "@/components/jira-ticket/JiraTasksView";
import TimelineViewComponent from "@/components/tasks/timeline/TimelineView";
import type { TaskData } from "@/types/task";

const meta: Meta<typeof JiraTasksView> = {
  title: "Jira Ticket/Tasks",
  component: JiraTasksView,
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof JiraTasksView>;

const mockTasks: JiraTaskItem[] = [
  {
    id: 1,
    summary: "Implement user authentication system",
    type: "task",
    status: "IN_PROGRESS",
    owner: "kirikocat",
    approver: "admin",
    dueDate: "Feb 10, 2026",
    project: "storybook",
    issueKey: "SAM1-10",
    description:
      "Set up JWT-based authentication with refresh tokens and session invalidation.",
  },
  {
    id: 2,
    summary: "Alert task - Budget overrun detected",
    type: "alert",
    status: "SUBMITTED",
    owner: "kirikocat",
    approver: "kirikocat",
    dueDate: "Feb 3, 2026",
    project: "storybook",
    issueKey: "SAM1-9",
    description:
      "Investigate the ad spend spike and document the mitigation plan.",
  },
  {
    id: 3,
    summary: "Client Communication task - Weekly update",
    type: "communication",
    status: "SUBMITTED",
    owner: "kirikocat",
    approver: "Unassigned",
    dueDate: "Jan 30, 2026",
    project: "storybook",
    issueKey: "SAM1-8",
    description:
      "Prepare weekly summary and highlight any blockers for the client.",
  },
  {
    id: 4,
    summary: "Create Q4 marketing report",
    type: "report",
    status: "DONE",
    owner: "designer",
    approver: "manager",
    dueDate: "Feb 15, 2026",
    project: "storybook",
    issueKey: "SAM1-7",
    description:
      "Compile acquisition, retention, and spend metrics into the Q4 deck.",
  },
  {
    id: 5,
    summary: "A/B test new landing page",
    type: "experiment",
    status: "IN_REVIEW",
    owner: "analyst",
    approver: "lead",
    dueDate: "Feb 20, 2026",
    project: "storybook",
    issueKey: "SAM1-6",
    description:
      "Review experiment results and decide whether to roll out variant B.",
  },
  {
    id: 6,
    summary: "Optimize database queries",
    type: "optimization",
    status: "TODO",
    owner: "developer",
    approver: "tech-lead",
    dueDate: "Feb 25, 2026",
    project: "storybook",
    issueKey: "SAM1-5",
    description:
      "Reduce N+1 queries in the campaign dashboard and add pagination.",
  },
];

const mockTimelineTasks: TaskData[] = [
  {
    id: 10,
    project_id: 1,
    project: { id: 1, name: "SAM1" },
    type: "report",
    summary: "Implement user authentication",
    description: "Ship sign-in flow and MFA.",
    status: "UNDER_REVIEW",
    start_date: "2026-01-02",
    due_date: "2026-02-12",
    owner: { id: 1, username: "kirikocat", email: "kiriko@demo.com" },
    current_approver: { id: 2, username: "admin", email: "admin@demo.com" },
  },
  {
    id: 11,
    project_id: 1,
    project: { id: 1, name: "SAM1" },
    type: "budget",
    summary: "Set up notifications for users",
    status: "DRAFT",
    start_date: "2026-01-05",
    due_date: "2026-01-26",
    owner: { id: 3, username: "jane", email: "jane@demo.com" },
    current_approver: { id: 2, username: "admin", email: "admin@demo.com" },
  },
  {
    id: 12,
    project_id: 2,
    project: { id: 2, name: "SAM1" },
    type: "experiment",
    summary: "Implement market analysis tools",
    status: "SUBMITTED",
    start_date: "2026-01-10",
    due_date: "2026-02-20",
    owner: { id: 4, username: "alex", email: "alex@demo.com" },
    current_approver: { id: 5, username: "lead", email: "lead@demo.com" },
  },
  {
    id: 13,
    project_id: 2,
    project: { id: 2, name: "SAM1" },
    type: "asset",
    summary: "Create wallet integration UI",
    status: "SUBMITTED",
    start_date: "2026-01-15",
    due_date: "2026-02-05",
    owner: { id: 6, username: "designer", email: "designer@demo.com" },
    current_approver: { id: 5, username: "lead", email: "lead@demo.com" },
  },
  {
    id: 14,
    project_id: 3,
    project: { id: 3, name: "SAM1" },
    type: "optimization",
    summary: "Develop transaction history feature",
    status: "DRAFT",
    start_date: "2026-02-01",
    due_date: "2026-03-02",
    owner: { id: 7, username: "mike", email: "mike@demo.com" },
    current_approver: { id: 5, username: "lead", email: "lead@demo.com" },
  },
  {
    id: 15,
    project_id: 3,
    project: { id: 3, name: "SAM1" },
    type: "report",
    summary: "Optimize performance for the application",
    status: "SUBMITTED",
    start_date: "2026-02-08",
    due_date: "2026-03-10",
    owner: { id: 8, username: "dev", email: "dev@demo.com" },
    current_approver: { id: 5, username: "lead", email: "lead@demo.com" },
  },
  {
    id: 16,
    project_id: 4,
    project: { id: 4, name: "SAM1" },
    type: "retrospective",
    summary: "Post-launch review and feedback collection",
    status: "APPROVED",
    start_date: "2026-01-20",
    due_date: "2026-02-18",
    owner: { id: 9, username: "taylor", email: "taylor@demo.com" },
    current_approver: { id: 5, username: "lead", email: "lead@demo.com" },
  },
  {
    id: 17,
    project_id: 4,
    project: { id: 4, name: "SAM1" },
    type: "communication",
    summary: "Finalize documentation for the project",
    status: "UNDER_REVIEW",
    start_date: "2026-02-10",
    due_date: "2026-03-08",
    owner: { id: 10, username: "writer", email: "writer@demo.com" },
    current_approver: { id: 5, username: "lead", email: "lead@demo.com" },
  },
];

// Shared state for controlled components
function JiraTasksWithState({
  initialMode = "list",
}: {
  initialMode?: JiraTasksViewMode;
}) {
  const [viewMode, setViewMode] = useState<JiraTasksViewMode>(initialMode);
  const [searchValue, setSearchValue] = useState("");

  // Mock filtered tasks for list and timeline views
  const filteredTasks = mockTasks.filter(
    (task) =>
      !searchValue ||
      task.summary.toLowerCase().includes(searchValue.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8f9fb] px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <JiraTasksView
          tasks={filteredTasks}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search tasks..."
          onTaskClick={(task) => console.log("Open task:", task)}
          renderTimeline={() => (
            <TimelineViewComponent
              tasks={mockTimelineTasks}
              onTaskClick={(task) => console.log("Task clicked:", task)}
              reloadTasks={async () => {}}
              onCreateTask={() => {}}
              currentUser={{
                first_name: "Kiriko",
                last_name: "Cat",
                username: "kirikocat",
              }}
            />
          )}
        />
      </div>
    </div>
  );
}

function JiraTasksWithSearch() {
  const [searchValue, setSearchValue] = useState("alert");
  const filteredTasks = mockTasks.filter(
    (task) =>
      task.summary.toLowerCase().includes(searchValue.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchValue.toLowerCase())
  );
  return (
    <div className="min-h-screen bg-[#f8f9fb] px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <JiraTasksView
          tasks={filteredTasks}
          viewMode="list"
          onViewModeChange={() => {}}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Search tasks..."
          onTaskClick={(task) => console.log("Open task:", task)}
        />
      </div>
    </div>
  );
}

export const ListView: Story = {
  render: () => <JiraTasksWithState initialMode="list" />,
};

export const TimelineViewStory: Story = {
  render: () => <JiraTasksWithState initialMode="timeline" />,
};

export const Empty: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f8f9fb] px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <JiraTasksView
          tasks={[]}
          viewMode="list"
          onViewModeChange={() => {}}
          searchPlaceholder="Search tasks..."
        />
      </div>
    </div>
  ),
};

export const WithSearch: Story = {
  render: () => <JiraTasksWithSearch />,
};

export const Default: Story = {
  render: () => <JiraTasksWithState initialMode="list" />,
};
