import type { Meta, StoryObj } from '@storybook/react';
import OrganizationContent from '@/components/stripe_meta/OrganizationContent';

const userWithOrg = {
  username: 'johndoe',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  roles: ['Organization Admin'],
  organization: { id: 1, name: 'Example Organization' },
};

const userWithoutOrg = {
  username: 'johndoe',
  email: 'john.doe@example.com',
  first_name: 'John',
  last_name: 'Doe',
  roles: [] as string[],
  organization: null,
};

const meta: Meta<typeof OrganizationContent> = {
  title: 'StripeMeta/OrganizationContent',
  component: OrganizationContent,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'My Organization tab: org details, members list, create org CTA. Uses mocked useStripe (getOrganizationUsers, createOrganization, removeOrganizationUser) in Storybook.',
      },
    },
    chromatic: { disableSnapshot: false, viewports: [768, 1200] },
  },
  tags: ['autodocs'],
  argTypes: {
    user: {
      description: 'Current user; organization and roles control visibility',
      control: false,
    },
  },
};

export default meta;

type Story = StoryObj<typeof OrganizationContent>;

/**
 * User with organization (admin). Shows org details and members from mocked useStripe.
 */
export const WithOrganization: Story = {
  args: {
    user: userWithOrg,
  },
};

/**
 * User with organization but not admin. No invite/remove actions.
 */
export const WithOrganizationMember: Story = {
  args: {
    user: {
      ...userWithOrg,
      roles: [],
    },
  },
};

/**
 * User without organization. Shows "Create Organization" and "Join Existing" CTA.
 */
export const NoOrganization: Story = {
  args: {
    user: userWithoutOrg,
  },
};
