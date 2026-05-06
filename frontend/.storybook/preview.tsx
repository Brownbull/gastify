// Storybook 10 preview config — global decorators + parameters.
// Mirrors the provider stack in src/main.tsx (Firebase config + mocks bootstrap +
// QueryClient + Auth + global.css) so stories can mount real components that
// touch repositories/services without each story setting up plumbing.
//
// Unlike Ladle, Storybook injects CSS imports from preview.tsx directly into
// the story iframe — no manual stylesheet mirroring needed.

import * as React from 'react';
import type { Preview, Decorator } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';
import { QueryClientProvider } from '@tanstack/react-query';

// Side-effect imports — must run before any component touches Firebase.
// Ordering mirrors src/main.tsx exactly.
import '../src/config/firebase';
import '../src/__firebase-mocks__/seed/bootstrap';

// Global Tailwind 4 + theme tokens (same stylesheet main.tsx loads).
import '../src/styles/global.css';
import 'flag-icons/css/flag-icons.min.css';

import { queryClient } from '../src/lib/queryClient';
import { AuthProvider } from '../src/contexts/AuthContext';
import { withRouter } from './withRouter';

const withProviders: Decorator = (Story, context) => {
  // Custom global from globalTypes.colorTheme — picked from the toolbar.
  const colorTheme = (context.globals.colorTheme as string) || 'normal';

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div
          data-theme={colorTheme}
          style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family)',
          }}
        >
          <Story />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile (390×844)',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablet (768×1024)',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop (1440×900)',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
      },
      defaultViewport: 'mobile',
    },
  },
  decorators: [
    withThemeByClassName({
      themes: { light: '', dark: 'dark' },
      defaultTheme: 'light',
    }),
    withRouter,
    withProviders,
  ],
  globalTypes: {
    colorTheme: {
      name: 'Color theme',
      description: 'data-theme attribute (Normal/Professional/Mono)',
      defaultValue: 'normal',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'normal', title: 'Normal (warm)' },
          { value: 'professional', title: 'Professional (cool)' },
          { value: 'mono', title: 'Mono (grayscale)' },
        ],
        showName: true,
      },
    },
  },
};

export default preview;
