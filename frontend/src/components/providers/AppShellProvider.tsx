'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import Layout from '@/components/layout/Layout';

interface AppShellProviderProps {
  children: React.ReactNode;
}

/**
 * AppShellProvider wraps the main application shell (Layout with sidebar/header).
 * It ensures that users without projects don't see the main app shell at all.
 * Instead, they should be redirected to onboarding.
 */
export const AppShellProvider: React.FC<AppShellProviderProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    hasProject,
    projectsInitialized,
    projectsLoading,
    initialized,
  } = useAuthStore();

  // Routes that should NOT show the main app shell (onboarding, auth pages)
  const NO_SHELL_ROUTES = [
    '/projects/onboarding',
    '/onboarding/project',
    '/login',
    '/register',
    '/verify',
    '/unauthorized',
  ];

  // Check if current route should not show the shell
  const shouldShowShell = !NO_SHELL_ROUTES.some(path => pathname?.startsWith(path));

  // Redirect users without projects to onboarding (if not already there)
  useEffect(() => {
    if (!initialized || !projectsInitialized || projectsLoading) {
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    // If user has no project and is on a route that requires the shell, redirect
    if (hasProject === false && shouldShowShell) {
      router.push('/projects/onboarding');
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
    shouldShowShell,
  ]);

  // Don't show shell for onboarding/auth routes
  if (!shouldShowShell) {
    return <>{children}</>;
  }

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

  // If user has no project, don't render shell (redirect will happen)
  if (isAuthenticated && hasProject === false) {
    return null;
  }

  // Render main app shell with Layout
  return <Layout>{children}</Layout>;
};


