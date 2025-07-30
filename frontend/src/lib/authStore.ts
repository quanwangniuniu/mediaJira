import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from './api';
import { User } from '../types/auth';

// Authentication state interface
interface AuthState {
  // User data and authentication state
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  
  // Authentication actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<{ success: boolean; error?: string }>;
  
  // Initialize auth state on app startup
  initializeAuth: () => Promise<void>;
  
  // Clear all auth data
  clearAuth: () => void;
}

// Create the auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      loading: false,
      initialized: false,

      // State setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),

      // Login action
      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await authAPI.login({ email, password });
          const { token, refresh, user } = response;
          
          set({
            user,
            token,
            refreshToken: refresh,
            isAuthenticated: true,
            loading: false
          });
          
          return { success: true };
        } catch (error: any) {
          set({ loading: false });
          const message = error.response?.data?.error || 'Login failed';
          return { success: false, error: message };
        }
      },

      // Logout action
      logout: async () => {
        try {
          // Try to call logout API (optional)
          await authAPI.logout();
        } catch (error) {
          // Ignore logout API errors
          console.warn('Logout API call failed:', error);
        }
        
        // Clear all auth data
        get().clearAuth();
      },

      // Get current user from API
      getCurrentUser: async () => {
        try {
          const user = await authAPI.getCurrentUser();
          set({ user, isAuthenticated: true });
          return { success: true };
        } catch (error: any) {
          // If token is invalid, clear auth data
          if (error.response?.status === 401) {
            get().clearAuth();
          }
          return { success: false, error: 'Failed to get user info' };
        }
      },

      // Initialize authentication state on app startup
      initializeAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ initialized: true });
          return;
        }

        set({ loading: true });
        
        try {
          // Validate token by calling /auth/me
          const result = await get().getCurrentUser();
          
          if (!result.success) {
            // Token is invalid, clear auth data
            get().clearAuth();
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          get().clearAuth();
        } finally {
          set({ loading: false, initialized: true });
        }
      },

      // Clear all authentication data
      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          loading: false
        });
      }
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields to localStorage
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user
      })
    }
  )
); 