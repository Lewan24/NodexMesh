import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/app/App';
import { AuthProvider } from '@/features/auth/context/AuthContext';

import '@/app/styles/index.css';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

ReactDOM.createRoot(
  document.getElementById('root')!,
).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);