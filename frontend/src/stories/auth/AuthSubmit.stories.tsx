import React from 'react';
import AuthSubmit from '../../components/auth/AuthSubmit';

const meta = {
  title: 'Auth/AuthSubmit',
  argTypes: {
    submitLabel: {
      control: 'text',
      description: 'Primary submit button label.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    loadingLabel: {
      control: 'text',
      description: 'Label shown while loading.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    dividerText: {
      control: 'text',
      description: 'Divider label text.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    googleLabel: {
      control: 'text',
      description: 'Google button label.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    loading: {
      control: 'boolean',
      description: 'Shows loading state.',
      table: {
        type: { summary: 'boolean' },
        category: 'State',
      },
    },
    disabled: {
      control: 'boolean',
      description: 'Disables submit button.',
      table: {
        type: { summary: 'boolean' },
        category: 'State',
      },
    },
    googleDisabled: {
      control: 'boolean',
      description: 'Disables Google button.',
      table: {
        type: { summary: 'boolean' },
        category: 'State',
      },
    },
    showDivider: {
      control: 'boolean',
      description: 'Show or hide the divider.',
      table: {
        type: { summary: 'boolean' },
        category: 'Layout',
      },
    },
    showGoogle: {
      control: 'boolean',
      description: 'Show or hide the Google button.',
      table: {
        type: { summary: 'boolean' },
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
        component: 'Auth submit actions for login/register flows.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const LoginDefault = {
  args: {
    submitLabel: 'Sign in',
    loadingLabel: '',
    dividerText: 'Or continue with',
    googleLabel: 'Sign in with Google',
    loading: false,
    disabled: false,
    googleDisabled: false,
    showDivider: true,
    showGoogle: true,
  },
  parameters: {
    controls: {
      include: [
        'submitLabel',
        'loadingLabel',
        'dividerText',
        'googleLabel',
        'loading',
        'disabled',
        'googleDisabled',
        'showDivider',
        'showGoogle',
      ],
    },
  },
  render: (args: {
    submitLabel: string;
    loadingLabel: string;
    dividerText: string;
    googleLabel: string;
    loading: boolean;
    disabled: boolean;
    googleDisabled: boolean;
    showDivider: boolean;
    showGoogle: boolean;
  }) => (
    <div className="w-80">
      <AuthSubmit
        loading={args.loading}
        disabled={args.disabled}
        onSubmitClick={() => {}}
        submitLabel={args.submitLabel}
        loadingLabel={args.loadingLabel || undefined}
        dividerText={args.dividerText}
        googleLabel={args.googleLabel}
        googleDisabled={args.googleDisabled}
        showDivider={args.showDivider}
        showGoogle={args.showGoogle}
        onGoogleLogin={() => {}}
      />
    </div>
  ),
};

export const Loading = {
  parameters: {
    controls: {
      exclude: [
        'submitLabel',
        'loadingLabel',
        'dividerText',
        'googleLabel',
        'loading',
        'disabled',
        'googleDisabled',
        'showDivider',
        'showGoogle',
      ],
    },
  },
  render: () => (
    <div className="w-80">
      <AuthSubmit
        loading={true}
        disabled={true}
        onSubmitClick={() => {}}
        submitLabel="Sign in"
        dividerText="Or continue with"
        googleLabel="Sign in with Google"
        onGoogleLogin={() => {}}
      />
    </div>
  ),
};

export const SignInDisabled = {
  parameters: {
    controls: {
      exclude: [
        'submitLabel',
        'loadingLabel',
        'dividerText',
        'googleLabel',
        'loading',
        'disabled',
        'googleDisabled',
        'showDivider',
        'showGoogle',
      ],
    },
  },
  render: () => (
    <div className="w-80">
      <AuthSubmit
        loading={false}
        disabled={true}
        onSubmitClick={() => {}}
        submitLabel="Sign in"
        dividerText="Or continue with"
        googleLabel="Sign in with Google"
        onGoogleLogin={() => {}}
      />
    </div>
  ),
};

export const RegisterLabels = {
  parameters: {
    controls: {
      exclude: [
        'submitLabel',
        'loadingLabel',
        'dividerText',
        'googleLabel',
        'loading',
        'disabled',
        'googleDisabled',
        'showDivider',
        'showGoogle',
      ],
    },
  },
  render: () => (
    <div className="w-80">
      <AuthSubmit
        loading={false}
        disabled={false}
        onSubmitClick={() => {}}
        submitLabel="Create Account"
        loadingLabel="Creating Account..."
        dividerText="Or sign up with"
        googleLabel="Sign up with Google"
        onGoogleLogin={() => {}}
      />
    </div>
  ),
};
