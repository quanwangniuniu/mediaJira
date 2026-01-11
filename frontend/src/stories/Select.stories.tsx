import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Select } from '../components/ui/inputs/Select';

const meta: Meta<typeof Select> = {
  title: 'UI/Inputs/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A select dropdown input primitive with support for labels, options, validation states, and helper text.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the select.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when no option is selected.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    value: {
      control: 'text',
      description: 'The currently selected value.',
      table: {
        type: { summary: 'string' },
        category: 'State',
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the select is disabled.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    required: {
      control: 'boolean',
      description: 'Whether the select is required.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'Validation',
      },
    },
    error: {
      control: 'boolean',
      description: 'Whether the select is in an error state.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the select.',
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
      description: 'Callback fired when the selected value changes.',
      table: {
        type: { summary: '(value: string) => void' },
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
];

export const Default: Story = {
  args: {
    label: 'Choose Framework',
    placeholder: 'Select a framework',
    options: sampleOptions,
  },
};

export const WithValue: Story = {
  args: {
    label: 'Selected Framework',
    options: sampleOptions,
    value: 'react',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Select',
    options: sampleOptions,
    value: 'angular',
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    label: 'Required Selection',
    placeholder: 'Please make a selection',
    options: sampleOptions,
    required: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Preferred Framework',
    placeholder: 'Choose your favorite',
    options: sampleOptions,
    helperText: 'Select the framework you are most comfortable with.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Framework Selection',
    placeholder: 'Please select a framework',
    options: sampleOptions,
    error: true,
    errorText: 'You must select a framework to continue.',
  },
};

export const WithDisabledOptions: Story = {
  args: {
    label: 'Available Frameworks',
    placeholder: 'Select framework',
    options: [
      { value: 'react', label: 'React' },
      { value: 'vue', label: 'Vue.js' },
      { value: 'angular', label: 'Angular (deprecated)', disabled: true },
      { value: 'svelte', label: 'Svelte' },
      { value: 'ember', label: 'Ember.js (deprecated)', disabled: true },
    ],
    helperText: 'Deprecated frameworks are not available for selection.',
  },
};

// Interactive example
export const Interactive: Story = {
  render: () => {
    const InteractiveSelect = () => {
      const [framework, setFramework] = React.useState('');
      const [experience, setExperience] = React.useState('');
      const [isValid, setIsValid] = React.useState(true);

      const handleFrameworkChange = (value: string) => {
        setFramework(value);
        setIsValid(true); // Reset validation on change
      };

      const handleSubmit = () => {
        if (!framework) {
          setIsValid(false);
          return;
        }
        alert(`Selected: ${framework}, Experience: ${experience}`);
      };

      const experienceOptions = [
        { value: 'beginner', label: 'Beginner (0-1 years)' },
        { value: 'intermediate', label: 'Intermediate (1-3 years)' },
        { value: 'advanced', label: 'Advanced (3-5 years)' },
        { value: 'expert', label: 'Expert (5+ years)' },
      ];

      return (
        <div className="space-y-4 max-w-md">
          <Select
            label="Primary Framework"
            placeholder="Select your main framework"
            options={sampleOptions}
            value={framework}
            onValueChange={handleFrameworkChange}
            error={!isValid}
            errorText={!isValid ? "Please select a framework." : undefined}
            required
          />

          <Select
            label="Experience Level"
            placeholder="Select your experience level"
            options={experienceOptions}
            value={experience}
            onValueChange={setExperience}
            helperText="This helps us tailor recommendations for you."
          />

          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Submit
          </button>

          <div className="text-sm text-gray-600">
            <strong>Current selection:</strong><br />
            Framework: {framework || 'None'}<br />
            Experience: {experience || 'None'}
          </div>
        </div>
      );
    };

    return <InteractiveSelect />;
  },
};

