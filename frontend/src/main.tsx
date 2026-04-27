// CRITICAL: Import firebase config FIRST to ensure initializeFirestore with
// long polling is called before any other code calls getFirestore()
// This prevents CORS issues with the Firebase emulator
import './config/firebase';
// gastify mock build — seed the in-memory Firestore on first run so the
// Dashboard renders with real-looking data instead of an empty state.
import './__firebase-mocks__/seed/bootstrap';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
// Story 14c-refactor.11: Use new theme-aware AppErrorBoundary
import { AppErrorBoundary } from './components/App';
// Story 14c-refactor.9: AuthProvider for app-wide authentication context
import { AuthProvider } from './contexts/AuthContext';
// Story 14e-11: ScanProvider removed - Zustand store is global, no provider needed
// Story 14.35: Preload localized country data
import { preloadCountries } from './services/locationService';
// Story 14.35b: Flag icons CSS for foreign location display
import 'flag-icons/css/flag-icons.min.css';
import App from './App';

// Story 14.35: Warm location cache on app startup (fire-and-forget)
preloadCountries();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            {/* Story 14c-refactor.9: AuthProvider for app-wide authentication */}
            <AuthProvider>
                {/* Story 14d-v2-0: ViewModeProvider removed - Zustand store is global */}
                {/* Story 14e-11: ScanProvider removed - scan state managed by Zustand */}
                {/* Story 14c-refactor.11: Theme-aware error boundary */}
                <AppErrorBoundary>
                    <App />
                </AppErrorBoundary>
            </AuthProvider>
            {/* Story 14.29: React Query DevTools - only in development */}
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    </React.StrictMode>
);
