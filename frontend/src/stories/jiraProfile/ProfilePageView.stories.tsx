import type { Meta, StoryObj } from '@storybook/react';
import ProfilePageView from '../../components/jiraProfile/ProfilePageView';

const meta: Meta<typeof ProfilePageView> = {
  title: 'Profile/ProfilePageView',
  component: ProfilePageView,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ProfilePageView>;

export const View: Story = {
  args: {
    user: {
      name: 'Eason Qi',
      email: 'eason@example.com',
      role: 'Frontend Engineer',
      avatar: '/profile-avatar.svg',
    },
  },
};

export const Edit: Story = {
  args: {
    user: {
      name: 'Alex Morgan',
      email: 'alex@example.com',
      role: 'Product Designer',
    },
    initialEditing: true,
    initialFields: {
      job: 'Product Designer',
      department: 'Design',
      organization: 'MediaJira',
      location: 'New York',
    },
  },
};
