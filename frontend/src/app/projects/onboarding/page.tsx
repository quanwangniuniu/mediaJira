'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { OnboardingLayout } from '@/components/layout/OnboardingLayout';
import ProjectOnboardingWizard from '@/components/projects/ProjectOnboardingWizard';
import { useProjectContext } from '@/hooks/useProjectContext';

export default function ProjectsOnboardingPage() {
  const router = useRouter();
  const { needsOnboarding, activeProject, projectsInitialized } = useProjectContext();

  // Only redirect if project context is initialized and user has completed onboarding
  // This prevents redirecting users who are in the middle of onboarding
  useEffect(() => {
    if (projectsInitialized && !needsOnboarding && activeProject) {
      router.push('/tasks');
    }
  }, [projectsInitialized, needsOnboarding, activeProject, router]);

  return (
    <ProtectedRoute skipOnboardingCheck={true}>
      <OnboardingLayout>
        <div className="max-w-3xl w-full">
          <ProjectOnboardingWizard
            onCompleted={(projectId) => {
              // After onboarding, send user to tasks scoped to new project
              router.push('/tasks');
            }}
          />
        </div>
      </OnboardingLayout>
    </ProtectedRoute>
  );
}

