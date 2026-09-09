import { useRef, useState } from 'react';
import { ChevronDown, Plus, Pencil, Trash2, RotateCcw, Check, X, Folder } from 'lucide-react';
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
  onRenameProject: (id: string, name: string) => void;
  onTrashProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
}
export default function ProjectMenu(props: ProjectMenuProps) {
  const { projects, activeProjectId, open, onToggle, onClose } = props;
  const [trash, setTrash] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = () => { setEditing(null); onClose(); };
  useOutsideClick(open, [panelRef, buttonRef], close);
  const active = projects.find(project => project.id === activeProjectId);
  const visible = projects.filter(project => Boolean(project.deletedAt) === trash);
  const save = () => {
    if (!name.trim()) return;
    if (editing === 'new') props.onAddProject(name.trim());
    else if (editing) props.onRenameProject(editing, name.trim());
    setEditing(null);
  };
  return <div className="relative ml-3">
    <button ref={buttonRef} onClick={onToggle} aria-expanded={open} className="project-trigger">
      <Folder size={16} style={{ color: active?.color }} /><span className="truncate max-w-48">{active?.name ?? 'Projects'}</span><ChevronDown size={14} />
    </button>
    {open && <div ref={panelRef} className="project-panel" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); editing ? setEditing(null) : close(); }
    }}>
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <button className="project-tab" aria-pressed={!trash} onClick={() => { setTrash(false); setEditing(null); }}>Projects</button>
        <button className="project-tab" aria-pressed={trash} onClick={() => { setTrash(true); setEditing(null); }}>Trash · {projects.filter(p => p.deletedAt).length}</button>
        <button title="Add project" aria-label="Add project" className="project-action ml-auto" onClick={() => { setTrash(false); setEditing('new'); setName(''); }}><Plus size={18} /></button>
      </div>
      {editing && <form className="flex gap-2 p-3" onSubmit={event => { event.preventDefault(); save(); }}>
        <input autoFocus aria-label="Project name" placeholder="Project name" maxLength={120} value={name} onChange={event => setName(event.target.value)} className="min-w-0 flex-1 rounded-lg bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-400" />
        <button className="project-action" aria-label="Save project name" disabled={!name.trim()}><Check size={17} /></button>
        <button type="button" className="project-action" aria-label="Cancel rename" onClick={() => setEditing(null)}><X size={17} /></button>
      </form>}
      <div className="max-h-80 overflow-y-auto p-2">
        {visible.map(project => <div key={project.id} className="project-row" data-active={project.id === activeProjectId}>
          <button className="flex min-w-0 flex-1 items-center gap-3 text-left p-2" disabled={trash} onClick={() => { props.onSelectProject(project.id); close(); }}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: project.color }} />
            <span className="min-w-0"><span className="block truncate font-medium">{project.name}</span><span className="block text-xs opacity-60">{project.items.length} items{project.deletedAt ? ` · Deleted ${new Date(project.deletedAt).toLocaleDateString()}` : ''}</span></span>
          </button>
          {trash ? <button className="project-action" aria-label={`Restore ${project.name}`} title="Restore project" onClick={() => { props.onRestoreProject(project.id); setMessage(`${project.name} restored`); setTrash(false); }}><RotateCcw size={16} /></button> : <>
            <button className="project-action" aria-label={`Rename ${project.name}`} title="Rename project" onClick={() => { setEditing(project.id); setName(project.name); }}><Pencil size={15} /></button>
            <button className="project-action" aria-label={`Move ${project.name} to trash`} title="Move to trash" onClick={() => { props.onTrashProject(project.id); setMessage(`${project.name} moved to trash. You can restore it in the Trash tab.`); setEditing(null); }}><Trash2 size={15} /></button>
          </>}
        </div>)}
        {!visible.length && <p className="py-8 text-center text-sm opacity-65">{trash ? 'Your project trash is empty.' : 'No projects yet. Create your first board.'}</p>}
      </div>
      <p className="px-4 pb-3 text-xs opacity-65" role="status">{message || (trash ? 'Projects stay here until you restore them. No automatic deletion.' : 'All changes are saved automatically.')}</p>
    </div>}
  </div>;
}
