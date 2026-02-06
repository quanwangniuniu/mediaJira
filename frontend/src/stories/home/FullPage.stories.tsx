import React from 'react';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import Page from '../../app/page';

const mockRouter = {
  back: () => {},
  forward: () => {},
  prefetch: async () => {},
  push: () => {},
  refresh: () => {},
  replace: () => {},
};

const meta = {
  title: 'Home/FullPage',
  component: Page,
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: true,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Full home page layout.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
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
        <Page />
      </div>
    </AppRouterContext.Provider>
  ),
};
