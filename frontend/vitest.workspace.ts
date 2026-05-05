import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'unit',
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      exclude: ['src/**/*.stories.{ts,tsx}'],
    },
  },
  // Storybook browser tests — uncomment when @storybook/addon-vitest is installed:
  // {
  //   extends: './vite.config.ts',
  //   plugins: [
  //     storybookTest({ configDir: '.storybook' }),
  //   ],
  //   test: {
  //     name: 'storybook',
  //     browser: {
  //       enabled: true,
  //       headless: true,
  //       provider: 'playwright',
  //       instances: [{ browser: 'chromium' }],
  //     },
  //     setupFiles: ['.storybook/vitest.setup.ts'],
  //     include: ['src/**/*.stories.{ts,tsx}'],
  //   },
  // },
]);
