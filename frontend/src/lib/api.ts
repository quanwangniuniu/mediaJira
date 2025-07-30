import axios from 'axios';
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse, 
  User, 
  AuthError 
} from '../types/auth';

// API base URL - empty string means same origin (handled by nginx proxy)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Create axios instance for API calls
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from Zustand store instead of localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
    let parsedToken = null;
    
    if (token) {
      try {
        const authData = JSON.parse(token);
        parsedToken = authData.state?.token;
      } catch (error) {
        console.warn('Failed to parse auth storage:', error);
      }
    }
    
    if (parsedToken) {
      config.headers.Authorization = `Bearer ${parsedToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login on unauthorized requests
      // This will be handled by the Zustand store
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Authentication API functions - connected to Django backend
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login/', credentials);
    return response.data;
  },
  
  register: async (userData: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register/', userData);
    return response.data;
  },
  
  // Email verification endpoint
  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await api.get(`/auth/verify/?token=${token}`);
    return response.data;
  },
  
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/auth/me/');
    return response.data;
  },
  
  logout: async (): Promise<{ message: string }> => {
    const response = await api.post('/auth/logout/');
    return response.data;
  }
};

export default api; 