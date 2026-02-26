/**
 * Storybook mock for next/navigation. Provides no-op router and configurable params.
 */

export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  refresh: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
  pathname: '/',
  query: {},
  asPath: '/',
});

export const useParams = () => ({
  projectId: '1',
  spreadsheetId: '1',
});

export const usePathname = () => '/';

export const useSearchParams = () => new URLSearchParams();
