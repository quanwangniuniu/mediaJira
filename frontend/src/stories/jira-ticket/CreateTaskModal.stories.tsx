import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within, screen } from "@storybook/test";
import React, { useLayoutEffect, useMemo, useState } from "react";
import NewTaskForm from "@/components/tasks/NewTaskForm";
import TaskCreatePanel from "@/components/tasks/TaskCreatePanel";
import { useFormValidation } from "@/hooks/useFormValidation";
import type { CreateTaskData } from "@/types/task";

const meta: Meta<typeof TaskCreatePanel> = {
  title: "Jira Ticket/Create Task",
  component: TaskCreatePanel,
  parameters: {
    layout: "fullscreen",
    chromatic: {
      disableSnapshot: false,
      viewports: [360, 768, 1200],
    },
    docs: {
      description: {
        component:
          "Shell is TaskCreatePanel; form body is NewTaskForm with the same validation wiring as the tasks page. Work types / approvers load from the API when available.",
      },
    },
  },
  tags: ["!autodocs"],
};

export default meta;

type Story = StoryObj<typeof TaskCreatePanel>;

type StoryContentVariant = "filled" | "error";

const filledTaskDefaults: Partial<CreateTaskData> = {
  project_id: 1,
  type: "task",
  summary: "Implement user authentication flow",
  description:
    "Add JWT and refresh token handling per security review.",
  start_date: "2026-03-29",
  due_date: "2026-03-30",
};

const errorTaskDefaults: Partial<CreateTaskData> = {
  project_id: 1,
  start_date: "2026-03-29",
  due_date: "2026-03-30",
};

/** Real create form (tasks page pattern). `filled` = completed inputs; `error` = validation on work type + summary. */
function CreateTaskModalStoryContent({
  variant = "filled",
}: {
  variant?: StoryContentVariant;
}) {
  const [taskData, setTaskData] = useState<Partial<CreateTaskData>>(() =>
    variant === "error" ? { ...errorTaskDefaults } : { ...filledTaskDefaults }
  );

  const taskValidationRules = useMemo(
    () => ({
      project_id: (value: CreateTaskData[keyof CreateTaskData]) =>
        !value || value === 0 ? "Project is required" : "",
      type: (value: CreateTaskData[keyof CreateTaskData]) =>
        !value ? "Work type is required" : "",
      summary: (value: CreateTaskData[keyof CreateTaskData]) =>
        !value ? "Task summary is required" : "",
      current_approver_id: (value: CreateTaskData[keyof CreateTaskData]) =>
        taskData.type === "budget" && !value
          ? "Approver is required for budget"
          : "",
      start_date: (value: CreateTaskData[keyof CreateTaskData]) =>
        taskData.type === "experiment" && !value
          ? "Start date is required for experiment tasks"
          : "",
      due_date: (value: CreateTaskData[keyof CreateTaskData]) =>
        taskData.type === "experiment" && !value
          ? "Due date is required for experiment tasks"
          : "",
    }),
    [taskData]
  );

  const taskValidation = useFormValidation<CreateTaskData>(taskValidationRules);

  // Run before paint so interaction tests see errors (same as validateForm on submit).
  useLayoutEffect(() => {
    if (variant !== "error") return;
    taskValidation.validateForm(
      {
        project_id: 1,
        start_date: "2026-03-29",
        due_date: "2026-03-30",
      } as CreateTaskData,
      ["type", "summary"]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when switching to error story
  }, [variant]);

  return (
    <div className="space-y-8">
      <NewTaskForm
        onTaskDataChange={(data) =>
          setTaskData((prev) => ({ ...prev, ...data }))
        }
        taskData={taskData}
        validation={taskValidation}
        lockProject
        projectName="E2E Test Project"
      />
    </div>
  );
}

const pageFooter = (onClose: () => void) => (
  <>
    <button
      type="button"
      onClick={onClose}
      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={onClose}
      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Create as draft
    </button>
    <button
      type="button"
      onClick={onClose}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Create
    </button>
  </>
);

function DockedPanelDemo() {
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <TaskCreatePanel
        isOpen={open}
        isExpanded={expanded}
        title="Create Task"
        onClose={() => setOpen(false)}
        onExpand={() => setExpanded(true)}
        onCollapse={() => setExpanded(false)}
        footer={pageFooter(() => setOpen(false))}
      >
        <CreateTaskModalStoryContent variant="filled" />
      </TaskCreatePanel>
    </div>
  );
}

function ModalPanelDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <TaskCreatePanel
        isOpen={open}
        isExpanded
        title="Create Task"
        onClose={() => setOpen(false)}
        onExpand={() => {}}
        onCollapse={() => setOpen(false)}
        footer={pageFooter(() => setOpen(false))}
      >
        <CreateTaskModalStoryContent variant="filled" />
      </TaskCreatePanel>
    </div>
  );
}

function ModalValidationErrorDemo() {
  const [open, setOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-8">
      <TaskCreatePanel
        isOpen={open}
        isExpanded
        title="Create Task"
        onClose={() => setOpen(false)}
        onExpand={() => {}}
        onCollapse={() => setOpen(false)}
        footer={pageFooter(() => setOpen(false))}
      >
        <CreateTaskModalStoryContent variant="error" />
      </TaskCreatePanel>
    </div>
  );
}

export const Docked: Story = {
  name: "Docked",
  render: () => <DockedPanelDemo />,
  play: async () => {
    const panel = await screen.findByTestId("task-create-panel");
    const region = within(panel);
    await expect(
      region.getByRole("heading", { name: /create task/i })
    ).toBeInTheDocument();
    await expect(region.getByText("E2E Test Project")).toBeInTheDocument();
    await expect(
      region.getByPlaceholderText(/enter a short summary/i)
    ).toHaveValue("Implement user authentication flow");
    await expect(
      region.getByPlaceholderText(/enter task description/i)
    ).toHaveValue(
      "Add JWT and refresh token handling per security review."
    );
  },
};

export const ModalExpanded: Story = {
  name: "Modal",
  render: () => <ModalPanelDemo />,
  play: async () => {
    const panel = await screen.findByTestId("task-create-panel");
    const region = within(panel);
    await expect(
      region.getByRole("button", { name: /minimize create panel/i })
    ).toBeInTheDocument();
    await expect(
      region.getByPlaceholderText(/enter a short summary/i)
    ).toHaveValue("Implement user authentication flow");
    await userEvent.click(screen.getByRole("button", { name: /close create panel/i }));
    await expect(screen.queryByTestId("task-create-panel")).not.toBeInTheDocument();
  },
};

export const ValidationError: Story = {
  name: "Validation error",
  render: () => <ModalValidationErrorDemo />,
  play: async () => {
    await screen.findByTestId("task-create-panel");
    await screen.findByText(/Work type is required/, undefined, {
      timeout: 5000,
    });
    await screen.findByText(/Task summary is required/, undefined, {
      timeout: 5000,
    });
    const panel = screen.getByTestId("task-create-panel");
    const region = within(panel);
    await expect(
      region.getByPlaceholderText(/enter a short summary/i)
    ).toHaveValue("");
  },
};
