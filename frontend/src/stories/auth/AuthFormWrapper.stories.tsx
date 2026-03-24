import React from 'react';
import AuthFormWrapper from '../../components/auth/AuthFormWrapper';

const meta = {
  title: 'Auth/AuthFormWrapper',
  argTypes: {
    title: {
      control: 'text',
      description: 'Title shown at the top of the auth form.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    subtitle: {
      control: 'text',
      description: 'Optional subtitle shown under the title.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
  },
  parameters: {
    layout: 'padded',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Auth form wrapper with background and container layout.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  args: {
    title: 'Sign In',
    subtitle: '',
  },
  render: (args: { title: string; subtitle?: string }) => (
    <AuthFormWrapper title={args.title} subtitle={args.subtitle}>
      <div className="text-center text-sm text-gray-600">Form content goes here</div>
    </AuthFormWrapper>
  ),
};

export const WithSubtitle = {
  args: {
    title: 'Set Your Password',
    subtitle: 'Complete your Google sign-up by setting a password',
  },
  render: (args: { title: string; subtitle?: string }) => (
    <AuthFormWrapper title={args.title} subtitle={args.subtitle}>
      <div className="text-center text-sm text-gray-600">Form content goes here</div>
    </AuthFormWrapper>
  ),
};
