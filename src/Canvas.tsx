import { useRef, useCallback, useState, useEffect } from 'react';
import type {
  Project, BoardItem, ToolType,
  NoteItem, KanbanItem, ImageItem, LinkItem, TextItem,
  FrameItem, ChecklistItem, LineItem, ColumnItem,
} from './types';
import BlockRenderer from './blocks/BlockRenderer';
import EditBar from './EditBar';

const uid = () => Math.random().toString(36).slice(2, 10);

const DROPPABLE_ON_COLUMN = new Set(['note', 'text', 'image', 'link', 'checklist']);
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3;
const DOT = 28;

// Wraps each board item, watches its size, calls onResize so frames can auto-expand
function ItemWatcher({ itemId, onResize, children }: { itemId: string; onResize: (id: string, w: number, h: number) => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      const e = entries[0];
      if (e) onResize(itemId, e.contentRect.width, e.contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [itemId, onResize]);
  return <div ref={ref}>{children}</div>;
}

function approxSize(item: BoardItem): { w: number; h: number } {
  switch (item.type) {
    case 'note':      return { w: (item as NoteItem).width ?? 220, h: 170 };
    case 'kanban':    return { w: (item as KanbanItem).columns.length * 184 + 24, h: 340 };
    case 'image':     return { w: (item as ImageItem).width ?? 260, h: ((item as ImageItem).imgHeight ?? 178) + 56 };
    case 'link':      return { w: 240, h: 150 };
    case 'text':      return { w: 200, h: 60 };
    case 'checklist': return { w: 230, h: 200 };
    case 'column':    return { w: (item as ColumnItem).width ?? 280, h: 260 };
    default:          return { w: 200, h: 150 };
  }
}

function createItem(type: ToolType, x: number, y: number, extra?: Record<string, unknown>): BoardItem | null {
  const base = { id: uid(), x, y, zIndex: 1 };
  switch (type) {
    case 'note':      return { ...base, type: 'note', content: '', color: '#0d2a35', width: 220 } as NoteItem;
    case 'kanban':    return {
      ...base, type: 'kanban', title: 'New Board',
      columns: [
        { id: uid(), title: 'To Do', color: '#5a8a94', cards: [] },
        { id: uid(), title: 'In Progress', color: '#FFBD65', cards: [] },
        { id: uid(), title: 'Done', color: '#7C3AED', cards: [] },
      ],
    } as KanbanItem;
    case 'image':     return { ...base, type: 'image', url: '', caption: '', width: 260, imgHeight: 178 } as ImageItem;
    case 'link':      return { ...base, type: 'link', url: '', title: 'New Link', description: '' } as LinkItem;
    case 'text':      return { ...base, type: 'text', content: 'Heading', size: 'lg' } as TextItem;
    case 'frame':     return {
      ...base, type: 'frame', title: 'Group',
      width: (extra?.width as number) ?? 360,
      height: (extra?.height as number) ?? 260,
      color: '#7C3AED',
    } as FrameItem;
    case 'checklist': return { ...base, type: 'checklist', title: 'Checklist', color: '#0d2a35', entries: [] } as unknown as ChecklistItem;
    case 'line':      return {
      ...base, type: 'line',
      x2: x + 180, y2: y,
      arrowStart: false, arrowEnd: true,
      color: '#7C3AED', strokeWidth: 2,
    } as LineItem;
    case 'column':    return {
      ...base, type: 'column', title: 'Column', color: '#f0f9ff', width: 320, items: [],
    } as ColumnItem;
    default: return null;
  }
}

interface Props {
  project: Project;
  selectedTool: ToolType;
  pan: { x: number; y: number };
  zoom: number;
  selectedIds: string[];
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectItems: (ids: string[]) => void;
  onGroupSelected: () => void;
  onAddItem: (item: BoardItem) => void;
  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
  onDeleteItem: (id: string) => void;
  onDeleteItems: (ids: string[]) => void;
  onBringToFront: (id: string) => void;
  onDropOnColumn: (itemId: string, columnId: string) => void;
  onEjectFromColumn: (columnId: string, ejectedItem: BoardItem) => void;
}

export default function Canvas({
  project, selectedTool, pan, zoom, selectedIds,
  onPanChange, onZoomChange, onSelectTool,
  onSelectItems, onGroupSelected,
  onAddItem, onUpdateItem, onDeleteItem, onDeleteItems, onBringToFront,
  onDropOnColumn, onEjectFromColumn,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameDraft, setFrameDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [lasso, setLasso] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const dragOverColumnIdRef = useRef<string | null>(null);
  const [selectedColumnItem, setSelectedColumnItem] = useState<{ columnId: string; item: BoardItem } | null>(null);

  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const projectRef = useRef(project);
  projectRef.current = project;
  const selectedIdsRef = useRef(selectedIds ?? []);
  selectedIdsRef.current = selectedIds ?? [];

  // Frame auto-expand when item grows
  const handleItemResize = useCallback((itemId: string, w: number, h: number) => {
    const items = projectRef.current.items;
    const changedItem = items.find(i => i.id === itemId);
    if (!changedItem) return;
    items.forEach(frame => {
      if (frame.type !== 'frame') return;
      const f = frame as FrameItem;
      if (changedItem.x < f.x || changedItem.y < f.y) return;
      if (changedItem.x > f.x + f.width || changedItem.y > f.y + f.height) return;
      const PAD = 24;
      const neededW = changedItem.x + w - f.x + PAD;
      const neededH = changedItem.y + h - f.y + PAD;
      if (neededW > f.width || neededH > f.height) {
        onUpdateItem(f.id, fi => ({
          ...fi,
          width: Math.max((fi as FrameItem).width, neededW),
          height: Math.max((fi as FrameItem).height, neededH),
        }));
      }
    });
  }, [onUpdateItem]);

  // Scroll → zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const curZoom = zoomRef.current;
      const curPan = panRef.current;
      const factor = e.ctrlKey || e.metaKey
        ? 1 - e.deltaY * 0.008
        : e.deltaY > 0 ? 0.92 : 1 / 0.92;
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat((curZoom * factor).toFixed(4))));
      onPanChange({ x: mx - (mx - curPan.x) * (newZoom / curZoom), y: my - (my - curPan.y) * (newZoom / curZoom) });
      onZoomChange(newZoom);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [onPanChange, onZoomChange]);

  // Escape → deselect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onSelectItems([]); onSelectTool('select'); setSelectedColumnItem(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        if (selectedIdsRef.current.length > 0) {
          onDeleteItems(selectedIdsRef.current);
          onSelectItems([]);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelectItems, onSelectTool, onDeleteItems]);

  const selectedColumnItemRef = useRef(selectedColumnItem);
  selectedColumnItemRef.current = selectedColumnItem;

  const handleUpdateColumnItem = useCallback((columnId: string, fn: (item: BoardItem) => BoardItem) => {
    const cur = selectedColumnItemRef.current;
    if (!cur || cur.columnId !== columnId) return;
    const itemId = cur.item.id;
    setSelectedColumnItem(prev => prev ? { ...prev, item: fn(prev.item) } : null);
    onUpdateItem(columnId, col => ({
      ...col,
      items: (col as ColumnItem).items.map(i => i.id === itemId ? fn(i) : i),
    }));
  }, [onUpdateItem]);

  const screenToCanvas = useCallback((sx: number, sy: number) => ({
    x: (sx - pan.x) / zoom,
    y: (sy - pan.y) / zoom,
  }), [pan, zoom]);

  // ─── Fit frame to its contents ────────────────────────────────────────────
  const handleFitFrame = useCallback((frameId: string) => {
    const frame = project.items.find(i => i.id === frameId) as FrameItem | undefined;
    if (!frame) return;
    const PAD = 36;
    const inside = project.items.filter(i =>
      i.id !== frameId && i.type !== 'frame' &&
      i.x >= frame.x && i.y >= frame.y &&
      i.x <= frame.x + frame.width && i.y <= frame.y + frame.height
    );
    if (inside.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    inside.forEach(i => {
      const s = approxSize(i);
      minX = Math.min(minX, i.x);
      minY = Math.min(minY, i.y);
      maxX = Math.max(maxX, i.x + s.w);
      maxY = Math.max(maxY, i.y + s.h);
    });
    onUpdateItem(frameId, item => ({
      ...item, x: minX - PAD, y: minY - PAD,
      width: (maxX - minX) + PAD * 2,
      height: (maxY - minY) + PAD * 2,
    }));
  }, [project.items, onUpdateItem]);

  // ─── Item mouse down: select + drag ───────────────────────────────────────
  const handleItemMouseDown = useCallback((id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as Element;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

    e.preventDefault();
    e.stopPropagation();
    setSelectedColumnItem(null);

    const curSelected = selectedIdsRef.current;
    const isSelected = curSelected.includes(id);

    let newSelected: string[];
    if (e.shiftKey) {
      newSelected = isSelected ? curSelected.filter(x => x !== id) : [...curSelected, id];
    } else if (!isSelected) {
      newSelected = [id];
    } else {
      newSelected = curSelected;
    }
    onSelectItems(newSelected);

    const dragIds = newSelected.includes(id) ? newSelected : [id];
    const items = projectRef.current.items;

    // Capture initial positions (deduped via Map)
    const capMap = new Map<string, { ox: number; oy: number; isLine: boolean; ox2?: number; oy2?: number }>();
    dragIds.forEach(did => {
      const item = items.find(i => i.id === did);
      if (!item) return;
      const isLine = item.type === 'line';
      capMap.set(did, {
        ox: item.x, oy: item.y, isLine,
        ox2: isLine ? (item as LineItem).x2 : undefined,
        oy2: isLine ? (item as LineItem).y2 : undefined,
      });
      if (item.type === 'frame') {
        const f = item as FrameItem;
        items.filter(i => !dragIds.includes(i.id) && !capMap.has(i.id) && i.type !== 'frame' &&
          i.x >= f.x && i.y >= f.y && i.x <= f.x + f.width && i.y <= f.y + f.height)
          .forEach(i => capMap.set(i.id, { ox: i.x, oy: i.y, isLine: false }));
      }
    });

    dragIds.forEach(did => onBringToFront(did));

    const startX = e.clientX;
    const startY = e.clientY;
    const curZoom = zoomRef.current;
    let hasMoved = false;

    // Check if single non-column droppable item is being dragged (for drop-on-column)
    const singleDragId = dragIds.length === 1 ? dragIds[0] : null;
    const singleDragItem = singleDragId ? items.find(i => i.id === singleDragId) : null;
    const canDropOnColumn = singleDragItem ? DROPPABLE_ON_COLUMN.has(singleDragItem.type) : false;

    const setColHover = (colId: string | null) => {
      dragOverColumnIdRef.current = colId;
      setDragOverColumnId(colId);
    };

    const handleMove = (ev: MouseEvent) => {
      hasMoved = true;
      const dx = (ev.clientX - startX) / curZoom;
      const dy = (ev.clientY - startY) / curZoom;
      capMap.forEach((cap, cid) => {
        onUpdateItem(cid, item => ({
          ...item, x: cap.ox + dx, y: cap.oy + dy,
          ...(cap.isLine ? { x2: cap.ox2! + dx, y2: cap.oy2! + dy } : {}),
        }));
      });

      // Highlight column being hovered
      if (canDropOnColumn && singleDragItem) {
        const primaryCap = capMap.get(singleDragId!);
        if (primaryCap) {
          const nx = primaryCap.ox + dx;
          const ny = primaryCap.oy + dy;
          const hovered = projectRef.current.items.find(i =>
            i.type === 'column' && !dragIds.includes(i.id) &&
            nx >= i.x - 20 && ny >= i.y - 20 &&
            nx <= i.x + (i as ColumnItem).width + 20 &&
            ny <= i.y + 500
          );
          setColHover(hovered?.id ?? null);
        }
      }
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      // Handle drop on column
      const colId = dragOverColumnIdRef.current;
      if (hasMoved && colId && singleDragItem && canDropOnColumn) {
        onDropOnColumn(singleDragItem.id, colId);
        onSelectItems([]);
        setColHover(null);
        return;
      }
      setColHover(null);

      if (!hasMoved && !e.shiftKey && dragIds.length > 1) {
        onSelectItems([id]);
      }
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [onSelectItems, onBringToFront, onUpdateItem, onDropOnColumn]);

  // ─── Canvas background mouse down ─────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as Element;
    if (target.closest('[data-board-item]')) return;

    const rect = containerRef.current!.getBoundingClientRect();

    // Middle mouse = pan
    if (e.button === 1) {
      e.preventDefault();
      const startX = e.clientX;
      const startY = e.clientY;
      const startPan = { ...panRef.current };
      const handleMove = (ev: MouseEvent) => {
        onPanChange({ x: startPan.x + ev.clientX - startX, y: startPan.y + ev.clientY - startY });
      };
      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      return;
    }

    if (e.button !== 0) return;
    e.preventDefault();

    const startSX = e.clientX - rect.left;
    const startSY = e.clientY - rect.top;
    const startCanvas = screenToCanvas(startSX, startSY);
    const panAtDown = { ...pan };

    // Frame drag-create
    if (selectedTool === 'frame') {
      const handleMove = (ev: MouseEvent) => {
        const cur = screenToCanvas(ev.clientX - rect.left, ev.clientY - rect.top);
        setFrameDraft({
          x: Math.min(startCanvas.x, cur.x), y: Math.min(startCanvas.y, cur.y),
          w: Math.abs(cur.x - startCanvas.x), h: Math.abs(cur.y - startCanvas.y),
        });
      };
      const handleUp = (ev: MouseEvent) => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        setFrameDraft(null);
        const cur = screenToCanvas(ev.clientX - rect.left, ev.clientY - rect.top);
        const w = Math.abs(cur.x - startCanvas.x);
        const h = Math.abs(cur.y - startCanvas.y);
        const item = w > 40 && h > 40
          ? createItem('frame', Math.min(startCanvas.x, cur.x), Math.min(startCanvas.y, cur.y), { width: w, height: h })
          : createItem('frame', startCanvas.x - 80, startCanvas.y - 40);
        if (item) { onAddItem(item); onSelectTool('select'); }
      };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      return;
    }

    // Place item (non-select tool)
    if (selectedTool !== 'select') {
      const handleMove = (_ev: MouseEvent) => {};
      const handleUp = (ev: MouseEvent) => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        const c = screenToCanvas(ev.clientX - rect.left, ev.clientY - rect.top);
        const item = createItem(selectedTool, c.x, c.y);
        if (item) { onAddItem(item); onSelectTool('select'); }
      };
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      return;
    }

    // Select tool: rubber-band or deselect
    if (!e.shiftKey) onSelectItems([]);

    let endCanvas = { ...startCanvas };
    let hasMoved = false;

    const handleMove = (ev: MouseEvent) => {
      hasMoved = true;
      endCanvas = screenToCanvas(ev.clientX - rect.left, ev.clientY - rect.top);
      setLasso({
        x1: Math.min(startCanvas.x, endCanvas.x),
        y1: Math.min(startCanvas.y, endCanvas.y),
        x2: Math.max(startCanvas.x, endCanvas.x),
        y2: Math.max(startCanvas.y, endCanvas.y),
      });
      // Suppress pan during lasso
      void panAtDown;
    };
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      setLasso(null);
      if (hasMoved) {
        const box = {
          x1: Math.min(startCanvas.x, endCanvas.x),
          y1: Math.min(startCanvas.y, endCanvas.y),
          x2: Math.max(startCanvas.x, endCanvas.x),
          y2: Math.max(startCanvas.y, endCanvas.y),
        };
        const inBox = projectRef.current.items
          .filter(i => i.type !== 'frame' && i.x >= box.x1 && i.y >= box.y1 && i.x <= box.x2 && i.y <= box.y2)
          .map(i => i.id);
        onSelectItems(e.shiftKey ? [...selectedIdsRef.current, ...inBox.filter(x => !selectedIdsRef.current.includes(x))] : inBox);
      }
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [selectedTool, pan, screenToCanvas, onPanChange, onAddItem, onSelectTool, onSelectItems]);

  // ─── Frame resize ────────────────────────────────────────────────────────
  const handleFrameResize = useCallback((id: string, e: React.MouseEvent, startW: number, startH: number) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startY = e.clientY;
    const curZoom = zoomRef.current;
    const handleMove = (ev: MouseEvent) => {
      onUpdateItem(id, item => ({
        ...item,
        width: Math.max(120, startW + (ev.clientX - startX) / curZoom),
        height: Math.max(80, startH + (ev.clientY - startY) / curZoom),
      } as BoardItem));
    };
    const handleUp = () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [onUpdateItem]);

  // ─── Block resize (width or width+height) ────────────────────────────────
  const handleBlockResize = useCallback((id: string, e: React.MouseEvent, startW: number, startH: number | null) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startY = e.clientY;
    const curZoom = zoomRef.current;
    const handleMove = (ev: MouseEvent) => {
      onUpdateItem(id, item => ({
        ...item,
        width: Math.max(140, startW + (ev.clientX - startX) / curZoom),
        ...(startH !== null ? { imgHeight: Math.max(80, startH + (ev.clientY - startY) / curZoom) } : {}),
      }));
    };
    const handleUp = () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [onUpdateItem]);

  // ─── Line endpoint drag ───────────────────────────────────────────────────
  const handleLineEndpointDrag = useCallback((id: string, e: React.MouseEvent, endpoint: 1 | 2) => {
    e.preventDefault(); e.stopPropagation();
    const item = project.items.find(i => i.id === id) as LineItem | undefined;
    if (!item) return;
    const startX = e.clientX; const startY = e.clientY;
    const origX = endpoint === 1 ? item.x : item.x2;
    const origY = endpoint === 1 ? item.y : item.y2;
    const curZoom = zoomRef.current;
    const handleMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / curZoom;
      const dy = (ev.clientY - startY) / curZoom;
      onUpdateItem(id, i => ({
        ...i,
        ...(endpoint === 1 ? { x: origX + dx, y: origY + dy } : { x2: origX + dx, y2: origY + dy }),
      }));
    };
    const handleUp = () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [project.items, onUpdateItem]);

  const safeSelectedIds = selectedIds ?? [];
  const selectedItems = project.items.filter(i => safeSelectedIds.includes(i.id));
  const frames = project.items.filter(i => i.type === 'frame');
  const others = project.items.filter(i => i.type !== 'frame').sort((a, b) => a.zIndex - b.zIndex);

  const dotInterval = DOT * zoom;
  const bpx = ((pan.x % dotInterval) + dotInterval) % dotInterval;
  const bpy = ((pan.y % dotInterval) + dotInterval) % dotInterval;
  const cursorStyle = selectedTool !== 'select' ? 'cursor-crosshair' : 'cursor-default';

  return (
    <div
      ref={containerRef}
      className={`flex-1 relative overflow-hidden select-none ${cursorStyle}`}
      style={{
        backgroundColor: 'var(--color-app-bg)',
        backgroundImage: 'radial-gradient(circle, var(--color-canvas-dot) 1.2px, transparent 1.5px)',
        backgroundSize: `${dotInterval}px ${dotInterval}px`,
        backgroundPosition: `${bpx}px ${bpy}px`,
      }}
      onMouseDown={handleCanvasMouseDown}
    >
      {/* Transform layer */}
      <div
        className="absolute"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
      >
        {/* Frames first (behind everything) */}
        {frames.map(item => {
          const sel = safeSelectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              data-board-item="true"
              className="absolute board-item-enter"
              style={{ left: item.x, top: item.y, zIndex: item.zIndex }}
              onMouseDown={ev => handleItemMouseDown(item.id, ev)}
            >
              {sel && (
                <div
                  className="absolute pointer-events-none rounded-2xl"
                  style={{ inset: -4, boxShadow: '0 0 0 2px #7C3AED, 0 0 12px rgba(124, 58, 237,0.25)' }}
                />
              )}
              <BlockRenderer
                item={item} zoom={zoom} isSelected={sel}
                onUpdate={upd => onUpdateItem(item.id, upd)}
                onDelete={() => { onDeleteItem(item.id); onSelectItems(safeSelectedIds.filter(x => x !== item.id)); }}
                onFrameResize={(ev, w, h) => handleFrameResize(item.id, ev, w, h)}
                onFitFrame={() => handleFitFrame(item.id)}
                onBlockResize={() => {}}
                onLineEndpointDrag={() => {}}
              />
            </div>
          );
        })}

        {/* Regular items */}
        {others.map(item => {
          const sel = safeSelectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              data-board-item="true"
              className="absolute board-item-enter"
              style={{ left: item.x, top: item.y, zIndex: item.zIndex, cursor: 'grab' }}
              onMouseDown={ev => handleItemMouseDown(item.id, ev)}
            >
              {sel && (
                <div
                  className="absolute pointer-events-none rounded-2xl"
                  style={{ inset: -4, boxShadow: '0 0 0 2px #7C3AED, 0 0 12px rgba(124, 58, 237,0.25)' }}
                />
              )}
              <ItemWatcher itemId={item.id} onResize={handleItemResize}>
                <BlockRenderer
                  item={item} zoom={zoom} isSelected={sel}
                  isDragOver={dragOverColumnId === item.id}
                  onUpdate={upd => onUpdateItem(item.id, upd)}
                  onDelete={() => { onDeleteItem(item.id); onSelectItems(safeSelectedIds.filter(x => x !== item.id)); }}
                  onFrameResize={() => {}}
                  onFitFrame={() => {}}
                  onBlockResize={(ev, w, h) => handleBlockResize(item.id, ev, w, h)}
                  onLineEndpointDrag={(ev, ep) => handleLineEndpointDrag(item.id, ev, ep)}
                  onEjectItem={item.type === 'column' ? ejected => onEjectFromColumn(item.id, ejected) : undefined}
                  onSelectColumnItem={item.type === 'column'
                    ? (colItem) => {
                        if (colItem) { setSelectedColumnItem({ columnId: item.id, item: colItem }); onSelectItems([]); }
                        else setSelectedColumnItem(null);
                      }
                    : undefined}
                />
              </ItemWatcher>
            </div>
          );
        })}

        {/* Frame draft preview */}
        {frameDraft && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: frameDraft.x, top: frameDraft.y,
              width: frameDraft.w, height: frameDraft.h,
              border: '2px dashed rgba(124, 58, 237,0.7)',
              borderRadius: 12, backgroundColor: 'rgba(124, 58, 237,0.06)',
            }}
          />
        )}

        {/* Lasso selection rect */}
        {lasso && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: lasso.x1, top: lasso.y1,
              width: lasso.x2 - lasso.x1, height: lasso.y2 - lasso.y1,
              border: '1.5px solid rgba(124, 58, 237,0.8)',
              borderRadius: 4, backgroundColor: 'rgba(124, 58, 237,0.07)',
            }}
          />
        )}
      </div>

      {/* Edit Bar — shows for canvas selection OR column item selection */}
      {(safeSelectedIds.length > 0 || selectedColumnItem) && (
        <EditBar
          selectedItems={selectedItems}
          onUpdateItem={onUpdateItem}
          onDeleteItems={ids => { onDeleteItems(ids); onSelectItems([]); }}
          onGroupItems={onGroupSelected}
          onFitFrame={handleFitFrame}
          onClose={() => { onSelectItems([]); setSelectedColumnItem(null); }}
          columnItem={selectedColumnItem?.item}
          onUpdateColumnItem={selectedColumnItem
            ? fn => handleUpdateColumnItem(selectedColumnItem.columnId, fn)
            : undefined}
          onDeleteColumnItem={selectedColumnItem
            ? () => {
                onUpdateItem(selectedColumnItem.columnId, col => ({
                  ...col,
                  items: (col as ColumnItem).items.filter(i => i.id !== selectedColumnItem.item.id),
                }));
                setSelectedColumnItem(null);
              }
            : undefined}
        />
      )}

      {/* Placement hint */}
      {selectedTool !== 'select' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none hint-pulse">
          <div
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm shadow-lg"
            style={{ backgroundColor: 'var(--color-surface-translucent)', border: '1px solid rgba(124, 58, 237,0.3)', color: 'var(--color-accent)', backdropFilter: 'blur(8px)' }}
          >
            {selectedTool === 'frame'
              ? 'Drag to draw a frame — items inside will move with it'
              : `Click to place ${selectedTool}`}
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ESC to cancel</span>
          </div>
        </div>
      )}

      {/* Middle-mouse pan hint */}
      {selectedTool === 'select' && safeSelectedIds.length === 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs shadow-sm opacity-40"
            style={{ backgroundColor: 'var(--color-surface-translucent)', color: 'var(--color-text-secondary)', backdropFilter: 'blur(4px)' }}>
            Middle-click drag to pan · Scroll to zoom
          </div>
        </div>
      )}

      {/* Empty state */}
      {project.items.length === 0 && selectedTool === 'select' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center" style={{ animation: 'fade-in 0.4s ease forwards' }}>
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="7" height="7" rx="1.5" fill="rgba(0,0,0,0.12)" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" fill="rgba(0,0,0,0.08)" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" fill="rgba(0,0,0,0.08)" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" fill="rgba(0,0,0,0.05)" />
              </svg>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Empty board</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Select a tool from the sidebar to get started</p>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-6 right-6 pointer-events-auto">
        <div className="flex items-center rounded-xl overflow-hidden border shadow-md"
          style={{ backgroundColor: 'var(--color-surface-translucent)', borderColor: 'var(--color-border)', backdropFilter: 'blur(8px)' }}>
          <button
            onClick={() => { const nz = Math.max(ZOOM_MIN, parseFloat((zoom - 0.1).toFixed(2))); onZoomChange(nz); }}
            className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
          </button>
          <button
            onClick={() => { onZoomChange(1); onPanChange({ x: 0, y: 0 }); }}
            className="px-2.5 h-8 text-[10px] font-bold font-mono transition-colors border-x"
            style={{ color: '#4a6070', borderColor: 'var(--color-border-soft)', minWidth: 52 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => { const nz = Math.min(ZOOM_MAX, parseFloat((zoom + 0.1).toFixed(2))); onZoomChange(nz); }}
            className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
