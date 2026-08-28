import { useState } from 'react';

import type { Project } from '@/entities/project/types';

import { useAuth } from '@/features/auth/hooks/useAuth';
import AdminUsersPanel from '@/features/auth/pages/AdminUsersPanel';

import { useTheme } from '@/app/providers/ThemeProvider';

import AppLogo from './components/AppLogo';
import AccountMenu from './components/AccountMenu';
import ProjectMenu from './components/ProjectMenu';

interface AppBarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => void;
}

type OpenMenu = 'projects' | 'account' | null;

export default function AppBar({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
}: AppBarProps) {
  const { currentUser, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);

  const toggleMenu = (menu: Exclude<OpenMenu, null>) => {
    setOpenMenu(current => current === menu ? null : menu);
  };

  const openAdminPanel = () => {
    setOpenMenu(null);
    setAdminPanelOpen(true);
  };

  return (
    <>
      <header
        className="h-14 flex items-center flex-shrink-0 relative z-40"
        style={{
          backgroundColor: 'var(--color-chrome-bg)',
          borderBottom: '1px solid var(--color-chrome-border)',
        }}
      >
        <AppLogo />

        <ProjectMenu
          projects={projects}
          activeProjectId={activeProjectId}
          open={openMenu === 'projects'}
          onToggle={() => toggleMenu('projects')}
          onClose={() => setOpenMenu(null)}
          onSelectProject={onSelectProject}
          onAddProject={onAddProject}
        />

        <div className="flex-1" />

        <AccountMenu
          user={currentUser}
          isAdmin={isAdmin}
          theme={theme}
          open={openMenu === 'account'}
          onToggle={() => toggleMenu('account')}
          onClose={() => setOpenMenu(null)}
          onToggleTheme={toggleTheme}
          onManageUsers={openAdminPanel}
          onLogout={logout}
        />
      </header>

      {adminPanelOpen && (
        <AdminUsersPanel onClose={() => setAdminPanelOpen(false)} />
      )}
    </>
  );
}