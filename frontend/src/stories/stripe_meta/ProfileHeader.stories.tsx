import type { Meta, StoryObj } from '@storybook/react';
import ProfileHeader from '@/components/stripe_meta/ProfileHeader';

const defaultUser = {
  username: 'johndoe',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  avatar: 'https://ui-avatars.com/api/?name=John+Doe&background=0D8ABC&color=fff',
};

const meta: Meta<typeof ProfileHeader> = {
  title: 'StripeMeta/ProfileHeader',
  component: ProfileHeader,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Profile header with avatar (hover to upload), display name, email, and Edit button.',
      },
    },
    chromatic: { disableSnapshot: false, viewports: [768, 1200] },
  },
  tags: ['autodocs'],
  argTypes: {
    user: {
      description: 'User object for display name and avatar',
      control: false,
    },
    onEditClick: {
      description: 'Called when Edit button is clicked',
      action: 'clicked',
    },
  },
};

export default meta;

type Story = StoryObj<typeof ProfileHeader>;

/**
 * Default profile header with full name and avatar.
 */
export const Default: Story = {
  args: {
    user: defaultUser,
    onEditClick: () => {},
  },
};

/**
 * User with only username (no first/last name). Falls back to username.
 */
export const UsernameOnly: Story = {
  args: {
    user: {
      username: 'jane',
      email: 'jane@example.com',
      avatar: 'https://ui-avatars.com/api/?name=Jane&background=6366f1&color=fff',
    },
    onEditClick: () => {},
  },
};

/**
 * Minimal user (no avatar URL). Uses placeholder /profile-avatar.svg.
 */
export const NoAvatar: Story = {
  args: {
    user: {
      username: 'bob',
      email: 'bob@example.com',
      first_name: 'Bob',
      last_name: 'Smith',
    },
    onEditClick: () => {},
  },
};
