import { FormValidation } from '../types/auth';

export const validateEmail = (email: string): string => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) return 'Email is required';
  if (!emailRegex.test(email)) return 'Please enter a valid email address';
  return '';
};

export const validatePassword = (password: string): string => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters long';
  return '';
};

export const validateUsername = (name: string): string => {
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters long';
  return '';
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string => {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return '';
};

export const validateOrganizationId = (orgId: string | number | undefined): string => {
  if (!orgId) return ''; // Optional field
  const num = typeof orgId === 'string' ? parseInt(orgId, 10) : orgId;
  if (isNaN(num) || num <= 0) {
    return 'Organization ID must be a valid positive number';
  }
  return '';
};

// Interface for login form data
interface LoginFormData {
  email: string;
  password: string;
}

// Interface for registration form data
interface RegistrationFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  organization_id?: string | number;
}

// Login form validation function
export const validateLoginForm = (formData: LoginFormData): FormValidation => {
  const errors: FormValidation = {};
  
  const emailError = validateEmail(formData.email);
  const passwordError = validatePassword(formData.password);
  
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  
  return errors;
};

// Registration form validation function
export const validateRegistrationForm = (formData: RegistrationFormData): FormValidation => {
  const errors: FormValidation = {};
  
  // Validate each field using utility functions
  const usernameError = validateUsername(formData.username);
  const emailError = validateEmail(formData.email);
  const passwordError = validatePassword(formData.password);
  const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword);
  const organizationIdError = validateOrganizationId(formData.organization_id);
  
  if (usernameError) errors.username = usernameError;
  if (emailError) errors.email = emailError;
  if (passwordError) errors.password = passwordError;
  if (confirmPasswordError) errors.confirmPassword = confirmPasswordError;
  if (organizationIdError) errors.organization_id = organizationIdError;
  
  return errors;
};

// Check if form has validation errors (excluding general errors)
export const hasValidationErrors = (errors: FormValidation): boolean => {
  return !!(
    errors.email ||
    errors.password ||
    errors.username ||
    errors.confirmPassword ||
    errors.organization_id
  );
}; 