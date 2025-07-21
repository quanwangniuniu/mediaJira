'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  FormContainer, 
  FormInput, 
  FormButton, 
  ErrorMessage
} from '../../components/form';
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

  const handleGoogleLogin = (): void => {
    toast.error('Google auth not implemented yet');
  };

  // Disable submit button if form has validation errors (excluding general errors)
  const formHasValidationErrors = hasValidationErrors(errors);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <FormContainer title="Sign In" subtitle="">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <ErrorMessage message={errors.general} />
          )}
          
          {showEmailVerificationHelp && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Email Verification Required
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>Your account needs to be verified before you can log in. Please:</p>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>Check your email inbox for a verification message</li>
                      <li>Click the verification link in the email</li>
                      <li>Check your spam folder if you don't see the email</li>
                    </ul>
                  </div>
                  <div className="mt-3 flex space-x-3">
                    <Link 
                      href="/register"
                      className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1.5 rounded transition-colors"
                    >
                      Register Again
                    </Link>
                    <button 
                      type="button"
                      onClick={() => setShowEmailVerificationHelp(false)}
                      className="text-sm text-blue-600 hover:text-blue-500"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <FormInput
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            placeholder="Enter your email"
          />
          
          <FormInput
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            placeholder="Enter your password"
          />
          
          <div className="flex items-center justify-end">
            <Link 
              href="/forgot-password" 
              className="text-sm font-medium text-gray-600 hover:text-gray-500 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          
          <FormButton
            type="submit"
            onClick={() => {}} // Empty onClick for submit buttons
            loading={loading}
            disabled={loading || formHasValidationErrors}
          >
            Sign in
          </FormButton>
          
          <div className="text-center">
            <span className="text-gray-600">Don't have an account? </span>
            <Link 
              href="/register" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign up
            </Link>
          </div>
          
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>
          
          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full relative flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
          >
            <div className="absolute left-4 flex items-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path 
                  fill="#4285F4" 
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path 
                  fill="#34A853" 
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path 
                  fill="#FBBC05" 
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path 
                  fill="#EA4335" 
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            <span className="flex-1 text-center">Sign in with Google</span>
          </button>
        </form>
      </FormContainer>
    </div>
  );
}

export default LoginPageContent;
