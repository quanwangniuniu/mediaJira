'use client';

import React from 'react';
import { useAuthStore } from '../../lib/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Props for ProtectedRoute component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAuth?: boolean; // Whether authentication is required
  requiredRoles?: string[]; // Required roles for access
  fallback?: string; // Redirect path if access is denied
  loadingComponent?: React.ReactNode; // Custom loading component
  skipOnboardingCheck?: boolean; // Skip onboarding check (for onboarding page itself)
}

// Routes that should be accessible even without completing onboarding
const ALLOWED_WITHOUT_ONBOARDING = [
  '/onboarding/project',
  '/projects/onboarding',
  '/login',
  '/register',
  '/verify',
  '/unauthorized',
];

// ProtectedRoute component that handles authentication, role-based access control, and onboarding enforcement
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredAuth = true,
  requiredRoles = [],
  fallback = '/login',
  loadingComponent,
  skipOnboardingCheck = false,
}) => {
  const { 
    isAuthenticated, 
    user, 
    loading, 
    initialized,
    needsOnboarding,
    hasProject,
    projectsInitialized,
    projectsLoading,
    initializeProjectContext
  } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  // Check if user has required roles
  const hasRequiredRoles = () => {
    if (requiredRoles.length === 0) return true;
    if (!user || !user.roles) return false;
    return requiredRoles.some(role => user.roles.includes(role));
  };

  // Check if current route is allowed without onboarding
  const isAllowedWithoutOnboarding = () => {
    return ALLOWED_WITHOUT_ONBOARDING.some(path => pathname?.startsWith(path));
  };

  // Initialize project context if authenticated and not yet initialized
  useEffect(() => {
    if (isAuthenticated && !projectsInitialized && !projectsLoading && initialized) {
      initializeProjectContext();
    }
  }, [isAuthenticated, projectsInitialized, projectsLoading, initialized, initializeProjectContext]);

  // Handle authentication, role checks, and onboarding enforcement
  useEffect(() => {
    // Wait for authentication to be initialized
    if (!initialized) return;

    // If authentication is required but user is not authenticated
    if (requiredAuth && !isAuthenticated) {
      router.push(fallback);
      return;
    }

    // If roles are required but user doesn't have them
    if (requiredRoles.length > 0 && !hasRequiredRoles()) {
      // Redirect to unauthorized page or show error
      router.push('/unauthorized');
      return;
    }

    // Enforce project membership for authenticated users
    // Skip if explicitly requested or if route is allowed without onboarding
    if (
      isAuthenticated && 
      !skipOnboardingCheck && 
      !isAllowedWithoutOnboarding() &&
      projectsInitialized
    ) {
      // Use hasProject if available, otherwise fall back to needsOnboarding
      const requiresProject = hasProject !== null ? hasProject === false : needsOnboarding;
      if (requiresProject) {
        router.push('/projects/onboarding');
        return;
      }
    }
  }, [
    isAuthenticated, 
    user, 
    initialized, 
    requiredAuth, 
    requiredRoles, 
    router, 
    fallback,
    needsOnboarding,
    hasProject,
    projectsInitialized,
    skipOnboardingCheck,
    pathname
  ]);

  // Show loading while authentication or project context is being initialized
  const isLoading = !initialized || loading || (isAuthenticated && !projectsInitialized) || projectsLoading;
  
  if (isLoading) {
    return loadingComponent ? (
      <>{loadingComponent}</>
    ) : (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If authentication is required but user is not authenticated, don't render children
  if (requiredAuth && !isAuthenticated) {
    return null;
  }

  // If roles are required but user doesn't have them, don't render children
  if (requiredRoles.length > 0 && !hasRequiredRoles()) {
    return null;
  }

  // If project membership is required but not available, don't render children (redirect will happen)
  if (
    isAuthenticated && 
    !skipOnboardingCheck && 
    !isAllowedWithoutOnboarding() &&
    projectsInitialized
  ) {
    const requiresProject = hasProject !== null ? hasProject === false : needsOnboarding;
    if (requiresProject) {
      return null;
    }
  }

  // Render children if all checks pass
  return <>{children}</>;
}; 