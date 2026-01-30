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
import { validateRegistrationForm, hasValidationErrors } from '../../utils/validation';
import { RegisterRequest, FormValidation } from '../../types/auth';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const { register } = useAuth();
  const [formData, setFormData] = useState<{ 
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormValidation>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const [registrationMessage, setRegistrationMessage] = useState<string>('');

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
  };



  const validateForm = (): boolean => {
    const newErrors = validateRegistrationForm(formData);
    setErrors(newErrors);
    return !hasValidationErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }
    
    setLoading(true);
    
    // Prepare request data according to backend API requirements
    const requestData: RegisterRequest = {
      username: formData.username,
      email: formData.email,
      password: formData.password
    };
    
    console.log('Submitting registration data:', { ...requestData, password: '[HIDDEN]' });
    
    // Call registration API through useAuth hook
    const result = await register(requestData);
    setLoading(false);
    
    if (result.success) {
      setRegistrationSuccess(true);
      setRegistrationMessage(result.data?.message || 'Registration successful! Your account is ready to use.');
    } else {
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

  // Show success message if registration was successful
  if (registrationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
        <FormContainer title="Check Your Email" subtitle="">
          <div className="text-center space-y-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Registration Successful!
              </h3>
              <p className="text-gray-600">
                {registrationMessage}
              </p>
              
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Account Ready!
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your account has been created and is ready to use. You can now log in with your email and password.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>Need to make changes? You can</p>
                <button 
                  type="button"
                  onClick={() => {
                    setRegistrationSuccess(false);
                    setFormData({
                      username: '',
                      email: '',
                      password: '',
                      confirmPassword: ''
                    });
                    setErrors({});
                  }}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  register another account
                </button>
              </div>
              
              <div className="pt-4">
                <Link 
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Go to Login Page
                </Link>
              </div>
            </div>
          </div>
        </FormContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <FormContainer title="Create Account" subtitle="">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <ErrorMessage message={errors.general} />
          )}
          
          <FormInput
            label="Username"
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            error={errors.username}
            required
            placeholder="Enter your username"
          />
          
          <FormInput
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            error={errors.email}
            required
            placeholder="Enter your email address"
          />
          

          
          <FormInput
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required
            placeholder="Create a password (min 8 characters)"
          />
          
          <FormInput
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
            placeholder="Confirm your password"
          />
          
          <div className="text-center">
            <span className="text-gray-600">Already have an account? </span>
            <Link 
              href="/login" 
              className="text-sm font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Sign in
            </Link>
          </div>
          
          <FormButton
            type="submit"
            onClick={() => {}} // Empty onClick for submit buttons
            loading={loading}
            disabled={loading || formHasValidationErrors}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </FormButton>
          
          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>
          
          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full relative flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <span className="flex-1 text-center">Sign up with Google</span>
          </button>
        </form>
      </FormContainer>
    </div>
  );
} 