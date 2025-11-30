'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';

interface ProjectGuardProps {
  children: React.ReactNode;
  skipCheck?: boolean; // For onboarding route itself
}

/**
 * ProjectGuard component that redirects users without projects to onboarding.
 * This should wrap all authenticated routes except the onboarding route itself.
 */
export const ProjectGuard: React.FC<ProjectGuardProps> = ({
  children,
  skipCheck = false,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    hasProject,
    projectsInitialized,
    projectsLoading,
    initialized,
  } = useAuthStore();

  // Routes that are allowed without a project
  const ALLOWED_WITHOUT_PROJECT = [
    '/projects/onboarding',
    '/onboarding/project',
    '/login',
    '/register',
    '/verify',
    '/unauthorized',
  ];

  useEffect(() => {
    // Wait for initialization
    if (!initialized || !projectsInitialized || projectsLoading) {
      return;
    }

    // Skip check if explicitly requested or on allowed routes
    if (skipCheck || ALLOWED_WITHOUT_PROJECT.some(path => pathname?.startsWith(path))) {
      return;
    }

    // If not authenticated, let auth logic handle it
    if (!isAuthenticated) {
      return;
    }

    // If user has no project, redirect to onboarding
    if (hasProject === false) {
      router.push('/projects/onboarding');
      return;
    }

    // If still loading project state, wait
    if (hasProject === null) {
      return;
    }
  }, [
    isAuthenticated,
    hasProject,
    projectsInitialized,
    projectsLoading,
    initialized,
    router,
    pathname,
    skipCheck,
  ]);

  // Show loading while checking project membership
  if (!initialized || !projectsInitialized || projectsLoading || hasProject === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If user has no project and not on allowed route, don't render (redirect will happen)
  if (
    isAuthenticated &&
    hasProject === false &&
    !skipCheck &&
    !ALLOWED_WITHOUT_PROJECT.some(path => pathname?.startsWith(path))
  ) {
    return null;
  }

  return <>{children}</>;
};


