'use client';

import { useAuthStore } from '@/lib/authStore';

export function useProjectContext() {
  const {
    activeProject,
    projects,
    needsOnboarding,
    projectsLoading,
    projectsInitialized,
    setActiveProject,
    setProjects,
    setNeedsOnboarding,
    initializeProjectContext,
    refreshProjects,
  } = useAuthStore();

  return {
    activeProject,
    projects,
    needsOnboarding,
    projectsLoading,
    projectsInitialized,
    setActiveProject,
    setProjects,
    setNeedsOnboarding,
    initializeProjectContext,
    refreshProjects,
  };
}



