import { locale, translate, displayLabel } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useRef, useState } from 'react';
import { ChevronDown, Plus, Pencil, Trash2, RotateCcw, Check, X, Folder, Star } from 'lucide-react';
import type { Project } from '@/entities/project/types';
import { useOutsideClick } from '../hooks/useOutsideClick';
import './projectMenu.css';

interface ProjectMenuProps {
  projects: Project[];
  activeProjectId: string;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string) => void;
  onRenameProject: (id: string, name: string, color: string) => void;
  onTrashProject: (id: string) => void;
  onEmptyTrash: () => Promise<void>;
  onPurgeProject: (id: string) => Promise<void>;
  defaultProjectId: string;
  onSetDefaultProject: (id: string) => Promise<void>;
  onRestoreProject: (id: string) => void;
}
export default function ProjectMenu(props: ProjectMenuProps) {
  useTranslation();
  const { projects, activeProjectId, open, onToggle, onClose } = props;
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : translate('Operation failed.'));
    } finally {
      setBusy(false);
    }
  };
  const [trash, setTrash] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState('#7C3AED');
  const [message, setMessage] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => {
    setEditing(null);
    onClose();
  };
  useOutsideClick(open, [panelRef, buttonRef], close);
  const active = projects.find((project) => project.id === activeProjectId);
  const visible = projects.filter((project) => Boolean(project.deletedAt) === trash);
  const save = () => {
    if (!name.trim()) return;
    if (editing === 'new') props.onAddProject(name.trim());
    else if (editing) props.onRenameProject(editing, name.trim(), color);
    setEditing(null);
  };
  return (
    <div className="relative ml-3">
      <button ref={buttonRef} onClick={onToggle} aria-expanded={open} className="project-trigger">
        <Folder size={16} style={{ color: active?.color }} />
        <span className="truncate max-w-48">{active?.name ?? translate('Projects')}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          ref={panelRef}
          className="project-panel"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              editing ? setEditing(null) : close();
            }
          }}
        >
          <div className="flex items-center gap-2 p-3 border-b border-white/10">
            <button
              className="project-tab"
              aria-pressed={!trash}
              onClick={() => {
                setTrash(false);
                setEditing(null);
              }}
            >
              {translate('Projects')}
            </button>
            <button
              className="project-tab"
              aria-pressed={trash}
              onClick={() => {
                setTrash(true);
                setEditing(null);
              }}
            >
              {translate('Trash ·') + ' '}
              {projects.filter((p) => p.deletedAt).length}
            </button>
            <button
              title={translate('Add project')}
              aria-label={translate('Add project')}
              className="project-action ml-auto"
              onClick={() => {
                setTrash(false);
                setEditing('new');
                setName('');
              }}
            >
              <Plus size={18} />
            </button>
          </div>
          {editing && (
            <form
              className="flex gap-2 p-3"
              onSubmit={(event) => {
                event.preventDefault();
                save();
              }}
            >
              <input
                autoFocus
                aria-label={translate('Project name')}
                placeholder={translate('Project name')}
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400"
              />
              {editing !== 'new' && (
                <input
                  type="color"
                  aria-label={translate('Project color')}
                  title={translate('Project color')}
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-9 w-10 shrink-0 cursor-pointer rounded-lg bg-white/10 p-1"
                />
              )}
              <button className="project-action" aria-label={translate('Save project name')} disabled={!name.trim()}>
                <Check size={17} />
              </button>
              <button
                type="button"
                className="project-action"
                aria-label={translate('Cancel rename')}
                onClick={() => setEditing(null)}
              >
                <X size={17} />
              </button>
            </form>
          )}
          <div className="max-h-80 overflow-y-auto p-2">
            {visible.map((project) => (
              <div key={project.id} className="project-row" data-active={project.id === activeProjectId}>
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left p-2"
                  disabled={trash}
                  onClick={() => {
                    props.onSelectProject(project.id);
                    close();
                  }}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: project.color }} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{project.name}</span>
                    <span className="block text-xs opacity-60">
                      {translate('itemCount', {
                        count:
                          project.itemCount ??
                          project.boards?.reduce((count, board) => count + board.items.length, 0) ??
                          project.items.length,
                      })}{' '}
                      {project.role && project.role !== 'Owner'
                        ? translate(' / Shared / {{value1}}', { value1: displayLabel(project.role) })
                        : ''}
                      {project.deletedAt
                        ? translate(' · Deleted {{value1}}', {
                            value1: new Date(project.deletedAt).toLocaleDateString(locale()),
                          })
                        : ''}
                    </span>
                  </span>
                </button>
                {trash ? (
                  <>
                    <button
                      className="project-action"
                      aria-label={translate('Restore {{value1}}', { value1: project.name })}
                      title={translate('Restore project')}
                      onClick={() => {
                        props.onRestoreProject(project.id);
                        setMessage(translate('{{value1}} restored', { value1: project.name }));
                        setTrash(false);
                      }}
                    >
                      <RotateCcw size={16} />
                    </button>
                    <button
                      className="project-action"
                      disabled={busy || (!!project.role && project.role !== 'Owner')}
                      aria-label={translate('Delete {{value1}}', { value1: project.name })}
                      title={translate('Delete project')}
                      onClick={() => {
                        if (
                          window.confirm(
                            translate(
                              'Delete “{{value1}}”? You cannot restore it yourself. Administrators can recover it for 30 days.',
                              { value1: project.name },
                            ),
                          )
                        )
                          void run(
                            () => props.onPurgeProject(project.id),
                            translate('{{value1}} deleted.', { value1: project.name }),
                          );
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="project-action"
                      disabled={busy}
                      aria-label={`${props.defaultProjectId === project.id ? translate('Clear default project') : translate('Set as default project')}: ${project.name}`}
                      title={
                        props.defaultProjectId === project.id
                          ? translate('Default project — click to clear')
                          : translate('Open this project after login')
                      }
                      aria-pressed={props.defaultProjectId === project.id}
                      onClick={() =>
                        void run(
                          () => props.onSetDefaultProject(props.defaultProjectId === project.id ? '' : project.id),
                          translate('Default project updated.'),
                        )
                      }
                    >
                      <Star size={15} fill={props.defaultProjectId === project.id ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      className="project-action"
                      disabled={project.role === 'Viewer' || project.role === 'Commenter'}
                      aria-label={translate('Rename {{value1}}', { value1: project.name })}
                      title={translate('Rename project')}
                      onClick={() => {
                        setEditing(project.id);
                        setName(project.name);
                        setColor(project.color);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="project-action"
                      disabled={!!project.role && project.role !== 'Owner'}
                      aria-label={translate('Move {{value1}} to trash', { value1: project.name })}
                      title={translate('Move to trash')}
                      onClick={() => {
                        props.onTrashProject(project.id);
                        setMessage(
                          translate('{{value1}} moved to trash. You can restore it in the Trash tab.', {
                            value1: project.name,
                          }),
                        );
                        setEditing(null);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {!visible.length && (
              <p className="py-8 text-center text-sm opacity-65">
                {trash
                  ? translate('Your project trash is empty.')
                  : translate('No projects yet. Create your first board.')}
              </p>
            )}
          </div>
          {trash && visible.length > 0 && (
            <button
              className="project-tab m-3 text-rose-400"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    translate(
                      'Delete all {{value1}} projects in Trash? You cannot restore it yourself. Administrators can recover it for 30 days.',
                      { value1: visible.length },
                    ),
                  )
                ) {
                  void run(props.onEmptyTrash, translate('Trash emptied.'));
                }
              }}
            >
              {translate('Empty trash')}
            </button>
          )}
          <p className="px-4 pb-3 text-xs opacity-65" role="status">
            {message ||
              (trash
                ? translate('Deleted projects can be recovered by administrators for 30 days.')
                : translate('All changes are saved automatically.'))}
          </p>
        </div>
      )}
    </div>
  );
}
