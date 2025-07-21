import { useState, useEffect } from 'react';
import { authAPI } from '../lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { User, LoginRequest, RegisterRequest, RegisterResponse, ApiResponse } from '../types/auth';

export default function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginRequest): Promise<ApiResponse<void>> => {
    try {
      const response = await authAPI.login(credentials);
      const { token, refresh, user } = response;
      
      localStorage.setItem('token', token);
      localStorage.setItem('refresh', refresh);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      toast.success('Login successful!');
      router.push('/campaigns'); 
      
      return { success: true };
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

  const getCurrentUser = async (): Promise<ApiResponse<User>> => {
    try {
      const user = await authAPI.getCurrentUser();
      setUser(user);
      return { success: true, data: user };
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to get user info';
      return { success: false, error: message };
    }
  };

  // Email verification function
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

  const logout = async (): Promise<ApiResponse<void>> => {
    try {
      await authAPI.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      setUser(null);
      toast.success('Logged out successfully');
      router.push('/login');
      
      return { success: true };
    } catch (error: any) {
      // Even if the API call fails, we still want to clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('refresh');
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
      
      const message = error.response?.data?.error || 'Logout failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  return {
    user,
    loading,
    login,
    register,
    verifyEmail,
    logout,
    getCurrentUser
  };
} 