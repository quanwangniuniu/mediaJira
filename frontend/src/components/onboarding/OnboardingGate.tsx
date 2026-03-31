'use client';

import React from 'react';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useAuthStore } from '@/lib/authStore';
import OnboardingWizard from './OnboardingWizard';

const OnboardingGate = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isPublicAuthRoute =
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register') ||
    pathname?.startsWith('/verify') ||
    pathname?.startsWith('/forgot-password') ||
    pathname?.startsWith('/set-password');
  const isOAuthCallbackRoute =
    pathname?.startsWith('/auth/google/callback') ||
    pathname?.startsWith('/google/callback');
  const isAuthRoute = isPublicAuthRoute || isOAuthCallbackRoute;
  const isRootRoute = pathname === '/';
  const { needsOnboarding, checking } = useOnboarding();
  const showOverlay = !isAuthRoute && (needsOnboarding || checking);

  useEffect(() => {
    // Requirement: after signup, entering localhost should reset to logged-out
    // while staying on localhost (no redirect to /login).
    if (!isRootRoute || checking || !needsOnboarding) return;
    clearAuth();
  }, [checking, clearAuth, isRootRoute, needsOnboarding]);

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

      {!isAuthRoute && checking && !needsOnboarding && (
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

      {!isAuthRoute && needsOnboarding && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8 overflow-y-auto">
          <OnboardingWizard />
        </div>
      )}
    </div>
  );
};

export default OnboardingGate;
