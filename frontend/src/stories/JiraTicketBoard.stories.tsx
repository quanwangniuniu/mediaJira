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
  { key: "budget", title: "Budget Tasks", empty: "No budget tasks found" },
  { key: "asset", title: "Asset Tasks", empty: "No asset tasks found" },
  {
    key: "retrospective",
    title: "Retrospective Tasks",
    empty: "No retrospective tasks found",
  },
  { key: "report", title: "Report Tasks", empty: "No report tasks found" },
  { key: "scaling", title: "Scaling Tasks", empty: "No scaling tasks found" },
  {
    key: "communication",
    title: "Communication Tasks",
    empty: "No communication tasks found",
  },
  { key: "experiment", title: "Experiment Tasks", empty: "No experiment tasks found" },
  { key: "optimization", title: "Optimization Tasks", empty: "No optimization tasks found" },
  { key: "alert", title: "Alert Tasks", empty: "No alert tasks found" },
];

const tasksByType = {
  budget: [
    {
      id: 1,
      summary: "Task 1",
      type: "budget",
      due_date: "2026-01-19",
    },
  ],
  asset: [
    {
      id: 2,
      summary: "Task 2",
      type: "asset",
      due_date: "2026-01-24",
    },
  ],
  retrospective: [],
  report: [],
  scaling: [],
  communication: [],
  experiment: [],
  optimization: [],
  alert: [],
};

function JiraBoardStory() {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingSummary, setEditingSummary] = useState("");

  const getTicketKey = (task: { id?: number; type?: string }) => {
    if (!task?.id) return "TASK-NEW";
    const prefix = (task.type || "TASK").toUpperCase().slice(0, 4);
    return `${prefix}-${task.id}`;
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
    <div className="min-h-screen bg-gray-50 px-6 py-6">
      <JiraBoardView
        boardColumns={boardColumns}
        tasksByType={tasksByType}
        onCreateTask={() => {}}
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
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <JiraBoardStory />,
};
