import React, { useState } from 'react';
import UserPicker from '../../people/UserPicker';

interface User {
  id: string | number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
}

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

export default {
  title: 'People/UserPicker',
  component: UserPicker,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export const Default = {
  render: () => {
    const [value, setValue] = useState<string | number | null>(null);
    return (
      <UserPicker
        users={mockUsers}
        value={value}
        onChange={setValue}
        placeholder="Select user..."
      />
    );
  },
};

export const WithSelection = {
  render: () => {
    const [value, setValue] = useState<string | number | null>('1');
    return (
      <UserPicker
        users={mockUsers}
        value={value}
        onChange={setValue}
        placeholder="Select user..."
      />
    );
  },
};

export const Loading = {
  args: {
    users: mockUsers,
    value: null,
    placeholder: 'Select user...',
    loading: true,
    onChange: () => {},
  },
};

export const Disabled = {
  args: {
    users: mockUsers,
    value: '1',
    placeholder: 'Select user...',
    disabled: true,
    onChange: () => {},
  },
};
