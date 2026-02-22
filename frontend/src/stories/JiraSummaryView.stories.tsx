import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import JiraSummaryView from "@/components/jira-ticket/JiraSummaryView";
import type { SummaryMetric } from "@/components/jira-ticket/JiraSummaryView";

const meta: Meta<typeof JiraSummaryView> = {
  title: "Jira Ticket/Summary",
  component: JiraSummaryView,
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

type Story = StoryObj<typeof JiraSummaryView>;

const metrics: SummaryMetric[] = [
  {
    key: "completed",
    label: "completed",
    value: 0,
    subtitle: "in the last 7 days",
    tone: "success",
  },
  {
    key: "updated",
    label: "updated",
    value: 0,
    subtitle: "in the last 7 days",
    tone: "info",
  },
  {
    key: "created",
    label: "created",
    value: 0,
    subtitle: "in the last 7 days",
    tone: "info",
  },
  {
    key: "due-soon",
    label: "due soon",
    value: 1,
    subtitle: "in the next 7 days",
    tone: "warning",
  },
];

const statusOverview = {
  total: 9,
  breakdown: [
    { label: "Budget Request", count: 3, color: "#3b82f6" },
    { label: "Asset", count: 2, color: "#6366f1" },
    { label: "Experiment", count: 2, color: "#f59e0b" },
    { label: "Communication", count: 2, color: "#06b6d4" },
  ],
};

const workTypes = [
  { label: "Budget Request", percentage: 33, color: "#3b82f6" },
  { label: "Asset", percentage: 22, color: "#6366f1" },
  { label: "Experiment", percentage: 22, color: "#f59e0b" },
  { label: "Communication", percentage: 23, color: "#06b6d4" },
];

export const Default: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f8f9fb] px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <JiraSummaryView
          metrics={metrics}
          statusOverview={statusOverview}
          workTypes={workTypes}
        />
      </div>
    </div>
  ),
};
