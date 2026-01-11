import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { MultiSelect } from '../components/ui/inputs/MultiSelect';

const meta: Meta<typeof MultiSelect> = {
  title: 'UI/Inputs/MultiSelect',
  component: MultiSelect,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A multi-select dropdown input primitive that displays selected items as removable tags/chips.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the multi-select input.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when no options are selected.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Select options' },
        category: 'Content',
      },
    },
    value: {
      control: 'object',
      description: 'Array of selected values.',
      table: {
        type: { summary: 'string[]' },
        category: 'State',
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the multi-select input is disabled.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    error: {
      control: 'boolean',
      description: 'Whether the multi-select input is in an error state.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the input.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    errorText: {
      control: 'text',
      description: 'Error message displayed when error is true.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    onValueChange: {
      action: 'value changed',
      description: 'Callback fired when the selected values change.',
      table: {
        type: { summary: '(value: string[]) => void' },
        category: 'Events',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue.js' },
  { value: 'angular', label: 'Angular' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'ember', label: 'Ember.js' },
  { value: 'backbone', label: 'Backbone.js' },
];

export const Empty: Story = {
  args: {
    label: 'Choose frameworks',
    placeholder: 'Select your preferred frameworks',
    options: sampleOptions,
    value: [],
  },
};

export const WithSelections: Story = {
  args: {
    label: 'Selected Frameworks',
    options: sampleOptions,
    value: ['react', 'vue', 'svelte'],
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Multi-Select',
    options: sampleOptions,
    value: ['react', 'angular'],
    disabled: true,
  },
};

export const WithError: Story = {
  args: {
    label: 'Required Skills',
    placeholder: 'Select at least one skill',
    error: true,
    errorText: 'Please select at least one skill.',
    options: [
      { value: 'javascript', label: 'JavaScript' },
      { value: 'typescript', label: 'TypeScript' },
      { value: 'python', label: 'Python' },
      { value: 'java', label: 'Java' },
      { value: 'csharp', label: 'C#' },
    ],
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Hobbies',
    placeholder: 'Choose your hobbies',
    helperText: 'You can select multiple hobbies from the list.',
    options: [
      { value: 'reading', label: 'Reading' },
      { value: 'sports', label: 'Sports' },
      { value: 'music', label: 'Music' },
      { value: 'cooking', label: 'Cooking' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'travel', label: 'Travel' },
    ],
  },
};

// Interactive example
export const Interactive: Story = {
  render: () => {
    const InteractiveMultiSelect = () => {
      const [selectedSkills, setSelectedSkills] = React.useState<string[]>(['javascript']);

      const skills = [
        { value: 'javascript', label: 'JavaScript' },
        { value: 'typescript', label: 'TypeScript' },
        { value: 'react', label: 'React' },
        { value: 'vue', label: 'Vue.js' },
        { value: 'angular', label: 'Angular' },
        { value: 'node', label: 'Node.js' },
        { value: 'python', label: 'Python' },
        { value: 'java', label: 'Java' },
        { value: 'csharp', label: 'C#' },
        { value: 'php', label: 'PHP' },
      ];

      return (
        <div className="space-y-4">
          <MultiSelect
            label="Technical Skills"
            placeholder="Select your skills"
            value={selectedSkills}
            onValueChange={setSelectedSkills}
            options={skills}
            helperText={`Selected ${selectedSkills.length} skill${selectedSkills.length !== 1 ? 's' : ''}`}
          />

          <div className="text-sm text-gray-600">
            <strong>Selected skills:</strong> {selectedSkills.length > 0
              ? skills.filter(s => selectedSkills.includes(s.value)).map(s => s.label).join(', ')
              : 'None'
            }
          </div>
        </div>
      );
    };

    return <InteractiveMultiSelect />;
  },
};

export const ManySelections: Story = {
  args: {
    label: 'All Selected',
    options: sampleOptions,
    value: ['react', 'vue', 'angular', 'svelte', 'ember'],
  },
};
