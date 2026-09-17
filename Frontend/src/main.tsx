import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/app/App';
import PublicProjectPage from '@/features/projects/components/PublicProjectPage';
import { AuthProvider } from '@/features/auth/context/AuthContext';

import '@/app/styles/index.css';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

const publicPath = window.location.pathname.slice(import.meta.env.BASE_URL.length);
const publicMatch = /^shared\/([^/]+)\/?$/.exec(publicPath);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      {publicMatch ? (
        <PublicProjectPage token={publicMatch[1]!} />
      ) : (
        <AuthProvider>
          <App />
        </AuthProvider>
      )}
    </ThemeProvider>
  </React.StrictMode>,
);
