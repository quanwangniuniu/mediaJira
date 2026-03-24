import React, { useState } from 'react';
import Link from 'next/link';
import AuthFormWrapper from '../../components/auth/AuthFormWrapper';
import AuthFeedback from '../../components/auth/AuthFeedback';
import AuthFields from '../../components/auth/AuthFields';
import AuthSubmit from '../../components/auth/AuthSubmit';
import RegisterSuccessMessage from '../../components/auth/RegisterSuccessMessage';
import { FormButton, FormInput } from '../../components/form';
import { FormValidation } from '../../types/auth';

const meta = {
  title: 'Auth/RegisterForm',
  argTypes: {},
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Register form UI composed from reusable auth components.',
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
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
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
      <AuthFormWrapper title="Create Account">
        <form className="space-y-6">
          <AuthFeedback generalError={errors.general} />

          <AuthFields
            fields={[
              {
                label: 'Username',
                type: 'text',
                name: 'username',
                value: formData.username,
                onChange: handleChange,
                error: errors.username,
                required: true,
                placeholder: 'Enter your username',
              },
              {
                label: 'Email',
                type: 'email',
                name: 'email',
                value: formData.email,
                onChange: handleChange,
                error: errors.email,
                required: true,
                placeholder: 'Enter your email address',
              },
              {
                label: 'Password',
                type: 'password',
                name: 'password',
                value: formData.password,
                onChange: handleChange,
                error: errors.password,
                required: true,
                placeholder: 'Create a password (min 8 characters)',
              },
              {
                label: 'Confirm Password',
                type: 'password',
                name: 'confirmPassword',
                value: formData.confirmPassword,
                onChange: handleChange,
                error: errors.confirmPassword,
                required: true,
                placeholder: 'Confirm your password',
              },
            ]}
            footer={
              <>
                <span className="text-gray-600">Already have an account? </span>
                <Link
                  href="/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign in
                </Link>
              </>
            }
          />

          <AuthSubmit
          loading={false}
          disabled={false}
            onSubmitClick={() => {}}
            submitLabel="Create Account"
            loadingLabel="Creating Account..."
            dividerText="Or sign up with"
            googleLabel="Sign up with Google"
          googleDisabled={false}
            onGoogleLogin={() => {}}
          />
        </form>
      </AuthFormWrapper>
    );
  },
};

export const ErrorFeedback = {
  render: () => (
    <AuthFormWrapper title="Create Account">
      <form className="space-y-6">
        <AuthFeedback generalError="Email is already registered." />

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
              value: 'password123',
              onChange: () => {},
              required: true,
              placeholder: 'Create a password (min 8 characters)',
            },
            {
              label: 'Confirm Password',
              type: 'password',
              name: 'confirmPassword',
              value: 'password123',
              onChange: () => {},
              required: true,
              placeholder: 'Confirm your password',
            },
          ]}
          footer={
            <>
              <span className="text-gray-600">Already have an account? </span>
              <Link
                href="/login"
                className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Sign in
              </Link>
            </>
          }
        />

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
      </form>
    </AuthFormWrapper>
  ),
};

export const SuccessMessage = {
  render: () => (
    <AuthFormWrapper title="Check Your Email">
      <RegisterSuccessMessage
        message="Registration successful! Your account is ready to use."
        onRegisterAnother={() => {}}
      />
    </AuthFormWrapper>
  ),
};

export const GoogleSignup = {
  render: () => (
    <AuthFormWrapper
      title="Set Your Password"
      subtitle="Complete your Google sign-up by setting a password"
    >
      <form className="space-y-6">
        <FormInput
          label="Password"
          type="password"
          name="password"
          value=""
          onChange={() => {}}
          error=""
          required
          placeholder="Create a password (min 8 characters)"
        />

        <FormInput
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value=""
          onChange={() => {}}
          error=""
          required
          placeholder="Confirm your password"
        />

        <FormButton
          type="submit"
          onClick={() => {}}
          loading={false}
          disabled={false}
        >
          Set Password & Continue
        </FormButton>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </form>
    </AuthFormWrapper>
  ),
};
