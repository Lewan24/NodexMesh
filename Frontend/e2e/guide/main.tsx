import '@/shared/i18n';
import '@/app/styles/index.css';
import { createRoot } from 'react-dom/client';
import { authService, isMockDataSource } from '@/app/services';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { BrandingProvider } from '@/features/branding/BrandingProvider';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import AdminUsersPanel from '@/features/auth/pages/AdminUsersPanel';
import LibraryDialog from '@/features/library/LibraryDialog';
import SharingDialog from '@/features/projects/components/SharingDialog';
import UserGuideProvider from '@/features/user-guide/UserGuideProvider';
import TooltipLayer from '@/shared/components/TooltipLayer';

// Production components + fictional, route-intercepted API data. No live server is used.
if (isMockDataSource) throw new Error('Guide screenshots require the isolated HTTP fixture.');
const userId = '20000000-0000-4000-8000-000000000001';
const projectId = '20000000-0000-4000-8000-000000000002';
localStorage.setItem(`nodexmesh.user-guide.${userId}`, 'dismissed');
await authService.login({ username: 'anna@example.invalid', password: 'fixture-only' });
const panel = new URLSearchParams(location.search).get('panel');
createRoot(document.getElementById('root')!).render(
  <BrandingProvider>
    <ThemeProvider>
      <AuthProvider>
        <UserGuideProvider userId={userId}>
          <TooltipLayer />
          {panel === 'library' ? (
            <LibraryDialog projectId={projectId} onClose={() => {}} />
          ) : panel === 'sharing' ? (
            <SharingDialog
              project={{
                id: projectId,
                name: 'Nowa strona — zespół',
                color: '#334c5c',
                items: [],
                ownerId: userId,
                role: 'Owner',
              }}
              userId={userId}
              onClose={() => {}}
              onLeave={() => {}}
            />
          ) : (
            <AdminUsersPanel />
          )}
        </UserGuideProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrandingProvider>,
);
