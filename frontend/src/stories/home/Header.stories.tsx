import React from 'react';
import { Grid3x3, User } from 'lucide-react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import MobileMenu from '../../components/MobileMenu';

const meta = {
  title: 'Home/Header',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Home page header with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

const mockRouter = {
  back: () => {},
  forward: () => {},
  refresh: () => {},
  push: () => {},
  replace: () => {},
  prefetch: () => {},
};

export default meta;

export const Default = {
  render: () => {
    const initialized = true;
    const isAuthenticated = false;
    const user = null;

    const redirectToLogin = () => {};

    const handleLoginClick = () => {};

    const handleGetStartedClick = () => {};

    const displayName = user?.username || user?.email || 'User';
    const displayRole = user?.roles?.[0] || 'Member';

    return (
      <AppRouterContext.Provider value={mockRouter}>
        <>
          <header className="hidden md:block border-b border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-12">
                <h1 className="text-3xl font-bold">
                  <span className="text-blue-800">Media</span>
                  <span className="text-gray-900">Jira</span>
                </h1>
                <nav className="hidden lg:flex gap-6">
                  <a href="#" className="text-gray-700 hover:text-gray-900">Features</a>
                  <a href="#" className="text-gray-700 hover:text-gray-900">Solutions</a>
                  <a href="#" className="text-gray-700 hover:text-gray-900">Pricing</a>
                  <a href="#" className="text-gray-700 hover:text-gray-900">Resource</a>
                </nav>
              </div>
              <div className="flex items-center gap-3 mt-auto">
               {isAuthenticated ? (
                  <button 
                    onClick={handleLoginClick} 
                    className="px-6 py-2 text-blue-800 border border-blue-800 rounded-full hover:bg-blue-50 transition bg-white inline-flex items-center cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{displayName}</span>
                      <span className="text-xs text-gray-600">{displayRole}</span>
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={handleLoginClick} 
                    className="px-6 py-2 text-blue-800 border border-blue-800 rounded-full hover:bg-blue-50 transition bg-white inline-flex items-center cursor-pointer"
                  >
                    Log in
                  </button>
                )}
                <button 
                  onClick={handleGetStartedClick} 
                  className="px-6 py-2 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition"
                >
                  Get Started
                </button>
                <button 
                onClick={redirectToLogin}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <Grid3x3 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          <header className="block md:hidden border-b border-gray-200 bg-white sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                <span className="text-blue-800">Media</span>
                <span className="text-gray-900">Jira</span>
              </h1>
              <MobileMenu />
            </div>
          </header>
        </>
      </AppRouterContext.Provider>
    );
  },
};
