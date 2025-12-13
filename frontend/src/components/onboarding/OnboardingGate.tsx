'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import OnboardingWizard from './OnboardingWizard';

const OnboardingGate = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const isLoginRoute = pathname?.startsWith('/login');
  const { needsOnboarding, checking } = useOnboarding();
  const showOverlay = !isLoginRoute && (needsOnboarding || checking);

  return (
    <div className="relative min-h-screen">
      <div
        className={`transition duration-200 ${
          showOverlay ? 'pointer-events-none select-none blur-sm' : ''
        }`}
      >
        {children}
      </div>

      {showOverlay && (
        <div className="fixed inset-0 z-[9998] bg-slate-900/70 backdrop-blur-sm" />
      )}

      {!isLoginRoute && checking && !needsOnboarding && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 px-6 py-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div>
              <div className="text-sm font-semibold text-gray-900">Preparing your workspace</div>
              <div className="text-xs text-gray-600">Checking your project access...</div>
            </div>
          </div>
        </div>
      )}

      {!isLoginRoute && needsOnboarding && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8 overflow-y-auto">
          <OnboardingWizard />
        </div>
      )}
    </div>
  );
};

export default OnboardingGate;
