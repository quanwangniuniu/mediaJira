import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TextInput } from '../components/ui/inputs/TextInput';

const meta: Meta<typeof TextInput> = {
  title: 'UI/Inputs/TextInput',
  component: TextInput,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A text input primitive with support for labels, placeholders, validation states, and helper text.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Label text for the input.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when the input is empty.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    value: {
      control: 'text',
      description: 'The input value.',
      table: {
        type: { summary: 'string' },
        category: 'State',
      },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      description: 'The input type.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'text' },
        category: 'Behavior',
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the input is disabled.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    required: {
      control: 'boolean',
      description: 'Whether the input is required.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'Validation',
      },
    },
    error: {
      control: 'boolean',
      description: 'Whether the input is in an error state.',
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
    onChange: {
      action: 'value changed',
      description: 'Callback fired when the input value changes.',
      table: {
        type: { summary: '(event: ChangeEvent<HTMLInputElement>) => void' },
        category: 'Events',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    type: 'email',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'Enter your full name',
    value: 'John Doe',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Disabled Input',
    placeholder: 'This input is disabled',
    value: 'Cannot edit this',
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
    label: 'Username',
    placeholder: 'Choose a username',
    helperText: 'Your username should be unique and contain only letters and numbers.',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    placeholder: 'Enter your email',
    value: 'invalid-email',
    error: true,
    errorText: 'Please enter a valid email address.',
  },
};

export const Password: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter your password',
    type: 'password',
    helperText: 'Password must be at least 8 characters long.',
  },
};

export const Number: Story = {
  args: {
    label: 'Age',
    placeholder: 'Enter your age',
    type: 'number',
    min: 0,
    max: 120,
  },
};

// Interactive example
export const Interactive: Story = {
  render: () => {
    const InteractiveTextInput = () => {
      const [email, setEmail] = React.useState('');
      const [name, setName] = React.useState('');
      const [isValid, setIsValid] = React.useState(true);

      const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        // Simple email validation
        setIsValid(value.includes('@') || value === '');
      };

      return (
        <div className="space-y-4 max-w-md">
          <TextInput
            label="Name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <TextInput
            label="Email"
            placeholder="Enter your email"
            type="email"
            value={email}
            onChange={handleEmailChange}
            error={!isValid}
            errorText={!isValid ? "Please enter a valid email address." : undefined}
            helperText="We'll use this to send you updates."
          />

          <div className="text-sm text-gray-600">
            <strong>Name:</strong> {name || 'Not provided'}<br />
            <strong>Email:</strong> {email || 'Not provided'}
          </div>
        </div>
      );
    };

    return <InteractiveTextInput />;
  },
};
