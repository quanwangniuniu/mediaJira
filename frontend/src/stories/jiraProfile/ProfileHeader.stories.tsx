import type { Meta, StoryObj } from '@storybook/react';
import { Settings } from 'lucide-react';
import ProfileHeader from '../../jiraProfile/ProfileHeader';
import Button from '../../components/button/Button';

const meta: Meta<typeof ProfileHeader> = {
  title: 'JiraProfile/ProfileHeader',
  component: ProfileHeader,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ProfileHeader>;

export const Default: Story = {
  args: {
    displayName: 'Alex Morgan',
    avatarUrl: '/profile-avatar.svg',
  },
};

export const NoAvatar: Story = {
  args: {
    displayName: 'Guest User',
  },
};

export const WithActions: Story = {
  args: {
    displayName: 'Alex Morgan',
    avatarUrl: '/profile-avatar.svg',
    actions: (
      <Button variant="ghost" size="sm" leftIcon={<Settings className="h-4 w-4" />}>
        Settings
      </Button>
    ),
  },
};

export const CustomBackground: Story = {
  args: {
    displayName: 'Alex Morgan',
    avatarUrl: '/profile-avatar.svg',
    backgroundUrl: '/step1.png',
  },
};
