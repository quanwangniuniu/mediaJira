import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from './api';
import { User } from '../types/auth';
import TeamAPI from './api/teamApi';

// Authentication state interface
interface AuthState {
  // User data and authentication state
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  organizationAccessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  initialized: boolean;

  // Team information
  userTeams: number[];
  selectedTeamId: number | null;
  hasHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setOrganizationAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setUserTeams: (teams: number[]) => void;
  setSelectedTeamId: (teamId: number | null) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  
  // Authentication actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<{ success: boolean; error?: string }>;
  getUserTeams: () => Promise<{ success: boolean; error?: string }>;
  
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
      organizationAccessToken: null,
      isAuthenticated: false,
      loading: false,
      initialized: false,
      userTeams: [],
      selectedTeamId: null,
      hasHydrated: false,

      // State setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setOrganizationAccessToken: (organizationAccessToken) => set({ organizationAccessToken }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),
      setUserTeams: (userTeams) => set({ userTeams }),
      setSelectedTeamId: (selectedTeamId) => set({ selectedTeamId }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      // Login action
      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await authAPI.login({ email, password });
          const { token, refresh, user, organization_access_token } = response;

          // Persist auth data immediately so downstream requests include the token
          set({
            user,
            token,
            refreshToken: refresh,
            organizationAccessToken: organization_access_token || null,
            isAuthenticated: true,
          });
          
          // Get user teams after successful login
          let userTeams: number[] = [];
          let selectedTeamId: number | null = null;
          
          try {
            const teamsResponse = await TeamAPI.getUserTeams();
            userTeams = teamsResponse.team_ids || [];
            // Select the first team by default, or null if no teams
            selectedTeamId = userTeams.length > 0 ? userTeams[0] : null;
          } catch (teamError) {
            console.warn('Failed to fetch user teams:', teamError);
            // Continue with login even if team fetch fails
          }
          
          set({
            userTeams,
            selectedTeamId,
            loading: false
          });
          
          // Refresh user data to get latest avatar and profile info
          try {
            await get().getCurrentUser();
          } catch (error) {
            console.warn('Failed to refresh user data after login:', error);
            // Don't fail login if refresh fails
          }
          
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

      // Get user teams from API
      getUserTeams: async () => {
        try {
          const teamsResponse = await TeamAPI.getUserTeams();
          const userTeams = teamsResponse.team_ids || [];
          
          set({ userTeams });
          
          // If no team is currently selected and user has teams, select the first one
          const { selectedTeamId } = get();
          if (!selectedTeamId && userTeams.length > 0) {
            set({ selectedTeamId: userTeams[0] });
          }
          
          return { success: true };
        } catch (error: any) {
          console.error('Failed to fetch user teams:', error);
          return { success: false, error: 'Failed to get user teams' };
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
          const userResult = await get().getCurrentUser();
          
          if (!userResult.success) {
            // Token is invalid, clear auth data
            get().clearAuth();
            return;
          }

          // Get user teams after successful user validation
          await get().getUserTeams();
          
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
          organizationAccessToken: null,
          isAuthenticated: false,
          loading: false,
          userTeams: [],
          selectedTeamId: null
        });
      }
    }),
    {
      name: 'auth-storage', // localStorage key
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        // Only persist these fields to localStorage
        token: state.token,
        refreshToken: state.refreshToken,
        organizationAccessToken: state.organizationAccessToken,
        user: state.user,
        userTeams: state.userTeams,
        selectedTeamId: state.selectedTeamId
      })
    }
  )
); 
