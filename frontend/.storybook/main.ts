import type { StorybookConfig } from '@storybook/nextjs';
import path from 'path';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': path.resolve(__dirname, '../src'),
        '@/lib/api/facebookMetaPhotoApi': path.resolve(
          __dirname,
          '../src/stories/facebook-meta/mocks/facebookMetaPhotoApi.mock.ts'
        ),
        '@/lib/api/facebookMetaVideoApi': path.resolve(
          __dirname,
          '../src/stories/facebook-meta/mocks/facebookMetaVideoApi.mock.ts'
        ),
        'next/navigation': path.resolve(
          __dirname,
          '../src/stories/mocks/nextNavigation.mock.ts'
        ),
        '@/components/ui/Modal': path.resolve(
          __dirname,
          '../src/stories/components/StorybookModal.tsx'
        ),
      };
    }
    return config;
  },
};

export default config;

