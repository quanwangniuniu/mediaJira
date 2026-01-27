import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import StatusBadge from '../../status/StatusBadge';
import StatusDropdown from '../../status/StatusDropdown';
import type { StatusOption, StatusWorkflowGroup } from '../../status/statusTypes';

const meta: Meta = {
  title: 'StatusSystem/StatusSystem',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

const workflowGroups: StatusWorkflowGroup[] = [
  {
    id: 'backlog',
    label: 'Backlog',
    statuses: [{ value: 'todo', label: 'TO DO', tone: 'todo' }],
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    statuses: [
      { value: 'in_progress', label: 'IN PROGRESS', tone: 'in_progress' },
      { value: 'in_review', label: 'IN REVIEW', tone: 'in_review' },
    ],
  },
  {
    id: 'done',
    label: 'Done',
    statuses: [{ value: 'done', label: 'DONE', tone: 'done' }],
  },
];

const flatOptions: StatusOption[] = workflowGroups.flatMap((group) => group.statuses);

const DropdownDemo = () => {
  const [status, setStatus] = useState<string>('in_progress');

  return (
    <div className="flex flex-col gap-4">
      <StatusDropdown value={status} groups={workflowGroups} onChange={setStatus} />
      <div className="text-xs text-gray-500">
        Keyboard support: use ↑/↓ to navigate, Enter to select, Esc to close
      </div>
    </div>
  );
};

export const Badges: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <StatusBadge label="TO DO" tone="todo" />
      <StatusBadge label="IN PROGRESS" tone="in_progress" />
      <StatusBadge label="IN REVIEW" tone="in_review" />
      <StatusBadge label="DONE" tone="done" />
    </div>
  ),
};

export const Dropdown: Story = {
  render: () => <DropdownDemo />,
};

const DropdownFlatOptionsDemo = () => {
  const [status, setStatus] = useState<string>('todo');
  return <StatusDropdown value={status} options={flatOptions} onChange={setStatus} />;
};

export const DropdownFlatOptions: Story = {
  render: () => <DropdownFlatOptionsDemo />,
};
