import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/hooks/useAuth';
import LoginPage from '@/features/auth/pages/LoginPage';
import { lazy, Suspense, useState } from 'react';
import type { User } from '@/entities/user/types';
import LoadingScreen from '@/shared/components/LoadingScreen';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import UserGuideProvider from '@/features/user-guide/UserGuideProvider';

const BoardPage = lazy(() => import('@/features/board/pages/BoardPage'));
const AdminUsersPanel = lazy(() => import('@/features/auth/pages/AdminUsersPanel'));
const ProfilePage = lazy(() => import('@/features/auth/pages/ProfilePage'));

export default function App() {
  useTranslation();
  const { currentUser } = useAuth();

  if (!currentUser) return <LoginPage />;

  return (
    <ErrorBoundary resetKey={`${currentUser.id}:${currentUser.role}`}>
      <Suspense fallback={<LoadingScreen />}>
        <UserGuideProvider key={currentUser.id} userId={currentUser.id}>
          <AuthenticatedApp key={`${currentUser.id}:${currentUser.role}`} currentUser={currentUser} />
        </UserGuideProvider>
      </Suspense>
    </ErrorBoundary>
  );
}

function AuthenticatedApp({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<'workspace' | 'admin' | 'profile'>(() =>
    currentUser.role === 'admin' ? 'admin' : 'workspace',
  );

  if (view === 'profile') return <ProfilePage onClose={() => setView('workspace')} />;
  if (currentUser.role === 'admin' && view === 'admin') return <AdminUsersPanel onClose={() => setView('workspace')} />;

  return (
    <BoardPage
      key={currentUser.id}
      userId={currentUser.id}
      onOpenAdminPanel={() => setView('admin')}
      onOpenProfile={() => setView('profile')}
    />
  );
}
