import { useEffect, useRef } from 'react';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { useNavigationStore } from '@/shared/stores/useNavigationStore';
import { pathToView, viewToPath, normalizePath } from '@/lib/routeMapping';

export function useRouterSync() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const view = useNavigationStore((s) => s.view);
  const skipUrlSync = useRef(false);
  const skipViewSync = useRef(false);

  // URL → Zustand: browser back/forward or direct URL entry
  useEffect(() => {
    if (skipUrlSync.current) {
      skipUrlSync.current = false;
      return;
    }

    const viewForUrl = pathToView(pathname);
    if (viewForUrl && viewForUrl !== useNavigationStore.getState().view) {
      skipViewSync.current = true;
      useNavigationStore.getState().setView(viewForUrl);
    }
  }, [pathname]);

  // Zustand → URL: when setView() is called from existing code
  useEffect(() => {
    if (skipViewSync.current) {
      skipViewSync.current = false;
      return;
    }

    const urlForView = viewToPath(view);
    const currentNormalized = normalizePath(router.state.location.pathname);
    if (urlForView !== currentNormalized) {
      skipUrlSync.current = true;
      router.navigate({ to: urlForView as string });
    }
  }, [view, router]);
}
