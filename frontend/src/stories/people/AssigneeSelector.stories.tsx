import React, { useState } from 'react';
import AssigneeSelector from '../../people/AssigneeSelector';

interface User {
  id: string | number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

interface RecentUser extends User {
  lastUsedAt: string;
  lastAssignedAt?: string;
}

type AssigneeValue = string | number | null | 'unassigned';

const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    role: 'Developer',
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=7C3AED&color=fff',
    role: 'Designer',
  },
  {
    id: '3',
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    role: 'Manager',
  },
];

const mockRecentUsers: RecentUser[] = [
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    avatar: 'https://ui-avatars.com/api/?name=Jane+Smith&background=7C3AED&color=fff',
    role: 'Designer',
    lastUsedAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    role: 'Developer',
    lastUsedAt: '2024-01-14T10:00:00.000Z',
  },
];

export default {
  title: 'People/AssigneeSelector',
  component: AssigneeSelector,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export const Default = {
  render: () => {
    const [value, setValue] = useState<AssigneeValue>(null);
    return (
      <AssigneeSelector
        users={mockUsers}
        recentUsers={mockRecentUsers}
        value={value}
        onChange={setValue}
        placeholder="Assign to..."
      />
    );
  },
};

export const Unassigned = {
  render: () => {
    const [value, setValue] = useState<AssigneeValue>('unassigned');
    return (
      <AssigneeSelector
        users={mockUsers}
        recentUsers={mockRecentUsers}
        value={value}
        onChange={setValue}
        placeholder="Assign to..."
      />
    );
  },
};

export const Assigned = {
  render: () => {
    const [value, setValue] = useState<AssigneeValue>('2');
    return (
      <AssigneeSelector
        users={mockUsers}
        recentUsers={mockRecentUsers}
        value={value}
        onChange={setValue}
        placeholder="Assign to..."
      />
    );
  },
};
