'use client';

import React from 'react';
import Link from 'next/link';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

/**
 * Minimal layout for onboarding flow - no sidebar, no project selector.
 * Just the logo and centered content.
 */
export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal header with just logo */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            <span className="text-xl font-semibold text-gray-900">MediaJira</span>
          </Link>
        </div>
      </header>

      {/* Centered content */}
      <main className="flex-1">
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};


