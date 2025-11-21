import axios from 'axios';
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse, 
  User, 
  AuthError 
} from '../types/auth';

const DEFAULT_API_BASE_URL = '';

const API_BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.trim()) ||
  DEFAULT_API_BASE_URL;

// Create axios instance for API calls
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/plain, */*',
  },
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get token from Zustand store instead of localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-storage') : null;
    let parsedToken = null;
    let userData = null;
    let organizationToken = null;
    
    if (token) {
      try {
        const authData = JSON.parse(token);
        parsedToken = authData.state?.token;
        userData = authData.state?.user;
        organizationToken = authData.state?.organizationAccessToken;
      } catch (error) {
        console.warn('Failed to parse auth storage:', error);
      }
    }
    
    if (parsedToken) {
      config.headers.Authorization = `Bearer ${parsedToken}`;
    }
    
    // Add organization access token if available
    if (organizationToken) {
      config.headers['X-Organization-Token'] = organizationToken;
    }
    
    // Add user role header if available
    if (userData && userData.roles && userData.roles.length > 0) {
      // Use the first role as the primary role
      config.headers['x-user-role'] = userData.roles[0];
    }
    
    // Add team ID header if user has a team
    // Note: This is a placeholder - you may need to get team info from user data
    // For now, we'll set it to null or get it from user data if available
    if (userData && userData.team_id) {
      config.headers['x-team-id'] = userData.team_id.toString();
    }
    
    // Allow multipart/form-data to set its own Content-Type with boundary
    if (config.data instanceof FormData) {
      // axios will set the correct Content-Type when data is FormData
      delete (config.headers as any)['Content-Type'];
    } else {
      (config.headers as any)['Content-Type'] = 'application/json';
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