import '@/shared/i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/app/App';
import { AuthProvider } from '@/features/auth/context/AuthContext';

import '@/app/styles/index.css';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import AppUpdateDialog from '@/features/version/components/AppUpdateDialog';
import LoadingScreen from '@/shared/components/LoadingScreen';
import ErrorBoundary from '@/shared/components/ErrorBoundary';

const PublicProjectPage = React.lazy(() => import('@/features/projects/components/PublicProjectPage'));

const publicPath = window.location.pathname.slice(import.meta.env.BASE_URL.length);
const publicMatch = /^shared\/([^/]+)\/?$/.exec(publicPath);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        {publicMatch ? (
          <React.Suspense fallback={<LoadingScreen />}>
            <PublicProjectPage token={publicMatch[1]!} />
          </React.Suspense>
        ) : (
          <>
            <AuthProvider>
              <App />
            </AuthProvider>
            <AppUpdateDialog />
          </>
        )}
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
