import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ProfilePage from '../../jiraProfile/ProfilePage';

const meta: Meta<typeof ProfilePage> = {
  title: 'JiraProfile/ProfilePage',
  component: ProfilePage,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ProfilePage>;

export const Default: Story = {
  render: () => (
    <ProfilePage
      user={{
        username: 'Eason Qi',
        first_name: 'Eason',
        last_name: 'Qi',
        email: 'eason@example.com',
        role: 'Frontend Engineer',
      }}
    />
  ),
};

export const WithAvatar: Story = {
  render: () => (
    <ProfilePage
      user={{
        username: 'Alex Morgan',
        first_name: 'Alex',
        last_name: 'Morgan',
        email: 'alex@example.com',
        role: 'Product Designer',
        avatar: '/profile-avatar.svg',
      }}
    />
  ),
};
