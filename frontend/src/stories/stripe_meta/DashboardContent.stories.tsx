import type { Meta, StoryObj } from '@storybook/react';
import DashboardContent from '@/components/stripe_meta/DashboardContent';

const defaultUser = {
  username: 'johndoe',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  organization: { id: 1, name: 'Example Organization' },
};

const meta: Meta<typeof DashboardContent> = {
  title: 'StripeMeta/DashboardContent',
  component: DashboardContent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Dashboard tab content: account info, subscription, usage. Uses mocked useStripe (getSubscription, getUsage) and usePlan (cancelSubscription) in Storybook.',
      },
    },
    chromatic: { disableSnapshot: false, viewports: [768, 1200] },
  },
  tags: ['autodocs'],
  argTypes: {
    user: {
      description: 'Current user with optional organization',
      control: false,
    },
  },
};

export default meta;

type Story = StoryObj<typeof DashboardContent>;

/**
 * User with organization. Subscription and usage come from mocked useStripe.
 */
export const Default: Story = {
  args: {
    user: defaultUser,
  },
};

/**
 * User without organization. Shows "Organization Required" for subscription and usage.
 */
export const NoOrganization: Story = {
  args: {
    user: {
      username: 'johndoe',
      email: 'john.doe@example.com',
      first_name: 'John',
      last_name: 'Doe',
      organization: null,
    },
  },
};

/**
 * Minimal user (no first/last name). Uses username as fallback.
 */
export const MinimalUser: Story = {
  args: {
    user: {
      username: 'jane',
      email: 'jane@example.com',
      organization: { id: 2, name: 'Acme Corp' },
    },
  },
};
