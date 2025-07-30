import { useAuthStore } from '../lib/authStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { LoginRequest, RegisterRequest, RegisterResponse, ApiResponse } from '../types/auth';
import { authAPI } from '../lib/api';

// Enhanced useAuth hook that uses Zustand store for state management
export default function useAuth() {
  const {
    user,
    loading,
    isAuthenticated,
    login: storeLogin,
    logout: storeLogout,
    getCurrentUser: storeGetCurrentUser
  } = useAuthStore();
  
  const router = useRouter();

  // Login function with enhanced error handling
  const login = async (credentials: LoginRequest): Promise<ApiResponse<void>> => {
    try {
      const result = await storeLogin(credentials.email, credentials.password);
      
      if (result.success) {
        toast.success('Login successful!');
        router.push('/campaigns');
        return { success: true };
      } else {
        toast.error(result.error || 'Login failed');
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      let message = 'Login failed';
      
      if (error.response?.status === 401) {
        message = 'Invalid email or password';
      } else if (error.response?.status === 403) {
        message = 'Account not verified. Please check your email for verification link.';
      } else if (error.response?.status === 400) {
        message = 'Please enter both email and password';
      } else {
        message = error.response?.data?.error || 'Login failed';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Register function (unchanged from original)
  const register = async (userData: RegisterRequest): Promise<ApiResponse<RegisterResponse>> => {
    try {
      const response = await authAPI.register(userData);
      
      // Registration returns 201 with message, not token
      // User needs to verify email before logging in
      return { success: true, data: response };
    } catch (error: any) {
      let message = 'Registration failed';
      
      // Backend returns 400 for all validation errors, differentiate by message content
      if (error.response?.status === 400) {
        const errorMsg = error.response.data?.error || '';
        
        // Provide user-friendly messages based on backend error messages
        if (errorMsg.includes('Missing fields')) {
          message = 'Please fill in all required fields (username, email, and password)';
        } else if (errorMsg.includes('Password too short')) {
          message = 'Password must be at least 8 characters long';
        } else if (errorMsg.includes('Email already registered')) {
          message = 'An account with this email already exists';
        } else if (errorMsg.includes('Organization not found')) {
          message = 'Invalid organization ID. Please check and try again.';
        } else {
          message = errorMsg || 'Invalid input data';
        }
      } else {
        message = error.response?.data?.error || 'Registration failed';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Get current user function
  const getCurrentUser = async (): Promise<ApiResponse<any>> => {
    try {
      const result = await storeGetCurrentUser();
      return { success: result.success, data: user, error: result.error };
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to get user info';
      return { success: false, error: message };
    }
  };

  // Email verification function (unchanged from original)
  const verifyEmail = async (token: string): Promise<ApiResponse<void>> => {
    try {
      const response = await authAPI.verifyEmail(token);
      toast.success(response.message || 'Email verified successfully!');
      return { success: true };
    } catch (error: any) {
      let message = 'Email verification failed';
      
      if (error.response?.status === 400) {
        message = error.response.data?.error || 'Invalid verification token';
      } else {
        message = error.response?.data?.error || 'Email verification failed';
      }
      
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Logout function
  const logout = async (): Promise<ApiResponse<void>> => {
    try {
      await storeLogout();
      toast.success('Logged out successfully');
      router.push('/login');
      return { success: true };
    } catch (error: any) {
      const message = 'Logout failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // Check if user has specific roles
  const hasRole = (roles: string[]): boolean => {
    if (!user || !user.roles) return false;
    return roles.some(role => user.roles.includes(role));
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles: string[]): boolean => {
    if (!user || !user.roles) return false;
    return user.roles.some(role => roles.includes(role));
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    verifyEmail,
    logout,
    getCurrentUser,
    hasRole,
    hasAnyRole
  };
} 