import { useEffect, useRef, useState } from 'react';
import type { Project } from '../../data/types';
import { useAuth } from '../../components/auth/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import AdminUsersPanel from '../auth/pages/AdminUsersPanel';

interface Props {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => void;
}

export default function AppBar({
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
}: Props) {
  const { currentUser, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [projectsOpen, setProjectsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const projectPanelRef = useRef<HTMLDivElement>(null);
  const projectButtonRef = useRef<HTMLButtonElement>(null);

  const accountPanelRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);

  useEffect(() => {
    if (!projectsOpen) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        !projectPanelRef.current?.contains(target) &&
        !projectButtonRef.current?.contains(target)
      ) {
        setProjectsOpen(false);
        setAddingProject(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [projectsOpen]);

  useEffect(() => {
    if (!accountOpen) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;

      if (
        !accountPanelRef.current?.contains(target) &&
        !accountButtonRef.current?.contains(target)
      ) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [accountOpen]);

  const handleAddProject = () => {
    const name = newName.trim();

    if (!name) return;

    onAddProject(name);

    setNewName('');
    setAddingProject(false);
    setProjectsOpen(false);
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
        {/* Logo */}
        <div
          className="h-full flex items-center gap-2.5 px-4"
          style={{
            borderRight: '1px solid var(--color-chrome-border)',
          }}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'var(--color-accent)',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
            >
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                fill="white"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
                rx="1.5"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                fill="white"
                opacity="0.6"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1.5"
                fill="white"
                opacity="0.3"
              />
            </svg>
          </div>

          <span className='text-(--color-accent) font-bold'>NodexMesh</span>
        </div>

        {/* Project */}
        <div className="relative ml-3">
          <button
            ref={projectButtonRef}
            onClick={() => {
              setProjectsOpen(v => !v);
              setAccountOpen(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
            style={{
              backgroundColor: projectsOpen
                ? 'var(--color-accent-soft)'
                : 'transparent',
            }}
            onMouseEnter={e => {
              if (!projectsOpen) {
                e.currentTarget.style.backgroundColor =
                  'var(--color-chrome-hover)';
              }
            }}
            onMouseLeave={e => {
              if (!projectsOpen) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {activeProject && (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: activeProject.color,
                    boxShadow: projectsOpen
                      ? `0 0 8px ${activeProject.color}`
                      : 'none',
                  }}
                />

                <span
                  className="text-sm font-medium max-w-48 truncate"
                  style={{
                    color: 'var(--color-chrome-text-strong)',
                  }}
                >
                  {activeProject.name}
                </span>
              </>
            )}

            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
            >
              <path
                d={projectsOpen ? 'M1 5l4-4 4 4' : 'M1 1l4 4 4-4'}
                stroke="var(--color-chrome-text-dim)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Project dropdown */}
          {projectsOpen && (
            <div
              ref={projectPanelRef}
              className="absolute top-[calc(100%+8px)] left-0 w-64 rounded-2xl shadow-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--color-chrome-bg-alt)',
                border: '1px solid var(--color-chrome-border-soft)',
                animation: 'slide-up 0.15s ease forwards',
              }}
            >
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderBottom:
                    '1px solid var(--color-chrome-border-soft)',
                }}
              >
                <span
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{
                    color: 'var(--color-chrome-text-faint)',
                  }}
                >
                  Projects
                </span>

                <button
                  onClick={() => setAddingProject(v => !v)}
                  className="w-6 h-6 flex items-center justify-center rounded-md"
                  style={{
                    color: 'var(--color-chrome-text-faint)',
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>

              {addingProject && (
                <div
                  className="px-3 py-2.5"
                  style={{
                    borderBottom:
                      '1px solid var(--color-chrome-border-soft)',
                  }}
                >
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        handleAddProject();
                      }

                      if (e.key === 'Escape') {
                        setAddingProject(false);
                        setNewName('');
                      }
                    }}
                    placeholder="Project name…"
                    className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                    style={{
                      backgroundColor:
                        'var(--color-chrome-panel)',
                      color: 'var(--color-chrome-text)',
                      border:
                        '1px solid rgba(124, 58, 237, 0.4)',
                    }}
                  />
                </div>
              )}

              <div className="py-1.5 max-h-72 overflow-y-auto">
                {projects.map(project => {
                  const active = project.id === activeProjectId;

                  return (
                    <button
                      key={project.id}
                      onClick={() => {
                        onSelectProject(project.id);
                        setProjectsOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors"
                      style={{
                        backgroundColor: active
                          ? 'var(--color-chrome-panel)'
                          : 'transparent',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor =
                            'var(--color-chrome-hover)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor =
                            'transparent';
                        }
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: project.color,
                          boxShadow: active
                            ? `0 0 6px ${project.color}`
                            : 'none',
                        }}
                      />

                      <span
                        className="text-sm font-medium flex-1 truncate"
                        style={{
                          color: active
                            ? 'var(--color-chrome-text-strong)'
                            : 'var(--color-chrome-text)',
                        }}
                      >
                        {project.name}
                      </span>

                      <span
                        className="text-[10px] font-mono"
                        style={{
                          color:
                            'var(--color-chrome-text-faint)',
                        }}
                      >
                        {project.items.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Account */}
        <div className="relative mr-3">
          <button
            ref={accountButtonRef}
            onClick={() => {
              setAccountOpen(v => !v);
              setProjectsOpen(false);
            }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-colors"
            style={{
              backgroundColor: accountOpen
                ? 'var(--color-accent-soft)'
                : 'transparent',
            }}
            onMouseEnter={e => {
              if (!accountOpen) {
                e.currentTarget.style.backgroundColor =
                  'var(--color-chrome-hover)';
              }
            }}
            onMouseLeave={e => {
              if (!accountOpen) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
              style={{
                backgroundColor:
                  'var(--color-accent-soft)',
                color: 'var(--color-accent)',
              }}
            >
              {currentUser?.name?.charAt(0).toUpperCase()}
            </div>

            <div className="hidden sm:block text-left max-w-32">
              <div
                className="text-xs font-semibold truncate"
                style={{
                  color: 'var(--color-chrome-text)',
                }}
              >
                {currentUser?.name}
              </div>

              <div
                className="text-[10px] truncate"
                style={{
                  color: 'var(--color-chrome-text-faint)',
                }}
              >
                @{currentUser?.username}
              </div>
            </div>

            <svg
              width="10"
              height="6"
              viewBox="0 0 10 6"
              fill="none"
            >
              <path
                d={accountOpen ? 'M1 5l4-4 4 4' : 'M1 1l4 4 4-4'}
                stroke="var(--color-chrome-text-dim)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Account dropdown */}
          {accountOpen && (
            <div
              ref={accountPanelRef}
              className="absolute right-0 top-[calc(100%+8px)] w-60 rounded-2xl shadow-2xl overflow-hidden"
              style={{
                backgroundColor: 'var(--color-chrome-bg-alt)',
                border: '1px solid var(--color-chrome-border-soft)',
                animation: 'slide-up 0.15s ease forwards',
              }}
            >
              <div
                className="px-4 py-3.5"
                style={{
                  borderBottom:
                    '1px solid var(--color-chrome-border-soft)',
                }}
              >
                <p
                  className="text-sm font-semibold truncate"
                  style={{
                    color:
                      'var(--color-chrome-text-strong)',
                  }}
                >
                  {currentUser?.name}
                </p>

                <p
                  className="text-xs mt-0.5 truncate capitalize"
                  style={{
                    color:
                      'var(--color-chrome-text-faint)',
                  }}
                >
                  @{currentUser?.username} · {currentUser?.role}
                </p>
              </div>

              <div className="py-1.5">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                  style={{
                    color: 'var(--color-chrome-text)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor =
                      'var(--color-chrome-panel)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor =
                      'transparent';
                  }}
                >
                  {theme === 'light' ? (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                    </svg>
                  ) : (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="4" />
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l1.41-1.41" />
                    </svg>
                  )}

                  {theme === 'light'
                    ? 'Switch to dark mode'
                    : 'Switch to light mode'}
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setAdminPanelOpen(true);
                      setAccountOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                    style={{
                      color:
                        'var(--color-chrome-text)',
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>

                    Manage users
                  </button>
                )}

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                  style={{
                    color: 'var(--color-danger)',
                  }}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>

                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {adminPanelOpen && (
        <AdminUsersPanel
          onClose={() => setAdminPanelOpen(false)}
        />
      )}
    </>
  );
}