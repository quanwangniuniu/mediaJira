import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  JiraAssigneeField,
  JiraDescriptionField,
  JiraLabelsField,
  JiraPriorityField,
  JiraStatusField,
} from '../../jira_field_implementation';
import type { AssigneeValue, RecentUser, User } from '../../people/AssigneeSelector';
import type { PriorityValue } from '../../priority/PriorityIcon';

const users: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Designer' },
  { id: '2', name: 'Leo Park', email: 'leo@example.com', role: 'Engineer' },
  { id: '3', name: 'Mina Xu', email: 'mina@example.com', role: 'PM' },
];

const recentUsers: RecentUser[] = [
  {
    id: '2',
    name: 'Leo Park',
    email: 'leo@example.com',
    role: 'Engineer',
    lastUsedAt: new Date().toISOString(),
    lastAssignedAt: new Date().toISOString(),
    assignmentCount: 3,
  },
];

const meta: Meta = {
  title: 'JiraFieldPattern/JiraFieldImplementations',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

const ImplementationDemo = () => {
  const [status, setStatus] = useState('in_review');
  const [assignee, setAssignee] = useState<AssigneeValue>('2');
  const [priority, setPriority] = useState<PriorityValue>('HIGH');
  const [labels, setLabels] = useState<string[]>(['frontend', 'jira']);
  const [description, setDescription] = useState('Add Jira-like field behaviors.');

  return (
    <div className="flex w-[560px] flex-col gap-4">
      <JiraStatusField value={status} onChange={setStatus} />
      <JiraAssigneeField
        users={users}
        recentUsers={recentUsers}
        value={assignee}
        onChange={setAssignee}
      />
      <JiraPriorityField value={priority} onChange={setPriority} />
      <JiraLabelsField labels={labels} onChange={setLabels} />
      <JiraDescriptionField
        value={description}
        onSave={setDescription}
        onCancel={() => {}}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <ImplementationDemo />,
};

export const EmptyAndLoading: Story = {
  render: () => (
    <div className="flex w-[560px] flex-col gap-4">
      <JiraStatusField value={null} emptyText="No status" />
      <JiraAssigneeField users={users} value={null} emptyText="Assign" />
      <JiraPriorityField value={null} />
      <JiraLabelsField labels={[]} />
      <JiraDescriptionField value="" emptyText="Add a description" />
      <JiraPriorityField value="HIGH" isLoading />
    </div>
  ),
};
