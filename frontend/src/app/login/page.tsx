'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthFormWrapper from '../../components/auth/AuthFormWrapper';
import AuthFeedback from '../../components/auth/AuthFeedback';
import AuthFields from '../../components/auth/AuthFields';
import AuthSubmit from '../../components/auth/AuthSubmit';
import useAuth from '../../hooks/useAuth';
import { validateLoginForm, hasValidationErrors } from '../../utils/validation';
import { LoginRequest, FormValidation } from '../../types/auth';
import toast from 'react-hot-toast';

function LoginPageContent() {
  const { login } = useAuth();
  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<FormValidation>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [showEmailVerificationHelp, setShowEmailVerificationHelp] = useState<boolean>(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormValidation]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear email verification help when user starts typing
    if (showEmailVerificationHelp) {
      setShowEmailVerificationHelp(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors = validateLoginForm(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    const result = await login(formData);
    setLoading(false);
    
    if (!result.success) {
      // Check if the error is about unverified email
      if (result.error?.includes('not verified')) {
        setShowEmailVerificationHelp(true);
      }
      setErrors({ general: result.error });
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    try {
      // Call backend to get Google OAuth URL
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/auth/google/start/`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = data.details || data.error || 'Failed to initiate Google sign-in';
        toast.error(message);
        return;
      }

      if (data.authorization_url) {
        // Redirect to Google OAuth page
        window.location.href = data.authorization_url;
      } else {
        toast.error('Failed to initiate Google sign-in');
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Failed to initiate Google sign-in');
    }
  };

  // Disable submit button if form has validation errors (excluding general errors)
  const formHasValidationErrors = hasValidationErrors(errors);

  return (
    <AuthFormWrapper title="Sign In">
      <form onSubmit={handleSubmit} className="space-y-6">
        <AuthFeedback
          generalError={errors.general}
          showEmailVerificationHelp={showEmailVerificationHelp}
          onDismissEmailVerification={() => setShowEmailVerificationHelp(false)}
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
          loading={loading}
          disabled={loading || formHasValidationErrors}
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
          onGoogleLogin={handleGoogleLogin}
        />
      </form>
    </AuthFormWrapper>
  );
}

export default LoginPageContent;
