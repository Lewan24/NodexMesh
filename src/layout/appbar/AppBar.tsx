import { useState } from 'react';

import type { Project } from '@/entities/project/types';

import { useAuth } from '@/features/auth/hooks/useAuth';
import AdminUsersPanel from '@/features/auth/pages/AdminUsersPanel';

import { useTheme } from '@/app/providers/ThemeProvider';

import AppLogo from './components/AppLogo';
import AccountMenu from './components/AccountMenu';
import ProjectMenu from './components/ProjectMenu';

interface AppBarProps {
  onAppearance: () => void;
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => void;
  onResetDemo: () => void;
  onRenameProject: (id: string, name: string) => void;
  onTrashProject: (id: string) => void;
  onEmptyTrash: () => void;
  onRestoreProject: (id: string) => void;
  searchQuery: string;
  onSearchQueryChange: (
    value: string,
  ) => void;
}

type OpenMenu = 'projects' | 'account' | null;

export default function AppBar({
  onAppearance,
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onResetDemo,
  onRenameProject,
  onTrashProject,
  onRestoreProject,
  onEmptyTrash,
  searchQuery,
  onSearchQueryChange,
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
        data-app-bar="true"
        className="h-14 min-h-14 flex items-center shrink-0 relative z-50"
        style={{
          backgroundColor: 'var(--color-chrome-bg)',
          borderBottom: '1px solid var(--color-chrome-border)',
        }}
      >
        <AppLogo />
        <button onClick={onAppearance} className="px-3 py-2 text-sm text-white/90 hover:text-white" title="Personal project appearance">Appearance</button>

        <ProjectMenu
          projects={projects}
          activeProjectId={activeProjectId}
          open={openMenu === 'projects'}
          onToggle={() => toggleMenu('projects')}
          onClose={() => setOpenMenu(null)}
          onSelectProject={onSelectProject}
          onAddProject={onAddProject}
          onRenameProject={onRenameProject}
          onTrashProject={onTrashProject}
          onRestoreProject={onRestoreProject}
          onEmptyTrash={onEmptyTrash}
        />

        <div className="flex-1 flex justify-center px-4">
          <div
            className="relative w-full max-w-md"
          >
            <div
              className="h-9 flex items-center gap-2 rounded-xl border px-3 transition-colors"
              style={{
                backgroundColor:
                  'var(--color-chrome-bg-alt)',
                borderColor:
                  searchQuery
                    ? 'var(--color-accent)'
                    : 'var(--color-chrome-border-soft)',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{
                  color:
                    searchQuery
                      ? 'var(--color-accent)'
                      : 'var(--color-chrome-text-faint)',
                }}
              >
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                />
                <path d="m21 21-4.35-4.35" />
              </svg>

              <input
                value={searchQuery}
                onChange={event =>
                  onSearchQueryChange(
                    event.target.value,
                  )
                }
                onKeyDown={event => {
                  if (
                    event.key === 'Escape'
                  ) {
                    onSearchQueryChange('');
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Search text or #tag or status:xxxx..."
                className="flex-1 min-w-0 bg-transparent outline-none text-xs"
                style={{
                  color:
                    'var(--color-chrome-text)',
                }}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    onSearchQueryChange('')
                  }
                  className="w-5 h-5 flex items-center justify-center rounded-md"
                  style={{
                    color:
                      'var(--color-chrome-text-faint)',
                  }}
                  title="Clear search"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

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
          onResetDemo={onResetDemo}
        />
      </header>

      {adminPanelOpen && (
        <AdminUsersPanel onClose={() => setAdminPanelOpen(false)} />
      )}
    </>
  );
}
