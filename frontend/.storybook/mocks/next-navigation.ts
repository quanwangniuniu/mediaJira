// Mock for next/navigation in Storybook
// This file is used to mock Next.js navigation hooks in Storybook/Chromatic environment
// IMPORTANT: This must match the exact exports from next/navigation

// Mock router object
const mockRouter = {
  push: (path: string) => {
    if (typeof window !== 'undefined') {
      console.log('[Storybook] Navigate to:', path);
    }
  },
  replace: (path: string) => {
    if (typeof window !== 'undefined') {
      console.log('[Storybook] Replace with:', path);
    }
  },
  prefetch: (path: string) => {
    if (typeof window !== 'undefined') {
      console.log('[Storybook] Prefetch:', path);
    }
  },
  back: () => {
    if (typeof window !== 'undefined') {
      console.log('[Storybook] Navigate back');
    }
  },
  forward: () => {
    if (typeof window !== 'undefined') {
      console.log('[Storybook] Navigate forward');
    }
  },
  refresh: () => {
    if (typeof window !== 'undefined') {
      console.log('[Storybook] Refresh');
    }
  },
  pathname: '/',
  query: {},
  asPath: '/',
};

// Export as both named export and default export to match Next.js behavior
export function useRouter() {
  return mockRouter;
}

// Also export as const for compatibility
export const usePathname = () => '/';

export const useSearchParams = () => new URLSearchParams();
