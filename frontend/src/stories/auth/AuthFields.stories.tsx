import React from 'react';
import AuthFields from '../../components/auth/AuthFields';

const meta = {
  title: 'Auth/AuthFields',
  argTypes: {
    label: {
      control: 'text',
      description: 'Field label text.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    value: {
      control: 'text',
      description: 'Input value.',
      table: {
        type: { summary: 'string' },
        category: 'State',
      },
    },
    error: {
      control: 'text',
      description: 'Validation error text.',
      table: {
        type: { summary: 'string' },
        category: 'State',
      },
    },
    required: {
      control: 'boolean',
      description: 'Marks the field as required.',
      table: {
        type: { summary: 'boolean' },
        category: 'State',
      },
    },
    type: {
      control: 'select',
      options: ['text', 'email', 'password'],
      description: 'Input type.',
      table: {
        type: { summary: 'string' },
        category: 'Layout',
      },
    },
  },
  parameters: {
    layout: 'centered',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Auth input fields used by login and register flows.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  args: {
    label: 'Email',
    placeholder: 'Enter your email',
    error: '',
    required: true,
    type: 'email',
    value: '',
  },
  parameters: {
    controls: {
      include: ['label', 'placeholder', 'value', 'error', 'required', 'type'],
    },
  },
  render: (args: {
    label: string;
    placeholder: string;
    error: string;
    required: boolean;
    type: string;
    value: string;
  }) => (
    <div className="w-80">
      <AuthFields
        fields={[
          {
            label: args.label,
            type: args.type,
            name: 'field',
            value: args.value,
            onChange: () => {},
            error: args.error,
            required: args.required,
            placeholder: args.placeholder,
          },
        ]}
      />
    </div>
  ),
};

export const LoginDefault = {
  render: () => (
    <div className="w-80">
      <AuthFields
        fields={[
          {
            label: 'Email',
            type: 'email',
            name: 'email',
            value: '',
            onChange: () => {},
            required: true,
            placeholder: 'Enter your email',
          },
          {
            label: 'Password',
            type: 'password',
            name: 'password',
            value: '',
            onChange: () => {},
            required: true,
            placeholder: 'Enter your password',
          },
        ]}
      />
    </div>
  ),
};

export const LoginInvalid = {
  render: () => (
    <div className="w-80">
      <AuthFields
        fields={[
          {
            label: 'Email',
            type: 'email',
            name: 'email',
            value: 'bad-email',
            onChange: () => {},
            error: 'Enter a valid email address.',
            required: true,
            placeholder: 'Enter your email',
          },
          {
            label: 'Password',
            type: 'password',
            name: 'password',
            value: '123',
            onChange: () => {},
            error: 'Password must be at least 8 characters.',
            required: true,
            placeholder: 'Enter your password',
          },
        ]}
      />
    </div>
  ),
};

export const RegisterFields = {
  render: () => (
    <div className="w-80">
      <AuthFields
        fields={[
          {
            label: 'Username',
            type: 'text',
            name: 'username',
            value: 'Jordan Lee',
            onChange: () => {},
            required: true,
            placeholder: 'Enter your username',
          },
          {
            label: 'Email',
            type: 'email',
            name: 'email',
            value: 'jordan@example.com',
            onChange: () => {},
            required: true,
            placeholder: 'Enter your email address',
          },
          {
            label: 'Password',
            type: 'password',
            name: 'password',
            value: '',
            onChange: () => {},
            required: true,
            placeholder: 'Create a password (min 8 characters)',
          },
          {
            label: 'Confirm Password',
            type: 'password',
            name: 'confirmPassword',
            value: '',
            onChange: () => {},
            required: true,
            placeholder: 'Confirm your password',
          },
        ]}
      />
    </div>
  ),
};

