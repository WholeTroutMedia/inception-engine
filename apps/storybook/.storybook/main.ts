import type { StorybookConfig } from '@storybook/react-vite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: [
    // All component stories from packages/ui
    '../../../packages/ui/src/**/*.stories.@(ts|tsx|mdx)',
    // This app's own story files
    '../src/**/*.stories.@(ts|tsx|mdx)',
  ],
  addons: [
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-a11y'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/react-vite') as '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  viteFinal: async (config) => {
    return config;
  },
};

export default config;
