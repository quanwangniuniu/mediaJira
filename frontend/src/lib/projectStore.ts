'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectData } from './api/projectApi';

interface ProjectState {
  projects: ProjectData[];
  activeProject: ProjectData | null;
  activeProjectIds: number[];
  inactiveProjectIds: number[];
  loading: boolean;
  error: string | null;
  setProjects: (projects: ProjectData[]) => void;
  setActiveProject: (project: ProjectData | null) => void;
  setActiveProjectIds: (ids: number[]) => void;
  toggleActiveProjectId: (id: number) => void;
  setInactiveProjectIds: (ids: number[]) => void;
  addInactiveProjectId: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearProjects: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      activeProject: null,
      activeProjectIds: [],
      inactiveProjectIds: [],
      loading: false,
      error: null,
      setProjects: (projects) => set({ projects }),
      setActiveProject: (activeProject) =>
        set((state) => ({
          activeProject,
          activeProjectIds: activeProject?.id
            ? Array.from(new Set([...state.activeProjectIds, activeProject.id]))
            : state.activeProjectIds,
          inactiveProjectIds: activeProject?.id
            ? state.inactiveProjectIds.filter((id) => id !== activeProject.id)
            : state.inactiveProjectIds,
        })),
      setActiveProjectIds: (ids) =>
        set((state) => ({
          activeProjectIds: Array.from(new Set(ids)),
          inactiveProjectIds: state.inactiveProjectIds.filter((id) => !ids.includes(id)),
        })),
      toggleActiveProjectId: (id) =>
        set((state) => {
          const next = new Set(state.activeProjectIds);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return {
            activeProjectIds: Array.from(next),
            inactiveProjectIds: state.inactiveProjectIds.filter((item) => item !== id),
          };
        }),
      setInactiveProjectIds: (ids) => set({ inactiveProjectIds: Array.from(new Set(ids)) }),
      addInactiveProjectId: (id) =>
        set((state) => ({
          inactiveProjectIds: Array.from(new Set([...state.inactiveProjectIds, id])),
          activeProjectIds: state.activeProjectIds.filter((item) => item !== id),
        })),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearProjects: () =>
        set({
          projects: [],
          activeProject: null,
          activeProjectIds: [],
          inactiveProjectIds: [],
          loading: false,
          error: null,
        }),
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        activeProject: state.activeProject,
        activeProjectIds: state.activeProjectIds,
        inactiveProjectIds: state.inactiveProjectIds,
      }),
    }
  )
);
