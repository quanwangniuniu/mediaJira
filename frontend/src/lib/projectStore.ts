'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectData } from './api/projectApi';

interface ProjectState {
  projects: ProjectData[];
  activeProject: ProjectData | null;
  loading: boolean;
  error: string | null;
  setProjects: (projects: ProjectData[]) => void;
  setActiveProject: (project: ProjectData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearProjects: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      activeProject: null,
      loading: false,
      error: null,
      setProjects: (projects) => set({ projects }),
      setActiveProject: (activeProject) => set({ activeProject }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearProjects: () =>
        set({
          projects: [],
          activeProject: null,
          loading: false,
          error: null,
        }),
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        activeProject: state.activeProject,
      }),
    }
  )
);
