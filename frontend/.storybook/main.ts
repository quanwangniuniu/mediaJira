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
      // Ensure alias is an object
      if (!config.resolve.alias || Array.isArray(config.resolve.alias)) {
        config.resolve.alias = {};
      }
      
      // Set up aliases
      config.resolve.alias['@'] = path.resolve(__dirname, '../src');
      
      // Mock next/navigation for Storybook/Chromatic
      // Use absolute path to ensure it works in CI environments
      const mockPath = path.resolve(__dirname, './mocks/next-navigation.ts');
      config.resolve.alias['next/navigation'] = mockPath;
    }
    return config;
  },
};

export default config;

