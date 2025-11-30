'use client';

import { useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProjectGuard } from '@/components/projects/ProjectGuard';
import ActiveProjectSwitcher from '@/components/projects/ActiveProjectSwitcher';
import { useProjectContext } from '@/hooks/useProjectContext';
import { useAuthStore } from '@/lib/authStore';
import { useRouter } from 'next/navigation';

export default function SelectActiveProjectPage() {
  const router = useRouter();
  const { activeProject, projects, projectsLoading, projectsInitialized } = useProjectContext();
  const { hasProject } = useAuthStore();
  
  // Redirect to onboarding if user has no projects
  useEffect(() => {
    if (projectsInitialized && hasProject === false) {
      router.push('/projects/onboarding');
    }
  }, [projectsInitialized, hasProject, router]);

  // Show loading while project context is being initialized
  if (!projectsInitialized || projectsLoading || hasProject === null) {
    return (
      <ProtectedRoute>
        <ProjectGuard>
          <Layout>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading project context...</p>
              </div>
            </div>
          </Layout>
        </ProjectGuard>
      </ProtectedRoute>
    );
  }

  // If user has no projects, redirect will happen via useEffect
  if (hasProject === false) {
    return null;
  }

  return (
    <ProtectedRoute>
      <ProjectGuard>
        <Layout>
          <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Choose active project
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Select a project to use as your active context. Tasks and other
                project-scoped views will default to this project.
              </p>
              <ActiveProjectSwitcher className="w-full" />
              {activeProject && (
                <p className="mt-4 text-sm text-gray-600">
                  Current active project:{' '}
                  <span className="font-medium">{activeProject.name}</span>
                </p>
              )}
              {projects && projects.length > 0 && !activeProject && (
                <p className="mt-4 text-sm text-gray-500">
                  Please select a project from the dropdown above to continue.
                </p>
              )}
            </div>
          </div>
        </Layout>
      </ProjectGuard>
    </ProtectedRoute>
  );
}


