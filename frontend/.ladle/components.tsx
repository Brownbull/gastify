// Ladle global Provider — wraps every story.
// Mirrors the provider stack in src/main.tsx (Firebase config + mocks bootstrap +
// QueryClient + Auth + global.css) so stories can mount real components that
// touch repositories/services without each story needing to set up plumbing.
//
// Theme is fixed at "normal" for Phase 2. Phase 3 adds a controls-panel
// switcher for theme = normal | professional | mono. Light/dark uses Ladle's
// built-in mode addon, bridged to the project's `.dark` class convention.

import type { GlobalProvider } from '@ladle/react';
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

export const Provider: GlobalProvider = ({ children, globalState }) => {
  // Ladle's built-in mode addon emits `globalState.mode` = 'light' | 'dark'.
  // The project's CSS toggles dark variants via a `.dark` class on a parent
  // element (see frontend/src/styles/global.css).
  const isDark = globalState.mode === 'dark';

  // Phase 3 will replace this with a custom global for theme switcher.
  const theme = 'normal';

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div
          data-theme={theme}
          className={isDark ? 'dark' : ''}
          style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-family)',
          }}
        >
          {children}
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
};
