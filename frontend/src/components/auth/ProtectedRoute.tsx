'use client';

import React from 'react';
import { useAuthStore } from '../../lib/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Props for ProtectedRoute component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredAuth?: boolean; // Whether authentication is required
  requiredRoles?: string[]; // Required roles for access
  fallback?: string; // Redirect path if access is denied
  loadingComponent?: React.ReactNode; // Custom loading component
}

// ProtectedRoute component that handles authentication and role-based access control
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredAuth = true,
  requiredRoles = [],
  fallback = '/login',
  loadingComponent
}) => {
  const { isAuthenticated, user, loading, initialized } = useAuthStore();
  const router = useRouter();

  // Check if user has required roles
  const hasRequiredRoles = () => {
    if (requiredRoles.length === 0) return true;
    if (!user || !user.roles) return false;
    return requiredRoles.some(role => user.roles.includes(role));
  };

  // Handle authentication and role checks
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
  }, [isAuthenticated, user, initialized, requiredAuth, requiredRoles, router, fallback]);

  // Show loading while authentication is being initialized
  if (!initialized || loading) {
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

  // Render children if all checks pass
  return <>{children}</>;
}; 