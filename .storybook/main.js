/** @type { import('@storybook/html').StorybookConfig } */
const config = {
  stories: ['../src/**/*.stories.@(js|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
    '@storybook/addon-viewport',
    '@storybook/addon-controls',
    '@storybook/addon-docs',
  ],
  framework: {
    name: '@storybook/html',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
  staticDirs: ['../public'],
  features: {
    storyStoreV7: true,
  },
  staticDirs: ['../public'],
  webpackFinal: async (config) => {
    return config;
  },
};

export default config;