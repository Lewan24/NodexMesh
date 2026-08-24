import { useState, useCallback, useRef, useEffect } from 'react';
import type { Project, BoardItem, ToolType, FrameItem, NoteItem, KanbanItem, ImageItem, ColumnItem } from './types';
import { seedProjectsFor, createDefaultProjectFor } from './data';
import { useAuth } from './auth/AuthContext';
import LoginPage from './LoginPage';
import Sidebar from './Sidebar';
import Canvas from './Canvas';

const uid = () => Math.random().toString(36).slice(2, 10);
const COLORS = ['#7C3AED', '#FFBD65', '#02A0A0', '#FF6B8A', '#059669'];
const randomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)] ?? COLORS[0]!;

function approxSize(item: BoardItem): { w: number; h: number } {
  switch (item.type) {
    case 'note':      return { w: (item as NoteItem).width ?? 220, h: 170 };
    case 'kanban':    return { w: (item as KanbanItem).columns.length * 184 + 24, h: 340 };
    case 'image':     return { w: (item as ImageItem).width ?? 260, h: ((item as ImageItem).imgHeight ?? 178) + 56 };
    case 'link':      return { w: 240, h: 150 };
    case 'text':      return { w: 200, h: 60 };
    case 'checklist': return { w: 230, h: 200 };
    case 'column':    return { w: (item as ColumnItem).width ?? 320, h: 260 };
    default:          return { w: 200, h: 150 };
  }
}

const projectsKey = (userId: string) => `nodexmesh_projects_${userId}`;

