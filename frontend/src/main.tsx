// CRITICAL: Import firebase config FIRST to ensure initializeFirestore with
// long polling is called before any other code calls getFirestore()
// This prevents CORS issues with the Firebase emulator
import './config/firebase';
// gastify mock build — seed the in-memory Firestore on first run so the
// Dashboard renders with real-looking data instead of an empty state.
import './__firebase-mocks__/seed/bootstrap';

// Built Tailwind 4 + theme tokens — replaces the legacy <script src="cdn.tailwindcss.com">
// + inline <style> block in index.html (migrated 2026-04-28 per the Ladle pivot plan).
import './styles/global.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from './lib/queryClient';
import { router } from './router';
import { AppErrorBoundary } from './components/App';
import { AuthProvider } from './contexts/AuthContext';
import { preloadCountries } from './services/locationService';
import 'flag-icons/css/flag-icons.min.css';

preloadCountries();

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <AppErrorBoundary>
                    <RouterProvider router={router} />
                </AppErrorBoundary>
            </AuthProvider>
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    </React.StrictMode>
);
