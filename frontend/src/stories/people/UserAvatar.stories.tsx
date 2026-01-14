import React from 'react';
import UserAvatar from '../../people/UserAvatar';

export default {
  title: 'People/UserAvatar',
  component: UserAvatar,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    user: {
      name: 'John Doe',
      email: 'john.doe@example.com',
      avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
    },
    size: 'md',
  },
};

export const WithInitials = {
  args: {
    user: {
      name: 'Alice Johnson',
      email: 'alice.johnson@example.com',
    },
    size: 'md',
  },
};

export const WithTooltip = {
  args: {
    user: {
      name: 'Bob Wilson',
      email: 'bob.wilson@example.com',
    },
    size: 'md',
    showTooltip: true,
  },
};
