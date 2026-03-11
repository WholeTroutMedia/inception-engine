import type { Preview } from '@storybook/react';
import '@inception/design-tokens/css/light';
import '@inception/design-tokens/css/dark';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: 'var(--inc-color-background-default, #ffffff)' },
        { name: 'dark', value: '#09090b' },
      ],
    },
    docs: {
      theme: undefined,
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'light';
      document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : '');
      return <Story />;
    },
  ],
};

export default preview;
