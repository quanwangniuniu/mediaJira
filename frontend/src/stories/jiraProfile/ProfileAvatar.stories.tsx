import type { Meta, StoryObj } from '@storybook/react';
import Avatar from '../../jiraProfile/ProfileAvatar';

const meta: Meta<typeof Avatar> = {
  title: 'JiraProfile/Avatar',
  component: Avatar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Avatar>;

export const Image: Story = {
  args: {
    src: '/profile-avatar.svg',
    name: 'Eason Qi',
    size: 'lg',
  },
};

export const Initials: Story = {
  args: {
    name: 'Eason Qi',
    size: 'lg',
  },
};

export const BrokenImage: Story = {
  args: {
    src: '/broken-image.png',
    name: 'Eason Qi',
    size: 'lg',
  },
};
