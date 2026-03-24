import type { Meta, StoryObj } from "@storybook/react";
import TasksWorkspaceSkeleton from "@/components/tasks/TasksWorkspaceSkeleton";

const meta: Meta<typeof TasksWorkspaceSkeleton> = {
  title: "Tasks/WorkspaceSkeleton",
  component: TasksWorkspaceSkeleton,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  argTypes: {
    mode: {
      control: { type: "select" },
      options: ["summary", "board", "tasks"],
    },
  },
};

export default meta;

type Story = StoryObj<typeof TasksWorkspaceSkeleton>;

export const Summary: Story = {
  args: {
    mode: "summary",
  },
  render: (args) => (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mt-6 space-y-6">
          <TasksWorkspaceSkeleton {...args} />
        </div>
      </div>
    </div>
  ),
};

export const Board: Story = {
  args: {
    mode: "board",
  },
  render: (args) => (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mt-6 space-y-6">
          <TasksWorkspaceSkeleton {...args} />
        </div>
      </div>
    </div>
  ),
};

export const Tasks: Story = {
  args: {
    mode: "tasks",
  },
};

export const Playground: Story = {
  args: {
    mode: "tasks",
  },
  render: (args) => (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mt-6 space-y-6">
          <TasksWorkspaceSkeleton {...args} />
        </div>
      </div>
    </div>
  ),
};
