// Ladle global Provider — wraps every story.
// Mirrors the provider stack in src/main.tsx (Firebase config + mocks bootstrap +
// QueryClient + Auth + global.css) so stories can mount real components that
// touch repositories/services without each story needing to set up plumbing.
//
// Theme is fixed at "normal" for Phase 2. Phase 3 adds a controls-panel
// switcher for theme = normal | professional | mono. Light/dark uses Ladle's
// built-in mode addon, bridged to the project's `.dark` class convention.
//
// IMPORTANT: when a viewport preset is active in the width addon, Ladle wraps
// each story in an iframe (story.tsx StoryFrame). The iframe's <head> is empty
// by default, so global.css from the parent page doesn't cascade in. Provider
// runs INSIDE the iframe — we use a useEffect to clone the parent's stylesheets
// into the iframe's head on first mount. Without this, Tailwind utilities and
// theme tokens silently fail in mobile/tablet/desktop preview modes.

import * as React from 'react';
import type { GlobalProvider } from '@ladle/react';
import { QueryClientProvider } from '@tanstack/react-query';

// Side-effect imports — must run before any component touches Firebase.
// Ordering mirrors src/main.tsx exactly.
import '../src/config/firebase';
import '../src/__firebase-mocks__/seed/bootstrap';

// Global Tailwind 4 + theme tokens (same stylesheet main.tsx loads).
// This injects into the parent (Ladle host) document. The cloneStylesheets
// effect below mirrors them into the iframe document when stories run iframed.
import '../src/styles/global.css';
import 'flag-icons/css/flag-icons.min.css';

import { queryClient } from '../src/lib/queryClient';
import { AuthProvider } from '../src/contexts/AuthContext';

/**
 * When the Provider runs inside Ladle's story iframe, copy every <style> and
 * <link rel="stylesheet"> tag from the parent (host) document's head into the
 * iframe document's head. Without this, the iframe has an empty head and no
 * CSS — Tailwind utilities + theme tokens are invisible.
 *
 * Skips if not iframed (window === window.top) since the parent-side import
 * has already injected the stylesheets here.
 */
const useMirrorStylesheetsToOwnerDoc = (
  wrapperRef: React.RefObject<HTMLDivElement | null>,
): void => {
  React.useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;

    // ownerDocument is the document the rendered DOM lives in. When Ladle uses
    // a portal/iframe to render the story, ownerDocument !== window.document
    // even though the JS execution context (and `window`) is the parent.
    const targetDoc = node.ownerDocument;
    const sourceDoc = typeof window !== 'undefined' ? window.document : null;
    if (!sourceDoc || !targetDoc || targetDoc === sourceDoc) {
      // Same document; the import-side-effect already injected stylesheets here.
      return;
    }

    const seen = new Set<string>();
    const clones: HTMLElement[] = [];

    const cloneOnce = () => {
      const sources = sourceDoc.head.querySelectorAll<HTMLStyleElement | HTMLLinkElement>(
        'style, link[rel="stylesheet"]',
      );
      sources.forEach((src) => {
        const key =
          src.tagName === 'LINK'
            ? `link:${(src as HTMLLinkElement).href}`
            : `style:${src.textContent?.slice(0, 128) ?? ''}`;
        if (seen.has(key)) return;
        seen.add(key);
        const clone = src.cloneNode(true) as HTMLElement;
        targetDoc.head.appendChild(clone);
        clones.push(clone);
      });
    };

    cloneOnce();

    // Vite HMR injects new <style> tags dynamically (e.g., on first story
    // navigation when a CSS module is parsed). Mirror those too.
    const observer = new MutationObserver(() => cloneOnce());
    observer.observe(sourceDoc.head, { childList: true, subtree: false });

    return () => {
      observer.disconnect();
      clones.forEach((c) => c.parentNode?.removeChild(c));
    };
  }, [wrapperRef]);
};

export const Provider: GlobalProvider = ({ children, globalState }) => {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  useMirrorStylesheetsToOwnerDoc(wrapperRef);

  // Ladle's built-in `theme` addon emits `globalState.theme` = 'light' | 'dark'
  // (URL param: `?theme=dark`). `globalState.mode` is for fullscreen/preview,
  // unrelated to color mode. The project's CSS toggles dark variants via a
  // `.dark` class on a parent element (see frontend/src/styles/global.css).
  const isDark = globalState.theme === 'dark';

  // Phase 3 will replace this with a custom global for theme switcher.
  const theme = 'normal';

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div
          ref={wrapperRef}
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
