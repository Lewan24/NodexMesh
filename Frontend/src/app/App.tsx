import { useAuth } from '@/features/auth/hooks/useAuth';
import LoginPage from '@/features/auth/pages/LoginPage';
import BoardPage from '@/features/board/pages/BoardPage';
import AdminUsersPanel from '@/features/auth/pages/AdminUsersPanel';
import { useEffect, useState } from 'react';

export default function App() {
  const { currentUser } = useAuth();
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'admin') setAdminPanelOpen(true);
  }, [currentUser?.id, currentUser?.role]);

  if (!currentUser) return <LoginPage />;
  if (currentUser.role === 'admin' && adminPanelOpen)
    return <AdminUsersPanel onClose={() => setAdminPanelOpen(false)} />;

  return <BoardPage key={currentUser.id} userId={currentUser.id} />;
}