function loadProjectsFor(userId: string): Project[] {
  try {
    const raw = localStorage.getItem(projectsKey(userId));
    if (raw) {
      const parsed = JSON.parse(raw) as Project[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  return seedProjectsFor(userId);
}

export default function App() {
  const { currentUser } = useAuth();

  if (!currentUser) return <LoginPage />;

  return <Board key={currentUser.id} userId={currentUser.id} />;
}

// Split out so the `key={currentUser.id}` above gives every user a fully
// fresh board state (and localStorage) the moment they sign in.
function Board({ userId }: { userId: string }) {
  const [projects, setProjects] = useState<Project[]>(() => loadProjectsFor(userId));
  // NB: reuse `projects` (not another loadProjectsFor call) — for a
  // brand-new user, seeding twice would create two different random
  // default projects and this id wouldn't match what's in `projects`.
  const [activeProjectId, setActiveProjectId] = useState<string>(() => projects[0]!.id);
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const maxZRef = useRef(30);

  // Persist this user's projects whenever they change.
  useEffect(() => {
    localStorage.setItem(projectsKey(userId), JSON.stringify(projects));
  }, [projects, userId]);

  const activeProject = projects.find(p => p.id === activeProjectId) ?? projects[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '0') { e.preventDefault(); setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const updateItems = useCallback((fn: (items: BoardItem[]) => BoardItem[]) => {
    setProjects(prev => prev.map(p =>
      p.id === activeProjectId ? { ...p, items: fn(p.items) } : p
    ));
  }, [activeProjectId]);

  const addItem = useCallback((item: BoardItem) => {
    maxZRef.current += 1;
    updateItems(items => [...items, { ...item, zIndex: item.type === 'frame' ? 0 : maxZRef.current }]);
  }, [updateItems]);

  const updateItem = useCallback((id: string, fn: (item: BoardItem) => BoardItem) => {
    updateItems(items => items.map(item => item.id === id ? fn(item) : item));
  }, [updateItems]);

  const deleteItem = useCallback((id: string) => {
    updateItems(items => items.filter(item => item.id !== id));
  }, [updateItems]);

  const deleteItems = useCallback((ids: string[]) => {
    updateItems(items => items.filter(item => !ids.includes(item.id)));
  }, [updateItems]);

  const bringToFront = useCallback((id: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      const target = p.items.find(i => i.id === id);
      if (!target || target.type === 'frame') return p;
      maxZRef.current += 1;
      const z = maxZRef.current;
      return { ...p, items: p.items.map(i => i.id === id ? { ...i, zIndex: z } : i) };
    }));
  }, [activeProjectId]);

  const addProject = useCallback((name: string) => {
    const id = 'proj-' + uid();
    setProjects(prev => [...prev, { id, name, color: randomColor(), items: [], ownerId: userId }]);
    setActiveProjectId(id);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [userId]);

  const handleSelectProject = useCallback((id: string) => {
    setActiveProjectId(id);
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setSelectedTool('select');
    setSelectedIds([]);
  }, []);

  const handleDropOnColumn = useCallback((itemId: string, columnId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      const droppedItem = p.items.find(i => i.id === itemId);
      if (!droppedItem) return p;
      return {
        ...p,
        items: p.items
          .filter(i => i.id !== itemId)
          .map(i => i.id !== columnId ? i : {
            ...i,
            items: [...(i as ColumnItem).items, { ...droppedItem, x: 0, y: 0, zIndex: 1 }],
          } as BoardItem),
      };
    }));
  }, [activeProjectId]);

  const handleEjectFromColumn = useCallback((columnId: string, ejectedItem: BoardItem) => {
    setProjects(prev => prev.map(p => {
      if (p.id !== activeProjectId) return p;
      const col = p.items.find(i => i.id === columnId) as ColumnItem | undefined;
      if (!col) return p;
      maxZRef.current += 1;
      const newItem: BoardItem = {
        ...ejectedItem,
        id: uid(),
        x: col.x + col.width + 24,
        y: col.y + 40,
        zIndex: maxZRef.current,
      };
      return {
        ...p,
        items: [
          ...p.items
            .filter(i => i.id !== columnId)
            .concat({ ...col, items: col.items.filter(i => i.id !== ejectedItem.id) } as BoardItem),
          newItem,
        ],
      };
    }));
  }, [activeProjectId]);

  const handleGroupSelected = useCallback(() => {
    if (selectedIds.length < 2 || !activeProject) return;
    const items = activeProject.items.filter(i => selectedIds.includes(i.id));
    const PAD = 32;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    items.forEach(i => {
      const s = approxSize(i);
      minX = Math.min(minX, i.x);
      minY = Math.min(minY, i.y);
      maxX = Math.max(maxX, i.x + s.w);
      maxY = Math.max(maxY, i.y + s.h);
    });
    const frameItem: FrameItem = {
      id: uid(), type: 'frame', x: minX - PAD, y: minY - PAD, zIndex: 0,
      title: 'Group', width: (maxX - minX) + PAD * 2, height: (maxY - minY) + PAD * 2,
      color: '#7C3AED',
    };
    addItem(frameItem);
    setSelectedIds([]);
  }, [selectedIds, activeProject, addItem]);

  // Should be unreachable (every user always has >=1 project — see
  // createDefaultProjectFor/seedProjectsFor) but keeps render type-safe.
  if (!activeProject) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ backgroundColor: 'var(--color-app-bg)' }}>
        <button
          className="btn-accent text-sm font-semibold rounded-xl px-4 py-2.5"
          onClick={() => setProjects([createDefaultProjectFor(userId)])}
        >
          Create your first board
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden relative" style={{ backgroundColor: 'var(--color-app-bg)' }}>
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        selectedTool={selectedTool}
        onSelectProject={handleSelectProject}
        onSelectTool={t => { setSelectedTool(t); setSelectedIds([]); }}
        onAddProject={addProject}
      />
      <Canvas
        key={activeProjectId}
        project={activeProject}
        selectedTool={selectedTool}
        pan={pan}
        zoom={zoom}
        selectedIds={selectedIds}
        onPanChange={setPan}
        onZoomChange={setZoom}
        onSelectTool={setSelectedTool}
        onSelectItems={setSelectedIds}
        onGroupSelected={handleGroupSelected}
        onAddItem={addItem}
        onUpdateItem={updateItem}
        onDeleteItem={deleteItem}
        onDeleteItems={deleteItems}
        onBringToFront={bringToFront}
        onDropOnColumn={handleDropOnColumn}
        onEjectFromColumn={handleEjectFromColumn}
      />
    </div>
  );
}
