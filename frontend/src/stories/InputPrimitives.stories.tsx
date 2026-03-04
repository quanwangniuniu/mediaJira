import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Checkbox,
  MultiSelect,
  Select,
  TextArea,
  TextInput,
} from '@/components/input/InputPrimitives';

const meta: Meta<typeof TextInput> = {
  title: 'Input/Primitives',
  component: TextInput,
  subcomponents: { 
    TextArea: TextArea as any, 
    Checkbox: Checkbox as any, 
    Select: Select as any, 
    MultiSelect: MultiSelect as any 
  },
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: { control: 'text' },
    hint: { control: 'text' },
    error: { control: 'text' },
    className: { control: 'text' },
    required: { control: 'boolean' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof TextInput>;

export const TextInputExample: Story = {
  args: {
    label: 'Project name',
    placeholder: 'Add a name',
    hint: 'Used on dashboards and notifications.',
    required: true,
    error: 'Project name is required.',
    disabled: false,
  },
  render: (args) => (
    <div className="w-80 space-y-6">
      <TextInput {...args} />
      <TextInput
        label="Optional notes"
        placeholder="Add a short note"
        hint="This one is not required."
      />
      <TextInput label="Disabled input" placeholder="Not editable" disabled />
    </div>
  ),
};

export const TextAreaExample: Story = {
  render: () => (
    <div className="w-80 space-y-6">
      <TextArea
        label="Notes"
        placeholder="Write a short summary"
        hint="Supports markdown shortcuts."
      />
      <TextArea label="Disabled notes" placeholder="Not editable" disabled />
    </div>
  ),
};

export const CheckboxExample: Story = {
  render: () => (
    <div className="w-80 space-y-6">
      <Checkbox label="Enable weekly digest" description="We will send you a Monday summary." />
      <Checkbox
        label="Disabled option"
        description="This setting is locked."
        disabled
      />
    </div>
  ),
};

export const SelectExample: Story = {
  render: () => (
    <div className="w-80 space-y-6">
      <Select
        label="Timezone"
        options={[
          { label: 'Select timezone', value: '' },
          { label: 'UTC -08:00', value: 'pst' },
          { label: 'UTC -05:00', value: 'est' },
          { label: 'UTC +01:00', value: 'cet' },
        ]}
      />
      <Select
        label="Disabled select"
        options={[
          { label: 'Not available', value: 'disabled' },
        ]}
        disabled
      />
    </div>
  ),
};

function MultiSelectStory() {
  const [teams, setTeams] = useState<string[]>(['design']);

  return (
    <div className="w-96">
      <MultiSelect
        label="Teams"
        hint="Pick all teams that should be notified."
        options={[
          { label: 'Design', value: 'design' },
          { label: 'Engineering', value: 'engineering' },
          { label: 'Marketing', value: 'marketing' },
          { label: 'Support', value: 'support', disabled: true },
        ]}
        value={teams}
        onChange={setTeams}
      />
    </div>
  );
}

export const MultiSelectExample: Story = {
  render: () => <MultiSelectStory />,
};

export const TextInputControls: Story = {
  args: {
    label: 'Editable label',
    placeholder: 'Type here',
    hint: 'Adjust args to see changes live.',
    error: '',
    required: false,
    disabled: false,
    className: 'w-80',
  },
  render: (args) => <TextInput {...args} />,
};
