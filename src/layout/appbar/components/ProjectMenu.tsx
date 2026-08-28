import { useRef, useState } from 'react';
import type { Project } from '@/entities/project/types';
import { useOutsideClick } from '../hooks/useOutsideClick';

interface ProjectMenuProps {
  projects: Project[];
  activeProjectId: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => void;
}

export default function ProjectMenu({
  projects,
  activeProjectId,
  open,
  onToggle,
  onClose,
  onSelectProject,
  onAddProject,
}: ProjectMenuProps) {
  const [addingProject, setAddingProject] = useState(false);
  const [newName, setNewName] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const activeProject = projects.find(project => project.id === activeProjectId);

  const closeMenu = () => {
    setAddingProject(false);
    onClose();
  };

  useOutsideClick(open, [panelRef, buttonRef], closeMenu);

  const handleAddProject = () => {
    const name = newName.trim();
    if (!name) return;

    onAddProject(name);
    setNewName('');
    setAddingProject(false);
    onClose();
  };

  const handleSelectProject = (id: string) => {
    onSelectProject(id);
    onClose();
  };

  return (
    <div className="relative ml-3">
      <button
        ref={buttonRef}
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
        style={{ backgroundColor: open ? 'var(--color-accent-soft)' : 'transparent' }}
        onMouseEnter={e => {
          if (!open) e.currentTarget.style.backgroundColor = 'var(--color-chrome-hover)';
        }}
        onMouseLeave={e => {
          if (!open) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        {activeProject && (
          <>
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: activeProject.color,
                boxShadow: open ? `0 0 8px ${activeProject.color}` : 'none',
              }}
            />

            <span
              className="text-sm font-medium max-w-48 truncate"
              style={{ color: 'var(--color-chrome-text-strong)' }}
            >
              {activeProject.name}
            </span>
          </>
        )}

        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path
            d={open ? 'M1 5l4-4 4 4' : 'M1 1l4 4 4-4'}
            stroke="var(--color-chrome-text-dim)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute top-[calc(100%+8px)] left-0 w-64 rounded-2xl shadow-2xl overflow-hidden"
          style={{
            backgroundColor: 'var(--color-chrome-bg-alt)',
            border: '1px solid var(--color-chrome-border-soft)',
            animation: 'slide-up 0.15s ease forwards',
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--color-chrome-border-soft)' }}
          >
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: 'var(--color-chrome-text-faint)' }}
            >
              Projects
            </span>

            <button
              onClick={() => setAddingProject(value => !value)}
              className="w-6 h-6 flex items-center justify-center rounded-md"
              style={{ color: 'var(--color-chrome-text-faint)' }}
              title="Add project"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
          </div>

          {addingProject && (
            <div
              className="px-3 py-2.5"
              style={{ borderBottom: '1px solid var(--color-chrome-border-soft)' }}
            >
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddProject();

                  if (e.key === 'Escape') {
                    setAddingProject(false);
                    setNewName('');
                  }
                }}
                placeholder="Project name…"
                className="w-full text-sm px-3 py-2 rounded-xl outline-none"
                style={{
                  backgroundColor: 'var(--color-chrome-panel)',
                  color: 'var(--color-chrome-text)',
                  border: '1px solid rgba(124, 58, 237, 0.4)',
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
                  onClick={() => handleSelectProject(project.id)}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors"
                  style={{ backgroundColor: active ? 'var(--color-chrome-panel)' : 'transparent' }}
                  onMouseEnter={e => {
                    if (!active) e.currentTarget.style.backgroundColor = 'var(--color-chrome-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!active) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: project.color,
                      boxShadow: active ? `0 0 6px ${project.color}` : 'none',
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
                    style={{ color: 'var(--color-chrome-text-faint)' }}
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
  );
}