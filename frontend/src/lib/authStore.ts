import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from './api';
import { ProjectAPI, ProjectData, CheckProjectMembershipResponse } from './api/projectApi';
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

  // Project context
  activeProject: ProjectData | null;
  projects: ProjectData[];
  needsOnboarding: boolean;
  projectsLoading: boolean;
  projectsInitialized: boolean;
  hasProject: boolean | null; // null = still loading
  activeProjectId: number | null;
  projectCount: number;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setOrganizationAccessToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  setUserTeams: (teams: number[]) => void;
  setSelectedTeamId: (teamId: number | null) => void;
  setActiveProject: (project: ProjectData | null) => void;
  setProjects: (projects: ProjectData[]) => void;
  setNeedsOnboarding: (needsOnboarding: boolean) => void;
  setHasProject: (hasProject: boolean) => void;
  setActiveProjectId: (activeProjectId: number | null) => void;
  setProjectCount: (projectCount: number) => void;
  
  // Authentication actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getCurrentUser: () => Promise<{ success: boolean; error?: string }>;
  getUserTeams: () => Promise<{ success: boolean; error?: string }>;
  
  // Initialize auth state on app startup
  initializeAuth: () => Promise<void>;

  // Project context actions
  initializeProjectContext: () => Promise<void>;
  refreshProjects: () => Promise<{ success: boolean; error?: string }>;
  
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
      activeProject: null,
      projects: [],
      needsOnboarding: false,
      projectsLoading: false,
      projectsInitialized: false,
      hasProject: null, // null = still loading
      activeProjectId: null,
      projectCount: 0,

      // State setters
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setRefreshToken: (refreshToken) => set({ refreshToken }),
      setOrganizationAccessToken: (organizationAccessToken) => set({ organizationAccessToken }),
      setLoading: (loading) => set({ loading }),
      setInitialized: (initialized) => set({ initialized }),
      setUserTeams: (userTeams) => set({ userTeams }),
      setSelectedTeamId: (selectedTeamId) => set({ selectedTeamId }),
      setActiveProject: (activeProject) => set({ 
        activeProject,
        activeProjectId: activeProject?.id ?? null,
      }),
      setProjects: (projects) => set({ projects }),
      setNeedsOnboarding: (needsOnboarding) => set({ needsOnboarding }),
      setHasProject: (hasProject) => set({ hasProject }),
      setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
      setProjectCount: (projectCount) => set({ projectCount }),

      // Login action
      login: async (email: string, password: string) => {
        set({ loading: true });
        try {
          const response = await authAPI.login({ email, password });
          const { token, refresh, user, organization_access_token } = response;
          
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
            user,
            token,
            refreshToken: refresh,
            organizationAccessToken: organization_access_token || null,
            isAuthenticated: true,
            userTeams,
            selectedTeamId,
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

      // Initialize project context on app startup (after auth)
      initializeProjectContext: async () => {
        const { isAuthenticated, projectsInitialized } = get();

        if (!isAuthenticated) {
          // Not authenticated, set defaults
          if (!projectsInitialized) {
            set({ 
              projectsInitialized: true,
              hasProject: false,
              activeProjectId: null,
              projectCount: 0,
              needsOnboarding: false,
            });
          }
          return;
        }

        if (projectsInitialized) {
          // Already initialized, nothing to do
          return;
        }

        set({ projectsLoading: true, hasProject: null });

        try {
          const membership: CheckProjectMembershipResponse =
            await ProjectAPI.checkProjectMembership();

          // Support both new format (has_project) and legacy (has_membership)
          const hasProject = membership.has_project ?? membership.has_membership ?? false;
          const activeProjectId = membership.active_project_id ?? membership.active_project?.id ?? null;
          const projectCount = membership.project_count ?? (Array.isArray(membership.projects) ? membership.projects.length : 0);

          if (!hasProject) {
            // User has no project membership – must go through onboarding
            set({
              activeProject: null,
              activeProjectId: null,
              hasProject: false,
              projectCount: 0,
              needsOnboarding: true,
              projectsInitialized: true,
              projectsLoading: false,
            });
            return;
          }

          // User has membership
          set({ 
            needsOnboarding: false,
            hasProject: true,
            activeProjectId,
            projectCount,
          });

          if (membership.active_project) {
            set({ activeProject: membership.active_project });
          } else if (activeProjectId) {
            // Fetch project details if we only have the ID
            try {
              const projects = await ProjectAPI.getProjects();
              const activeProject = projects.find(p => p.id === activeProjectId) || null;
              if (activeProject) {
                set({ activeProject });
              }
            } catch (error) {
              console.error('Failed to fetch active project:', error);
            }
          } else {
            set({ activeProject: null });
          }

          // Optionally store basic project list if provided
          if (Array.isArray(membership.projects)) {
            set({ projects: membership.projects });
          } else {
            // Fetch projects if not provided
            try {
              const projects = await ProjectAPI.getProjects();
              set({ projects });
            } catch (error) {
              console.error('Failed to fetch projects:', error);
            }
          }
        } catch (error: any) {
          console.error('Failed to initialize project context:', error);
          // If 401, user is not authenticated
          if (error.response?.status === 401) {
            get().clearAuth();
          } else {
            // Set defaults on error
            set({
              hasProject: false,
              activeProjectId: null,
              projectCount: 0,
              needsOnboarding: true,
            });
          }
        } finally {
          set({ projectsLoading: false, projectsInitialized: true });
        }
      },

      // Explicitly refresh projects list
      refreshProjects: async () => {
        try {
          set({ projectsLoading: true });
          const projects = await ProjectAPI.getProjects();
          const projectCount = projects.length;
          const hasProject = projectCount > 0;
          
          set({ 
            projects, 
            projectsLoading: false,
            projectCount,
            hasProject: hasProject ? true : (hasProject === false ? false : null),
          });
          return { success: true };
        } catch (error) {
          console.error('Failed to refresh projects:', error);
          set({ projectsLoading: false });
          return { success: false, error: 'Failed to refresh projects' };
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
          selectedTeamId: null,
          activeProject: null,
          projects: [],
          needsOnboarding: false,
          projectsLoading: false,
          projectsInitialized: false,
          hasProject: null,
          activeProjectId: null,
          projectCount: 0,
        });
      }
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields to localStorage
        token: state.token,
        refreshToken: state.refreshToken,
        organizationAccessToken: state.organizationAccessToken,
        user: state.user,
        userTeams: state.userTeams,
        selectedTeamId: state.selectedTeamId,
        activeProject: state.activeProject,
        projects: state.projects,
        needsOnboarding: state.needsOnboarding,
      })
    }
  )
); 