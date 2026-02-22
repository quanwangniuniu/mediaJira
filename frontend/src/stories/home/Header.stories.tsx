import React from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import HeaderSection from '../../components/home/HeaderSection';

const mockRouter = {
  back: () => {},
  forward: () => {},
  prefetch: async () => {},
  push: () => {},
  refresh: () => {},
  replace: () => {},
};

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
        component: 'Header section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const handleLoginClick = () => {};
    const handleGetStartedClick = () => {};
    const redirectToLogin = () => {};

    return (
      <AppRouterContext.Provider value={mockRouter}>
        <div
          onClickCapture={(event) => {
            const target = event.target as HTMLElement | null;
            const clickable = target?.closest?.('a, button');
            if (clickable) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <HeaderSection
            isAuthenticated={false}
            displayName="User"
            displayRole="Member"
            onLoginClick={handleLoginClick}
            onGetStartedClick={handleGetStartedClick}
            onRedirectToLogin={redirectToLogin}
          />
        </div>
      </AppRouterContext.Provider>
    );
  },
};

export const LoggedIn = {
  render: () => {
    const handleLoginClick = () => {};
    const handleGetStartedClick = () => {};
    const redirectToLogin = () => {};

    return (
      <AppRouterContext.Provider value={mockRouter}>
        <div
          onClickCapture={(event) => {
            const target = event.target as HTMLElement | null;
            const clickable = target?.closest?.('a, button');
            if (clickable) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <HeaderSection
            isAuthenticated={true}
            displayName="Jordan Lee"
            displayRole="Admin"
            onLoginClick={handleLoginClick}
            onGetStartedClick={handleGetStartedClick}
            onRedirectToLogin={redirectToLogin}
          />
        </div>
      </AppRouterContext.Provider>
    );
  },
};
