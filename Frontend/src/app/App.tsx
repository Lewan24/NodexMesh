import { useAuth } from '@/features/auth/hooks/useAuth';
import LoginPage from '@/features/auth/pages/LoginPage';
import BoardPage from '@/features/board/pages/BoardPage';
import AdminUsersPanel from '@/features/auth/pages/AdminUsersPanel';
import ProfilePage from '@/features/auth/pages/ProfilePage';
import { useEffect, useState } from 'react';

export default function App() {
  const { currentUser } = useAuth();
  const [view, setView] = useState<'workspace' | 'admin' | 'profile'>('workspace');

  useEffect(() => {
    setView(currentUser?.role === 'admin' ? 'admin' : 'workspace');
  }, [currentUser?.id, currentUser?.role]);

  if (!currentUser) return <LoginPage />;
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
