'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../../lib/authStore';
import toast from 'react-hot-toast';

// Props for AuthProvider component
interface AuthProviderProps {
  children: React.ReactNode;
}

// AuthProvider component that handles authentication state initialization
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    initializeAuth,
    initializeProjectContext,
    loading,
    initialized,
    projectsInitialized,
  } = useAuthStore();

  // Initialize authentication state on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await initializeAuth();
        await initializeProjectContext();
      } catch (error) {
        console.error('Failed to initialize authentication:', error);
        toast.error('Failed to initialize authentication');
      }
    };

    initAuth();
  }, [initializeAuth]);

  // Show loading screen while initializing authentication
  if (!initialized || !projectsInitialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}; 