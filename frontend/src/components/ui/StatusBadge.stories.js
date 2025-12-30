import StatusBadge from './StatusBadge';

export default {
  title: 'UI/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['active', 'inactive', 'pending', 'completed', 'failed'],
    },
  },
};

export const Active = {
  args: {
    status: 'active',
  },
};

export const Inactive = {
  args: {
    status: 'inactive',
  },
};

export const Pending = {
  args: {
    status: 'pending',
  },
};

export const Completed = {
  args: {
    status: 'completed',
  },
};

export const Failed = {
  args: {
    status: 'failed',
  },
};

