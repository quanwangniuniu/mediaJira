import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import JiraBoardView from "@/components/jira-ticket/JiraBoardView";

const meta: Meta<typeof JiraBoardView> = {
  title: "Jira Ticket/Board",
  component: JiraBoardView,
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

type Story = StoryObj<typeof JiraBoardView>;

const boardColumns = [
  { key: "budget", title: "Budget Requests", empty: "No budget requests" },
  { key: "asset", title: "Assets", empty: "No asset tasks" },
  { key: "retrospective", title: "Retrospectives", empty: "No retrospectives" },
  { key: "report", title: "Reports", empty: "No report tasks" },
  { key: "scaling", title: "Scaling", empty: "No scaling tasks" },
  { key: "alert", title: "Alerts", empty: "No alert tasks" },
  { key: "experiment", title: "Experiments", empty: "No experiment tasks" },
  { key: "optimization", title: "Optimizations", empty: "No optimization tasks" },
  { key: "communication", title: "Communications", empty: "No communication tasks" },
];

const tasksByType = {
  budget: [
    {
      id: 6,
      summary: "Set up notifications for users",
      type: "budget",
      status: "DRAFT",
      due_date: "2026-01-21",
    },
  ],
  asset: [
    {
      id: 7,
      summary: "Create wallet integration",
      type: "asset",
      status: "SUBMITTED",
      due_date: "2026-01-22",
      current_approver: { username: "alex" },
    },
  ],
  retrospective: [
    {
      id: 11,
      summary: "Post-launch review and feedback collection",
      type: "retrospective",
      status: "APPROVED",
      due_date: "2026-01-20",
    },
  ],
  report: [
    {
      id: 12,
      summary: "Create Q4 marketing report",
      type: "report",
      status: "SUBMITTED",
      due_date: "2026-02-02",
    },
  ],
  scaling: [],
  alert: [
    {
      id: 13,
      summary: "Alert task - Spend spike detected",
      type: "alert",
      status: "SUBMITTED",
      due_date: "2026-01-28",
    },
  ],
  experiment: [
    {
      id: 14,
      summary: "Run onboarding A/B test",
      type: "experiment",
      status: "UNDER_REVIEW",
      due_date: "2026-02-05",
    },
  ],
  optimization: [
    {
      id: 8,
      summary: "Develop transaction history feature",
      type: "optimization",
      status: "DRAFT",
      due_date: "2026-01-24",
    },
    {
      id: 9,
      summary: "Optimize performance of the application",
      type: "optimization",
      status: "DRAFT",
      due_date: "2026-01-24",
    },
  ],
  communication: [
    {
      id: 10,
      summary: "Finalize documentation for the project",
      type: "communication",
      status: "UNDER_REVIEW",
      due_date: "2026-01-21",
      current_approver: { username: "jess" },
    },
  ],
};

function JiraBoardStory() {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingSummary, setEditingSummary] = useState("");

  const getTicketKey = (task: { id?: number }) => {
    if (!task?.id) return "TASK-NEW";
    return `SAM1-${task.id}`;
  };

  const getBoardTypeIcon = (type?: string) => {
    switch (type) {
      case "alert":
        return "bug";
      case "experiment":
      case "optimization":
        return "story";
      default:
        return "task";
    }
  };

  const formatBoardDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDueTone = (dateString?: string) => {
    if (!dateString) return "default";
    const due = new Date(dateString);
    if (Number.isNaN(due.getTime())) return "default";
    const today = new Date();
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    if (dueDay < todayDay) return "danger";
    return "warning";
  };

  const startBoardEdit = (task: { id?: number; summary?: string }) => {
    if (!task?.id) return;
    setEditingTaskId(task.id);
    setEditingSummary(task.summary || "");
  };

  const cancelBoardEdit = () => {
    setEditingTaskId(null);
    setEditingSummary("");
  };

  const saveBoardEdit = () => {
    setEditingTaskId(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <JiraBoardView
        boardColumns={boardColumns}
        tasksByType={tasksByType}
        onCreateTask={() => console.log("Create task")}
        onTaskClick={() => {}}
        getTicketKey={getTicketKey}
        getBoardTypeIcon={getBoardTypeIcon}
        formatBoardDate={formatBoardDate}
        getDueTone={getDueTone}
        editingTaskId={editingTaskId}
        editingSummary={editingSummary}
        setEditingSummary={setEditingSummary}
        startBoardEdit={startBoardEdit}
        cancelBoardEdit={cancelBoardEdit}
        saveBoardEdit={saveBoardEdit}
        currentUser={{ first_name: "Kiriko", last_name: "Cat" }}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <JiraBoardStory />,
};
