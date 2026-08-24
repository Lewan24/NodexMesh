import { useState, useRef, useEffect } from 'react';
import type { Project, ToolType } from './types';
import { useAuth } from './auth/AuthContext';
import { useTheme } from './theme/ThemeContext';
import AdminUsersPanel from './AdminUsersPanel';

interface Props {
  projects: Project[];
  activeProjectId: string;
  selectedTool: ToolType;
  onSelectProject: (id: string) => void;
  onSelectTool: (tool: ToolType) => void;
  onAddProject: (name: string) => void;
}

const TOOLSIZE = "24"

const TOOLS: { id: ToolType; label: string; icon: React.ReactNode }[] = [
  {
    id: 'select', label: 'Select',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m4 4 7.07 17 2.51-7.39L21 11.07z" /></svg>,
  },
  {
    id: 'note', label: 'Sticky Note',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7 8h10M7 12h7" strokeLinecap="round" /></svg>,
  },
  {
    id: 'text', label: 'Text',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7V4h16v3M9 20h6M12 4v16" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  {
    id: 'kanban', label: 'Kanban Board',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="5" height="15" rx="1" /><rect x="10" y="3" width="5" height="10" rx="1" /><rect x="17" y="3" width="4" height="12" rx="1" /></svg>,
  },
  {
    id: 'checklist', label: 'Checklist',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  },
  {
    id: 'column', label: 'Column',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 8h16M4 13h16" strokeLinecap="round" /></svg>,
  },
  {
    id: 'image', label: 'Image',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>,
  },
  {
    id: 'link', label: 'Link Card',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>,
  },
  {
    id: 'line', label: 'Line / Arrow',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19L19 5" strokeLinecap="round" /><path d="M19 5h-6M19 5v6" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  },
  {
    id: 'frame', label: 'Frame',
    icon: <svg width={TOOLSIZE} height={TOOLSIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" /></svg>,
  },
];

export default function Sidebar({ projects, activeProjectId, selectedTool, onSelectProject, onSelectTool, onAddProject }: Props) {
  const { currentUser, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [expanded] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [newName, setNewName] = useState('');
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const accountPanelRef = useRef<HTMLDivElement>(null);
  const accountBtnRef = useRef<HTMLButtonElement>(null);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const sidebarWidth = expanded ? 180 : 100;

  useEffect(() => {
    if (!projectsOpen) return;
    const handler = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setProjectsOpen(false);
        setAddingProject(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [projectsOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const handler = (e: MouseEvent) => {
      if (!accountPanelRef.current?.contains(e.target as Node) && !accountBtnRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [accountOpen]);

  const handleAdd = () => {
    if (newName.trim()) {
      onAddProject(newName.trim());
      setNewName('');
      setAddingProject(false);
      setProjectsOpen(false);
    }
  };

  return (
    <>
      <aside
        className="flex flex-col h-full z-30 relative overflow-hidden"
        style={{
          width: sidebarWidth,
          backgroundColor: 'var(--color-chrome-bg)',
          borderRight: '1px solid var(--color-chrome-border)',
          flexShrink: 0,
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Logo */}
        <div
          className="flex flex-col items-center gap-2 flex-shrink-0 overflow-hidden p-1 mt-2"
          style={{ borderBottom: '1px solid var(--color-chrome-border)' }}
        >
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1.5" fill="white" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.6" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" fill="white" opacity="0.3" />
            </svg>
          </div>
          <span
            className="text-xs font-bold whitespace-nowrap"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            NodexMesh
          </span>
        </div>

        {/* Tool buttons */}
        <div className="flex-1 flex flex-col py-2 gap-2 overflow-y-auto overflow-x-hidden">
          {TOOLS.map(tool => {
            const active = selectedTool === tool.id;
            return (
              <button
                key={tool.id}
                onClick={() => onSelectTool(tool.id)}
                className="flex flex-col items-center p-2 mx-1.5 rounded-xl transition-all duration-100 flex-shrink-0 overflow-hidden"
                style={{
                  paddingLeft: 9,
                  paddingRight: 9,
                  backgroundColor: active ? 'var(--color-accent-soft-strong)' : 'transparent',
                  color: active ? 'var(--color-accent)' : 'var(--color-chrome-text-dim)',
                  boxShadow: active ? 'inset 0 0 0 1px rgba(124, 58, 237,0.4)' : 'none',
                  minWidth: 0,
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-chrome-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-chrome-text)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--color-chrome-text-dim)'; } }}
              >
                <span className="flex-shrink-0">{tool.icon}</span>
                <span className="text-sm font-medium" style={{ transition: 'opacity 0.15s ease', minWidth: 0 }}>
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Account */}
        <div style={{ borderTop: '1px solid var(--color-chrome-border)', padding: '6px 6px' }}>
          <button
            ref={accountBtnRef}
            onClick={() => setAccountOpen(v => !v)}
            className="w-full flex items-center gap-2.5 rounded-xl transition-all duration-100 p-2"
            style={{ backgroundColor: accountOpen ? 'var(--color-accent-soft)' : 'transparent' }}
            onMouseEnter={e => { if (!accountOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-chrome-hover)'; }}
            onMouseLeave={e => { if (!accountOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
            >
              {currentUser?.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium truncate flex-1 text-left" style={{ color: 'var(--color-chrome-text)' }}>
              {currentUser?.name}
            </span>
          </button>
        </div>

        {/* Project switcher */}
        <div style={{ borderTop: '1px solid var(--color-chrome-border)', padding: '6px 6px' }}>
          <button
            ref={btnRef}
            onClick={() => setProjectsOpen(v => !v)}
            className="w-full flex flex-col items-center gap-3 rounded-xl transition-all duration-100 p-2"
            style={{
              paddingLeft: 9,
              backgroundColor: projectsOpen ? 'var(--color-accent-soft)' : 'transparent',
              minWidth: 0,
            }}
            onMouseEnter={e => { if (!projectsOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-chrome-hover)'; }}
            onMouseLeave={e => { if (!projectsOpen) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            {activeProject && (
              <>
                <div
                  className="w-3.5 h-3.5 rounded-full flex-shrink-0 text-center"
                  style={{
                    backgroundColor: activeProject.color,
                    boxShadow: projectsOpen ? `0 0 8px ${activeProject.color}` : 'none',
                  }}
                />
                <span
                  className="text-sm font-medium truncate flex-1 text-wrap"
                  style={{ color: 'var(--color-chrome-text)', minWidth: 0 }}
                >
                  {activeProject.name}
                </span>
                <svg
                  width="10" height="6" viewBox="0 0 10 6" fill="none"
                  style={{ opacity: expanded ? 0.5 : 0, transition: 'opacity 0.15s ease', flexShrink: 0, marginRight: 6 }}
                >
                  <path d={projectsOpen ? "M1 5l4-4 4 4" : "M1 1l4 4 4-4"} stroke="var(--color-chrome-text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Floating account panel */}
      {accountOpen && (
        <div
          ref={accountPanelRef}
          className="absolute z-40 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            left: sidebarWidth + 8,
            bottom: 64,
            width: 220,
            backgroundColor: 'var(--color-chrome-bg-alt)',
            border: '1px solid var(--color-chrome-border-soft)',
            animation: 'slide-up 0.15s ease forwards',
          }}
        >
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid var(--color-chrome-border-soft)' }}>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-chrome-text-strong)' }}>{currentUser?.name}</p>
            <p className="text-xs mt-0.5 truncate capitalize" style={{ color: 'var(--color-chrome-text-faint)' }}>
              @{currentUser?.username} · {currentUser?.role}
            </p>
          </div>
          <div className="py-1.5">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors"
              style={{ color: 'var(--color-chrome-text)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-chrome-panel)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {theme === 'light' ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                </svg>
              )}
              {theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            </button>
            {isAdmin && (
              <button
                onClick={() => { setAdminPanelOpen(true); setAccountOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors"
                style={{ color: 'var(--color-chrome-text)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-chrome-panel)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                Manage users
              </button>
            )}
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm transition-colors"
              style={{ color: 'var(--color-danger)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-chrome-panel)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Log out
            </button>
          </div>
        </div>
      )}

      {adminPanelOpen && <AdminUsersPanel onClose={() => setAdminPanelOpen(false)} />}

      {/* Floating project panel */}
      {projectsOpen && (
        <div
          ref={panelRef}
          className="absolute z-40 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            left: sidebarWidth + 8,
            bottom: 8,
            width: 240,
            backgroundColor: 'var(--color-chrome-bg-alt)',
            border: '1px solid var(--color-chrome-border-soft)',
            animation: 'slide-up 0.15s ease forwards',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--color-chrome-border-soft)' }}>
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-chrome-text-faint)' }}>Projects</span>
            <button
              onClick={() => setAddingProject(v => !v)}
              className="w-5 h-5 flex items-center justify-center rounded-md transition-colors"
              style={{ color: 'var(--color-chrome-text-faint)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-accent)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-chrome-text-faint)'; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {addingProject && (
            <div className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--color-chrome-border-soft)' }}>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAdd();
                  if (e.key === 'Escape') { setAddingProject(false); setNewName(''); }
                }}
                placeholder="Project name…"
                className="w-full text-sm px-3 py-2 rounded-xl outline-none text-white placeholder-[#3a6070] transition-colors"
                style={{ backgroundColor: 'var(--color-chrome-panel)', border: '1px solid rgba(124, 58, 237,0.4)' }}
              />
            </div>
          )}

          <div className="py-1.5 max-h-72 overflow-y-auto">
            {projects.map(project => {
              const active = project.id === activeProjectId;
              return (
                <button
                  key={project.id}
                  onClick={() => { onSelectProject(project.id); setProjectsOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-all duration-100"
                  style={{ backgroundColor: active ? 'var(--color-chrome-panel)' : 'transparent' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-chrome-hover)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color, boxShadow: active ? `0 0 6px ${project.color}` : 'none' }}
                  />
                  <span className="text-sm font-medium flex-1 truncate" style={{ color: active ? 'var(--color-chrome-text-strong)' : 'var(--color-chrome-text)' }}>
                    {project.name}
                  </span>
                  <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--color-chrome-text-faint)' }}>
                    {project.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
