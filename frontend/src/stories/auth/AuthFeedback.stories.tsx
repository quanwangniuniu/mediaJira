import React from 'react';
import AuthFeedback from '../../components/auth/AuthFeedback';

const meta = {
  title: 'Auth/AuthFeedback',
  argTypes: {
    generalError: {
      control: 'text',
      description: 'General error message displayed above the fields.',
      table: {
        type: { summary: 'string' },
        category: 'Feedback',
      },
    },
    showEmailVerificationHelp: {
      control: 'boolean',
      description: 'Shows the email verification help callout.',
      table: {
        type: { summary: 'boolean' },
        category: 'Feedback',
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
        component: 'Auth error and email verification feedback messages.',
      },
    },
  },
  tags: ['autodocs'],
  args: {
    generalError: 'Invalid email or password.',
    showEmailVerificationHelp: false,
  },
};

export default meta;

export const GeneralError = {
  render: (args: { generalError: string; showEmailVerificationHelp: boolean }) => (
    <div className="w-80">
      <AuthFeedback
        generalError={args.generalError}
        showEmailVerificationHelp={args.showEmailVerificationHelp}
        onDismissEmailVerification={() => {}}
      />
    </div>
  ),
};

export const EmailVerificationRequired = {
  args: {
    generalError: '',
    showEmailVerificationHelp: true,
  },
  render: (args: { generalError: string; showEmailVerificationHelp: boolean }) => (
    <div className="w-80">
      <AuthFeedback
        generalError={args.generalError}
        showEmailVerificationHelp={args.showEmailVerificationHelp}
        onDismissEmailVerification={() => {}}
      />
    </div>
  ),
};

export const ErrorWithVerificationHelp = {
  args: {
    generalError: 'Your email is not verified.',
    showEmailVerificationHelp: true,
  },
  render: (args: { generalError: string; showEmailVerificationHelp: boolean }) => (
    <div className="w-80">
      <AuthFeedback
        generalError={args.generalError}
        showEmailVerificationHelp={args.showEmailVerificationHelp}
        onDismissEmailVerification={() => {}}
      />
    </div>
  ),
};
