import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TextArea } from '../components/ui/inputs/TextArea';

const meta: Meta<typeof TextArea> = {
  title: 'UI/Inputs/TextArea',
  component: TextArea,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A textarea input primitive with support for labels, placeholders, validation states, and helper text.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the textarea.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when the textarea is empty.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    value: {
      control: 'text',
      description: 'The textarea value.',
      table: {
        type: { summary: 'string' },
        category: 'State',
      },
    },
    rows: {
      control: 'number',
      description: 'Number of visible text lines.',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '3' },
        category: 'Appearance',
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the textarea is disabled.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    required: {
      control: 'boolean',
      description: 'Whether the textarea is required.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'Validation',
      },
    },
    error: {
      control: 'boolean',
      description: 'Whether the textarea is in an error state.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    helperText: {
      control: 'text',
      description: 'Helper text displayed below the textarea.',
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
    onChange: {
      action: 'value changed',
      description: 'Callback fired when the textarea value changes.',
      table: {
        type: { summary: '(event: ChangeEvent<HTMLTextAreaElement>) => void' },
        category: 'Events',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Description',
    placeholder: 'Enter a description...',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Bio',
    placeholder: 'Tell us about yourself',
    value: 'I am a software developer passionate about creating user-friendly interfaces and solving complex problems.',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled TextArea',
    placeholder: 'This textarea is disabled',
    value: 'This content cannot be edited.',
    disabled: true,
  },
};

export const Required: Story = {
  args: {
    label: 'Required Field',
    placeholder: 'This field is required',
    required: true,
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Feedback',
    placeholder: 'Share your thoughts...',
    helperText: 'Please provide detailed feedback to help us improve.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Comments',
    placeholder: 'Enter your comments',
    value: 'This is too short',
    error: true,
    errorText: 'Comments must be at least 10 characters long.',
  },
};

export const LargeRows: Story = {
  args: {
    label: 'Long Description',
    placeholder: 'Enter a detailed description...',
    rows: 6,
    helperText: 'This textarea has 6 rows for longer content.',
  },
};

export const SmallRows: Story = {
  args: {
    label: 'Short Note',
    placeholder: 'Quick note...',
    rows: 2,
  },
};

// Interactive example
export const Interactive: Story = {
  render: () => {
    const InteractiveTextArea = () => {
      const [feedback, setFeedback] = React.useState('');
      const [notes, setNotes] = React.useState('');
      const [isValid, setIsValid] = React.useState(true);

      const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setFeedback(value);
        // Simple validation - at least 10 characters
        setIsValid(value.length >= 10 || value === '');
      };

      return (
        <div className="space-y-4 max-w-md">
          <TextArea
            label="Quick Notes"
            placeholder="Jot down your thoughts..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />

          <TextArea
            label="Detailed Feedback"
            placeholder="Please provide detailed feedback..."
            value={feedback}
            onChange={handleFeedbackChange}
            rows={4}
            error={!isValid}
            errorText={!isValid ? "Feedback must be at least 10 characters long." : undefined}
            helperText="Help us understand your experience."
          />

          <div className="text-sm text-gray-600">
            <strong>Notes length:</strong> {notes.length} characters<br />
            <strong>Feedback length:</strong> {feedback.length} characters
          </div>
        </div>
      );
    };

    return <InteractiveTextArea />;
  },
};
