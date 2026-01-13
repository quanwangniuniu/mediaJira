import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Field from '@/components/field/Field';

const meta: Meta<typeof Field> = {
  title: 'Patterns/Field',
  component: Field,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'text' },
    emptyText: { control: 'text' },
    isEditable: { control: 'boolean' },
    isReadOnly: { control: 'boolean' },
    className: { control: 'text' },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Field>;

function EditableFieldDemo() {
  const [value, setValue] = useState('Active workspace');

  return (
    <Field
      label="Status"
      value={value}
      isEditable
      onEdit={() => setValue(value === 'Active workspace' ? 'Paused' : 'Active workspace')}
    />
  );
}

export const Overview: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-4">
      <Field label="Owner" value="Jia Chen" />
      <Field label="Budget" value="$24,000" />
      <Field label="Notes" emptyText="Add context" />
      <Field label="Plan" value="Locked" isReadOnly />
    </div>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <div className="w-[420px]">
      <Field label="Description" emptyText="No description added" />
    </div>
  ),
};

export const HoverAffordance: Story = {
  render: () => (
    <div className="w-[420px]">
      <Field label="Tag" value="Priority" isEditable onEdit={() => {}} />
    </div>
  ),
};

export const EditableVsReadOnly: Story = {
  render: () => (
    <div className="flex w-[420px] flex-col gap-4">
      <EditableFieldDemo />
      <Field label="Plan" value="Enterprise" isReadOnly />
    </div>
  ),
};

export const FieldControls: Story = {
  args: {
    label: 'Status',
    value: 'Active',
    emptyText: 'Empty',
    isEditable: true,
    isReadOnly: false,
    className: 'w-[420px]',
  },
  render: (args) => (
    <Field
      {...args}
      onEdit={args.isEditable && !args.isReadOnly ? () => {} : undefined}
    />
  ),
};
