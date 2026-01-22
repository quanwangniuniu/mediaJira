import type { Meta, StoryObj } from '@storybook/react';
import AccountButton from '../../jiraProfile/AccountButton';

const meta: Meta<typeof AccountButton> = {
  title: 'JiraProfile/AccountButton',
  component: AccountButton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof AccountButton>;

export const Default: Story = {};

export const Disabled: Story = {
  render: () => <AccountButton className="pointer-events-none opacity-50" />,
};

export const FullWidth: Story = {
  render: () => <AccountButton className="w-full" />,
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-3">
      <AccountButton className="text-xs py-1.5" />
      <AccountButton />
      <AccountButton className="text-base py-2.5" />
    </div>
  ),
};
