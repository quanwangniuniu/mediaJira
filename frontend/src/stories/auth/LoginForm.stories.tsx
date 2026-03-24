import React, { useState } from 'react';
import Link from 'next/link';
import AuthFormWrapper from '../../components/auth/AuthFormWrapper';
import AuthFeedback from '../../components/auth/AuthFeedback';
import AuthFields from '../../components/auth/AuthFields';
import AuthSubmit from '../../components/auth/AuthSubmit';
import { FormValidation } from '../../types/auth';

const meta = {
  title: 'Auth/LoginForm',
  argTypes: {},
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Login form UI composed from reusable auth components.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story: React.ComponentType) => (
      <div
        onClickCapture={(event) => {
          const target = event.target as HTMLElement | null;
          const clickable = target?.closest?.('a, button');
          if (clickable) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;

export const Default = {
  render: () => {
    const [formData, setFormData] = useState({
      email: '',
      password: '',
    });
    const [errors, setErrors] = useState<FormValidation>({});

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (errors[name as keyof FormValidation]) {
        setErrors((prev) => ({ ...prev, [name]: '' }));
      }
    };

    return (
      <AuthFormWrapper title="Sign In">
        <form className="space-y-6">
          <AuthFeedback
            generalError={errors.general}
            showEmailVerificationHelp={false}
            onDismissEmailVerification={() => {}}
          />

          <AuthFields
            fields={[
              {
                label: 'Email',
                type: 'email',
                name: 'email',
                value: formData.email,
                onChange: handleChange,
                error: errors.email,
                required: true,
                placeholder: 'Enter your email',
              },
              {
                label: 'Password',
                type: 'password',
                name: 'password',
                value: formData.password,
                onChange: handleChange,
                error: errors.password,
                required: true,
                placeholder: 'Enter your password',
              },
            ]}
            footer={
              <Link
                href="/forgot-password"
                className="text-sm font-medium text-gray-600 hover:text-gray-500 transition-colors"
              >
                Forgot password?
              </Link>
            }
            footerAlign="end"
          />

          <AuthSubmit
          loading={false}
          disabled={false}
            onSubmitClick={() => {}}
            submitLabel="Sign in"
            auxiliary={
              <>
                <span className="text-gray-600">Don't have an account? </span>
                <Link
                  href="/register"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign up
                </Link>
              </>
            }
            dividerText="Or continue with"
            googleLabel="Sign in with Google"
            onGoogleLogin={() => {}}
          />
        </form>
      </AuthFormWrapper>
    );
  },
};

export const ErrorFeedback = {
  render: () => (
    <AuthFormWrapper title="Sign In">
      <form className="space-y-6">
        <AuthFeedback
          generalError="Invalid email or password."
          onDismissEmailVerification={() => {}}
        />

        <AuthFields
          fields={[
            {
              label: 'Email',
              type: 'email',
              name: 'email',
              value: 'jordan@example.com',
              onChange: () => {},
              required: true,
              placeholder: 'Enter your email',
            },
            {
              label: 'Password',
              type: 'password',
              name: 'password',
              value: 'password123',
              onChange: () => {},
              required: true,
              placeholder: 'Enter your password',
            },
          ]}
          footer={
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-gray-600 hover:text-gray-500 transition-colors"
            >
              Forgot password?
            </Link>
          }
          footerAlign="end"
        />

        <AuthSubmit
          loading={false}
          disabled={false}
          onSubmitClick={() => {}}
          submitLabel="Sign in"
          auxiliary={
            <>
              <span className="text-gray-600">Don't have an account? </span>
              <Link
                href="/register"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign up
              </Link>
            </>
          }
          dividerText="Or continue with"
          googleLabel="Sign in with Google"
          onGoogleLogin={() => {}}
        />
      </form>
    </AuthFormWrapper>
  ),
};

export const EmailVerificationFeedback = {
  render: () => (
    <AuthFormWrapper title="Sign In">
      <form className="space-y-6">
        <AuthFeedback
          showEmailVerificationHelp
          onDismissEmailVerification={() => {}}
        />

        <AuthFields
          fields={[
            {
              label: 'Email',
              type: 'email',
              name: 'email',
              value: 'jordan@example.com',
              onChange: () => {},
              required: true,
              placeholder: 'Enter your email',
            },
            {
              label: 'Password',
              type: 'password',
              name: 'password',
              value: 'password123',
              onChange: () => {},
              required: true,
              placeholder: 'Enter your password',
            },
          ]}
          footer={
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-gray-600 hover:text-gray-500 transition-colors"
            >
              Forgot password?
            </Link>
          }
          footerAlign="end"
        />

        <AuthSubmit
          loading={false}
          disabled={false}
          onSubmitClick={() => {}}
          submitLabel="Sign in"
          auxiliary={
            <>
              <span className="text-gray-600">Don't have an account? </span>
              <Link
                href="/register"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign up
              </Link>
            </>
          }
          dividerText="Or continue with"
          googleLabel="Sign in with Google"
          onGoogleLogin={() => {}}
        />
      </form>
    </AuthFormWrapper>
  ),
};