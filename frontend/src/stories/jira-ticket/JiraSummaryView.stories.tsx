import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "@storybook/test";
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

const shell = (children: React.ReactNode) => (
  <div className="min-h-screen bg-[#f8f9fb] px-6 py-6">
    <div className="mx-auto max-w-6xl">{children}</div>
  </div>
);

export const Default: Story = {
  render: () =>
    shell(
      <JiraSummaryView
        metrics={metrics}
        statusOverview={statusOverview}
        workTypes={workTypes}
      />
    ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByTestId("summary-view")).toBeInTheDocument();
    await expect(canvas.getByTestId("summary-total-work-items")).toHaveTextContent(
      "9"
    );
    await expect(canvas.getByText(/Work type overview/i)).toBeInTheDocument();
  },
};

/** All metric values at zero — edge case for empty activity. */
export const AllZeros: Story = {
  render: () =>
    shell(
      <JiraSummaryView
        metrics={metrics.map((m) => ({ ...m, value: 0 }))}
        statusOverview={{ total: 0, breakdown: [] }}
        workTypes={[]}
      />
    ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No type data yet.")).toBeInTheDocument();
    await expect(canvas.getByTestId("summary-total-work-items")).toHaveTextContent(
      "0"
    );
  },
};

/** Same layout as summary tab when `boardError` is set (`frontend/src/app/tasks/page.js`). */
const SAMPLE_BOARD_ERROR_MESSAGE = "Failed to load board data";

export const WithPageError: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f8f9fb] px-6 py-6">
      <div className="mx-auto max-w-6xl">
        <div data-testid="tab-content-summary" className="mt-6 space-y-6">
          <div className="text-center py-8">
            <p className="text-red-600">{SAMPLE_BOARD_ERROR_MESSAGE}</p>
            <button
              type="button"
              onClick={() => {}}
              className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(SAMPLE_BOARD_ERROR_MESSAGE)).toBeInTheDocument();
    await expect(
      canvas.getByRole("button", { name: /^retry$/i })
    ).toBeInTheDocument();
  },
};
