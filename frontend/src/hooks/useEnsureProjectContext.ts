'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectContext } from './useProjectContext';

interface UseEnsureProjectContextOptions {
  requireActiveProject?: boolean;
  onboardingPath?: string;
  selectProjectPath?: string;
}

export function useEnsureProjectContext(
  options: UseEnsureProjectContextOptions = {}
) {
  const {
    requireActiveProject = true,
    onboardingPath = '/onboarding/project',
    selectProjectPath = '/projects/select-active',
  } = options;

  const router = useRouter();
  const {
    activeProject,
    needsOnboarding,
    projectsInitialized,
    projectsLoading,
    initializeProjectContext,
  } = useProjectContext();

  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const ensureContext = async () => {
      if (!projectsInitialized && !projectsLoading && !checking) {
        setChecking(true);
        try {
          await initializeProjectContext();
        } finally {
          setChecking(false);
        }
      }
    };

    ensureContext();
  }, [projectsInitialized, projectsLoading, checking, initializeProjectContext]);

  useEffect(() => {
    if (!projectsInitialized) return;

    if (needsOnboarding) {
      router.push(onboardingPath);
      return;
    }

    if (requireActiveProject && !activeProject) {
      router.push(selectProjectPath);
    }
  }, [
    projectsInitialized,
    needsOnboarding,
    activeProject,
    requireActiveProject,
    router,
    onboardingPath,
    selectProjectPath,
  ]);

  const loading = checking || !projectsInitialized || projectsLoading;

  return {
    loading,
    activeProject,
    needsOnboarding,
  };
}



