import { useRef, useCallback, useState, useEffect } from 'react';
import type {
  BoardItem, NoteItem, KanbanItem, KanbanCard, ImageItem, LinkItem, TextItem,
  FrameItem, ChecklistItem, ChecklistEntry, LineItem, ColumnItem,
} from '@/entities/board/types';
import type { Project } from '@/entities/project/types';
import type { ToolType } from '@/entities/board/toolTypes';
import BlockRenderer from '@/features/blocks/BlockRenderer';
import EditBar from '@/layout/EditBar';
import ConfirmDialog from '@/shared/components/dialogs/ConfirmDialog';

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
    case 'note':      return { w: (item as NoteItem).width ?? 220, h: (item as NoteItem).height ?? 170 };
    case 'kanban':    return { w: (item as KanbanItem).columns.length * 184 + 24, h: 340 };
    case 'image':     return { w: (item as ImageItem).width ?? 260, h: ((item as ImageItem).imgHeight ?? 178) + 56 };
    case 'link':      return { w: 240, h: 150 };
    case 'text':      return { w: (item as TextItem).width ?? 200, h: 60 };
    case 'checklist': return { w: (item as ChecklistItem).width ?? 230, h: 200 };
    case 'column':    return { w: (item as ColumnItem).width ?? 280, h: 260 };
    case 'frame':     return { w: (item as FrameItem).width, h: (item as FrameItem).height };
    default:          return { w: 200, h: 150 };
  }
}

type SizeMap = Map<string, { w: number; h: number }>;

/** Bounding rect (canvas space) for an item. Prefers the item's actual
 *  measured DOM size (kept fresh via ResizeObserver) over the rough
 *  approxSize guess, since content-driven heights (notes, kanban, etc.)
 *  can differ a lot from the fallback constants — that mismatch is what
 *  made attached line endpoints land in the empty space below a card
 *  instead of right on its edge. */
function itemRect(target: BoardItem, sizes?: SizeMap): { x: number; y: number; w: number; h: number } {
  const s = sizes?.get(target.id) ?? approxSize(target);
  return { x: target.x, y: target.y, w: s.w, h: s.h };
}

/** Center point of an item's bounding rect. */
function itemAnchor(target: BoardItem, sizes?: SizeMap): { x: number; y: number } {
  const r = itemRect(target, sizes);
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Point where the ray from a rectangle's center toward (tx,ty) exits the rectangle's border. */
function rectBorderPoint(rect: { x: number; y: number; w: number; h: number }, tx: number, ty: number): { x: number; y: number } {
  const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
  const dx = tx - cx, dy = ty - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const hw = Math.max(rect.w / 2, 1), hh = Math.max(rect.h / 2, 1);
  const scaleX = dx !== 0 ? hw / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? hh / Math.abs(dy) : Infinity;
  const scale = Math.min(scaleX, scaleY);
  return { x: cx + dx * scale, y: cy + dy * scale };
}

/** Resolves a line's endpoints against whatever item they're attached to: the
 *  point lands right on that item's border (clipped along the line toward the
 *  other end), so the arrow touches the edge instead of floating at the center. */
function resolveLineItem(line: LineItem, items: BoardItem[], sizes?: SizeMap): LineItem {
  const startTarget = line.startItemId ? items.find(i => i.id === line.startItemId) : undefined;
  const endTarget = line.endItemId ? items.find(i => i.id === line.endItemId) : undefined;

  const startRef = startTarget ? itemAnchor(startTarget, sizes) : { x: line.x, y: line.y };
  const endRef = endTarget ? itemAnchor(endTarget, sizes) : { x: line.x2, y: line.y2 };

  let x = line.x, y = line.y, x2 = line.x2, y2 = line.y2;
  if (startTarget) { const p = rectBorderPoint(itemRect(startTarget, sizes), endRef.x, endRef.y); x = p.x; y = p.y; }
  if (endTarget) { const p = rectBorderPoint(itemRect(endTarget, sizes), startRef.x, startRef.y); x2 = p.x; y2 = p.y; }

  return (x === line.x && y === line.y && x2 === line.x2 && y2 === line.y2)
    ? line
    : { ...line, x, y, x2, y2 };
}

function createItem(type: ToolType, x: number, y: number, extra?: Record<string, unknown>): BoardItem | null {
  const base = { id: uid(), x, y, zIndex: 1 };
  switch (type) {
    case 'note':      return { ...base, type: 'note', content: '', color: '#0d2a35', width: 240 } as NoteItem;
    case 'kanban':    return {
      ...base, type: 'kanban', title: 'New Board',
      columns: [
        { id: uid(), title: 'To Do', color: '#5a8a94', cards: [] },
        { id: uid(), title: 'In Progress', color: '#FFBD65', cards: [] },
        { id: uid(), title: 'Done', color: '#7C3AED', cards: [] },
      ],
    } as KanbanItem;
    case 'image':     return { ...base, type: 'image', url: '', caption: '', width: 280, imgHeight: 190 } as ImageItem;
    case 'link':      return { ...base, type: 'link', url: '', title: 'New Link', description: '', width: 260 } as LinkItem;
    case 'text':      return { ...base, type: 'text', content: 'Heading', size: 'lg' } as TextItem;
    case 'frame':     return {
      ...base, type: 'frame', title: 'Group',
      width: (extra?.width as number) ?? 360,
      height: (extra?.height as number) ?? 260,
      color: '#7C3AED',
    } as FrameItem;
    case 'checklist': return { ...base, type: 'checklist', title: 'Checklist', color: '#0d2a35', width: 240, entries: [] } as ChecklistItem;
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
  /** Bulk-replaces the active project's items — used to restore a snapshot on undo. */
  onRestoreItems: (items: BoardItem[]) => void;
}

export default function Canvas({
  project, selectedTool, pan, zoom, selectedIds,
  onPanChange, onZoomChange, onSelectTool,
  onSelectItems, onGroupSelected,
  onAddItem, onUpdateItem, onDeleteItem, onDeleteItems, onBringToFront,
  onDropOnColumn, onEjectFromColumn, onRestoreItems,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [frameDraft, setFrameDraft] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [lasso, setLasso] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const dragOverColumnIdRef = useRef<string | null>(null);
  const [selectedColumnItem, setSelectedColumnItem] = useState<{ columnId: string; item: BoardItem } | null>(null);

  // Entrance "pop" animation — only ever applied to an item right when it's
  // created or clicked, never left on permanently (a permanently-applied
  // animation class replays whenever the browser reorders/reinserts the
  // element in the DOM, e.g. when z-index/order changes on any click).
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set());
  const triggerEnterAnim = useCallback((id: string) => {
    setAnimatingIds(prev => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);
  const clearEnterAnim = useCallback((id: string) => {
    setAnimatingIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // Line endpoint attachment: highlights the item under the cursor while
  // dragging an endpoint, so the person can see what it would attach to.
  const [attachHoverId, setAttachHoverId] = useState<string | null>(null);
  const attachHoverIdRef = useRef<string | null>(null);
  const setAttachHover = (id: string | null) => { attachHoverIdRef.current = id; setAttachHoverId(id); };

  // Undo (Ctrl/Cmd+Z) — a plain snapshot stack of the active project's items.
  // A snapshot is pushed once at the *start* of an interaction (first move of
  // a drag/resize, or right before a discrete action like delete/add), never
  // on every intermediate update, so one Ctrl+Z undoes one whole gesture
  // instead of a single pixel of movement. Reset automatically per project
  // since Canvas is remounted (key={activeProjectId}) when the active
  // project changes.
  const historyRef = useRef<BoardItem[][]>([]);
  const pushHistory = useCallback(() => {
    historyRef.current.push(projectRef.current.items);
    if (historyRef.current.length > 50) historyRef.current.shift();
  }, []);
  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) onRestoreItems(prev);
  }, [onRestoreItems]);

  // Delete confirmation — every deletion (single item, multi-select, a nested
  // column item, or the Delete/Backspace shortcut) routes through this so
  // nothing disappears without the person confirming first.
  const [pendingDelete, setPendingDelete] = useState<{ execute: () => void; count: number } | null>(null);
  const requestDelete = useCallback((execute: () => void, count = 1) => {
    setPendingDelete({ execute, count });
  }, []);
  const confirmDelete = useCallback(() => {
    setPendingDelete(prev => { if (prev) { pushHistory(); prev.execute(); } return null; });
  }, [pushHistory]);
  const cancelDelete = useCallback(() => setPendingDelete(null), []);

  // Snap-to-grid — aligns to the same spacing as the visible dot grid so
  // snapped items line up with what's on screen.
  const [snapEnabled, setSnapEnabled] = useState(true);
  const snapVal = useCallback((v: number) => (snapEnabled ? Math.round(v / DOT) * DOT : v), [snapEnabled]);

  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const projectRef = useRef(project);
  projectRef.current = project;
  const selectedIdsRef = useRef(selectedIds ?? []);
  selectedIdsRef.current = selectedIds ?? [];

  // Real measured DOM sizes for each item, kept fresh via ResizeObserver.
  // Used for line-endpoint attachment so arrows land exactly on an item's
  // edge instead of the rough approxSize guess (which is often off,
  // especially for content-driven heights like notes/kanban/checklists).
  const [measuredSizes, setMeasuredSizes] = useState<SizeMap>(new Map());

  // Frame auto-expand when item grows
  const handleItemResize = useCallback((itemId: string, w: number, h: number) => {
    setMeasuredSizes(prev => {
      const cur = prev.get(itemId);
      if (cur && cur.w === w && cur.h === h) return prev;
      const next = new Map(prev);
      next.set(itemId, { w, h });
      return next;
    });

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

  // Escape → deselect, Delete/Backspace → confirm-delete selection, Ctrl/Cmd+Z → undo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if (e.key === 'Escape') { onSelectItems([]); onSelectTool('select'); setSelectedColumnItem(null); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inField) {
        const ids = selectedIdsRef.current;
        if (ids.length > 0) {
          requestDelete(() => { onDeleteItems(ids); onSelectItems([]); }, ids.length);
        }
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z' && !inField) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelectItems, onSelectTool, onDeleteItems, requestDelete, undo]);

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
    triggerEnterAnim(id);

    onSelectTool("select")

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
      if (!hasMoved) pushHistory();
      hasMoved = true;
      let dx = (ev.clientX - startX) / curZoom;
      let dy = (ev.clientY - startY) / curZoom;
      if (snapEnabled) {
        const primaryCap = capMap.get(id);
        if (primaryCap) {
          const rawX = primaryCap.ox + dx;
          const rawY = primaryCap.oy + dy;
          dx += snapVal(rawX) - rawX;
          dy += snapVal(rawY) - rawY;
        }
      }
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
  }, [onSelectItems, onBringToFront, onUpdateItem, onDropOnColumn, triggerEnterAnim, snapEnabled, snapVal, pushHistory]);

  // ─── Canvas background mouse down ─────────────────────────────────────────
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    // Middle mouse is reserved exclusively for panning — always, regardless
    // of what's underneath the cursor (including board items), and it does
    // nothing else (no select, no drag, no placement).
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

    const target = e.target as Element;
    if (target.closest('[data-board-item]')) return;

    const rect = containerRef.current!.getBoundingClientRect();
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
          ? createItem('frame', snapVal(Math.min(startCanvas.x, cur.x)), snapVal(Math.min(startCanvas.y, cur.y)), { width: w, height: h })
          : createItem('frame', snapVal(startCanvas.x - 80), snapVal(startCanvas.y - 40));
        if (item) { pushHistory(); onAddItem(item); triggerEnterAnim(item.id); onSelectTool('select'); }
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
        const item = createItem(selectedTool, snapVal(c.x), snapVal(c.y));
        if (item) { pushHistory(); onAddItem(item); triggerEnterAnim(item.id); onSelectTool('select'); }
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
  }, [selectedTool, pan, screenToCanvas, onPanChange, onAddItem, onSelectTool, onSelectItems, triggerEnterAnim, snapVal, pushHistory]);

  // ─── Frame resize ────────────────────────────────────────────────────────
  const handleFrameResize = useCallback((id: string, e: React.MouseEvent, startW: number, startH: number) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startY = e.clientY;
    const curZoom = zoomRef.current;
    let moved = false;
    const handleMove = (ev: MouseEvent) => {
      if (!moved) { pushHistory(); moved = true; }
      onUpdateItem(id, item => ({
        ...item,
        width: Math.max(120, snapVal(startW + (ev.clientX - startX) / curZoom)),
        height: Math.max(80, snapVal(startH + (ev.clientY - startY) / curZoom)),
      } as BoardItem));
    };
    const handleUp = () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [onUpdateItem, snapVal, pushHistory]);

  // ─── Block resize (width or width+height) ────────────────────────────────
  const handleBlockResize = useCallback((id: string, e: React.MouseEvent, startW: number, startH: number | null) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX; const startY = e.clientY;
    const curZoom = zoomRef.current;
    let moved = false;
    const handleMove = (ev: MouseEvent) => {
      if (!moved) { pushHistory(); moved = true; }
      onUpdateItem(id, item => ({
        ...item,
        width: Math.max(140, snapVal(startW + (ev.clientX - startX) / curZoom)),
        ...(startH !== null ? { imgHeight: Math.max(80, snapVal(startH + (ev.clientY - startY) / curZoom)) } : {}),
      }));
    };
    const handleUp = () => { document.removeEventListener('mousemove', handleMove); document.removeEventListener('mouseup', handleUp); };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [onUpdateItem, snapVal, pushHistory]);

  // ─── Line endpoint drag ───────────────────────────────────────────────────
  // Grabbing an endpoint detaches it immediately (so it tracks the cursor
  // instead of snapping back to its attached item every render); dropping it
  // on another item re-attaches there, dropping on empty canvas leaves it free.
  const handleLineEndpointDrag = useCallback((id: string, e: React.MouseEvent, endpoint: 1 | 2) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const item = project.items.find(i => i.id === id) as LineItem | undefined;
    if (!item) return;

    pushHistory();
    const resolved = resolveLineItem(item, projectRef.current.items, measuredSizes);
    const origX = endpoint === 1 ? resolved.x : resolved.x2;
    const origY = endpoint === 1 ? resolved.y : resolved.y2;

    onUpdateItem(id, i => ({
      ...i,
      ...(endpoint === 1 ? { startItemId: undefined, x: origX, y: origY } : { endItemId: undefined, x2: origX, y2: origY }),
    } as BoardItem));

    const startX = e.clientX; const startY = e.clientY;
    const curZoom = zoomRef.current;

    const findTarget = (nx: number, ny: number) =>
      projectRef.current.items.find(t => {
        if (t.id === id || t.type === 'line' || t.type === 'frame') return false;
        const s = measuredSizes.get(t.id) ?? approxSize(t);
        return nx >= t.x && ny >= t.y && nx <= t.x + s.w && ny <= t.y + s.h;
      });

    const handleMove = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX) / curZoom;
      const dy = (ev.clientY - startY) / curZoom;
      const nx = origX + dx;
      const ny = origY + dy;
      onUpdateItem(id, i => ({
        ...i,
        ...(endpoint === 1 ? { x: nx, y: ny } : { x2: nx, y2: ny }),
      }));
      setAttachHover(findTarget(nx, ny)?.id ?? null);
    };
    const handleUp = (me: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      const targetId = attachHoverIdRef.current;
      if (targetId) {
        const target = projectRef.current.items.find(t => t.id === targetId);
        if (target) {
          const dx = (me.clientX - startX) / curZoom;
          const dy = (me.clientY - startY) / curZoom;
          // Snap to the item's border, in the direction the person actually
          // dropped it, rather than always landing dead-center.
          const p = rectBorderPoint(itemRect(target, measuredSizes), origX + dx, origY + dy);
          onUpdateItem(id, i => ({
            ...i,
            ...(endpoint === 1 ? { startItemId: target.id, x: p.x, y: p.y } : { endItemId: target.id, x2: p.x, y2: p.y }),
          } as BoardItem));
        }
      }
      setAttachHover(null);
    };
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [project.items, onUpdateItem, measuredSizes, pushHistory]);

  // ─── Checklist entry dropped outside its own card ─────────────────────────
  // Finds whichever checklist (if any) is under the cursor and moves the
  // entry there; if none is found, the entry goes back where it came from
  // so a stray drop never loses data.
  const handleChecklistDragOutside = useCallback((sourceId: string, entry: ChecklistEntry, clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pt = screenToCanvas(clientX - rect.left, clientY - rect.top);
    const target = projectRef.current.items.find(t =>
      t.id !== sourceId && t.type === 'checklist' &&
      (() => { const s = measuredSizes.get(t.id) ?? approxSize(t); return pt.x >= t.x && pt.y >= t.y && pt.x <= t.x + s.w && pt.y <= t.y + s.h; })()
    );
    const destId = target?.id ?? sourceId;
    onUpdateItem(destId, i => ({ ...i, entries: [...(i as ChecklistItem).entries, entry] } as BoardItem));
  }, [screenToCanvas, onUpdateItem, measuredSizes]);

  // ─── Kanban card dropped outside its own board ─────────────────────────────
  // Same idea as the checklist version: finds whichever kanban board (if any)
  // is under the cursor and appends the card to its first column; if none is
  // found, the card goes back to its own board so nothing is lost.
  const handleKanbanCardDroppedOutside = useCallback((sourceId: string, card: KanbanCard, clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pt = screenToCanvas(clientX - rect.left, clientY - rect.top);
    const target = projectRef.current.items.find(t =>
      t.id !== sourceId && t.type === 'kanban' &&
      (() => { const s = measuredSizes.get(t.id) ?? approxSize(t); return pt.x >= t.x && pt.y >= t.y && pt.x <= t.x + s.w && pt.y <= t.y + s.h; })()
    ) as KanbanItem | undefined;
    const destId = target?.id ?? sourceId;
    onUpdateItem(destId, i => {
      const k = i as KanbanItem;
      if (k.columns.length === 0) return i;
      const cols = [...k.columns];
      cols[0] = { ...cols[0]!, cards: [...cols[0]!.cards, card] };
      return { ...k, columns: cols } as BoardItem;
    });
  }, [screenToCanvas, onUpdateItem, measuredSizes]);

  const safeSelectedIds = selectedIds ?? [];
  const selectedItems = project.items.filter(i => safeSelectedIds.includes(i.id));
  const frames = project.items.filter(i => i.type === 'frame');
  const others = project.items.filter(i => i.type !== 'frame').sort((a, b) => a.zIndex - b.zIndex);

  const dotInterval = DOT * zoom;
  const bpx = ((pan.x % dotInterval) + dotInterval) % dotInterval;
  const bpy = ((pan.y % dotInterval) + dotInterval) % dotInterval;
  const cursorStyle = selectedTool !== 'select' ? 'cursor-crosshair' : 'cursor-default';

  // Clicking anywhere on the canvas — including on another item — should
  // commit and close whatever text field is currently being edited. Normally
  // the browser does this via the native blur-on-click behavior, but our
  // mousedown handlers call preventDefault() (needed for drag/lasso/pan), and
  // that side-effect also suppresses the native blur. This runs in the
  // capture phase so it always fires first, before any handler below it can
  // stopPropagation() it away.
  // Clicking anywhere on the canvas — including on another item — should
  // commit and close whatever text field is currently being edited, since
  // preventDefault() elsewhere suppresses the browser's native blur-on-click.
  // But a click *inside* the field that's already focused (e.g. clicking to
  // place the cursor or drag-select text in a note) must NOT force a blur —
  // only clicks outside the active field should.
  const handleBlurActiveElement = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) return;
    if (active.contains(e.target as Node)) return;
    active.blur();
  }, []);

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
      onMouseDownCapture={handleBlurActiveElement}
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
              className={`absolute${animatingIds.has(item.id) ? ' board-item-enter' : ''}`}
              style={{ left: item.x, top: item.y, zIndex: item.zIndex }}
              onMouseDown={ev => handleItemMouseDown(item.id, ev)}
              onAnimationEnd={() => clearEnterAnim(item.id)}
            >
              {sel && (
                <div
                  className="absolute pointer-events-none rounded-2xl"
                  style={{ inset: -4, boxShadow: '0 0 0 2px var(--color-accent), 0 0 12px rgba(124, 58, 237,0.25)' }}
                />
              )}
              <BlockRenderer
                item={item} zoom={zoom} isSelected={sel}
                onUpdate={upd => onUpdateItem(item.id, upd)}
                onDelete={() => requestDelete(() => {
                  onDeleteItem(item.id);
                  onSelectItems(safeSelectedIds.filter(x => x !== item.id));
                })}
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
          const renderItem = item.type === 'line' ? resolveLineItem(item as LineItem, project.items, measuredSizes) : item;
          const isAttachTarget = attachHoverId === item.id;
          return (
            <div
              key={item.id}
              data-board-item="true"
              className={`absolute${animatingIds.has(item.id) ? ' board-item-enter' : ''}`}
              style={{ left: renderItem.x, top: renderItem.y, zIndex: item.zIndex, cursor: 'grab' }}
              onMouseDown={ev => handleItemMouseDown(item.id, ev)}
              onAnimationEnd={() => clearEnterAnim(item.id)}
            >
              {sel && (
                <div
                  className="absolute pointer-events-none rounded-2xl"
                  style={{ inset: -4, boxShadow: '0 0 0 2px var(--color-accent), 0 0 12px rgba(124, 58, 237,0.25)' }}
                />
              )}
              {isAttachTarget && (
                <div
                  className="absolute pointer-events-none rounded-2xl"
                  style={{ inset: -6, boxShadow: '0 0 0 3px var(--color-accent), 0 0 18px rgba(124, 58, 237,0.35)' }}
                />
              )}
              <ItemWatcher itemId={item.id} onResize={handleItemResize}>
                <BlockRenderer
                  item={renderItem} zoom={zoom} isSelected={sel}
                  isDragOver={dragOverColumnId === item.id}
                  onUpdate={upd => onUpdateItem(item.id, upd)}
                  onDelete={() => requestDelete(() => {
                    onDeleteItem(item.id);
                    onSelectItems(safeSelectedIds.filter(x => x !== item.id));
                  })}
                  onFrameResize={() => {}}
                  onFitFrame={() => {}}
                  onBlockResize={(ev, w, h) => handleBlockResize(item.id, ev, w, h)}
                  onLineEndpointDrag={(ev, ep) => handleLineEndpointDrag(item.id, ev, ep)}
                  onEjectItem={item.type === 'column' ? ejected => { pushHistory(); onEjectFromColumn(item.id, ejected); } : undefined}
                  onSelectColumnItem={item.type === 'column'
                    ? (colItem) => {
                        if (colItem) { setSelectedColumnItem({ columnId: item.id, item: colItem }); onSelectItems([]); }
                        else setSelectedColumnItem(null);
                      }
                    : undefined}
                  onRequestDelete={requestDelete}
                  onEntryDroppedOutside={item.type === 'checklist'
                    ? (entry, cx, cy) => handleChecklistDragOutside(item.id, entry, cx, cy)
                    : undefined}
                  onCardDroppedOutside={item.type === 'kanban'
                    ? (card, cx, cy) => handleKanbanCardDroppedOutside(item.id, card, cx, cy)
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
          onDeleteItems={ids => requestDelete(() => { onDeleteItems(ids); onSelectItems([]); }, ids.length)}
          onGroupItems={() => { pushHistory(); onGroupSelected(); }}
          onFitFrame={handleFitFrame}
          onClose={() => { onSelectItems([]); setSelectedColumnItem(null); }}
          columnItem={selectedColumnItem?.item}
          onUpdateColumnItem={selectedColumnItem
            ? fn => handleUpdateColumnItem(selectedColumnItem.columnId, fn)
            : undefined}
          onDeleteColumnItem={selectedColumnItem
            ? () => requestDelete(() => {
                onUpdateItem(selectedColumnItem.columnId, col => ({
                  ...col,
                  items: (col as ColumnItem).items.filter(i => i.id !== selectedColumnItem.item.id),
                }));
                setSelectedColumnItem(null);
              })
            : undefined}
        />
      )}

      {/* Delete confirmation */}
      {pendingDelete && (
        <ConfirmDialog
          title={pendingDelete.count > 1 ? `Delete ${pendingDelete.count} items?` : 'Delete this item?'}
          message="This can't be undone."
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      {/* Placement hint */}
      {selectedTool !== 'select' && (
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none hint-pulse">
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
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
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
                <rect x="3" y="3" width="9" height="9" rx="1.5" fill="rgba(0,0,0,0.12)" />
                <rect x="14" y="3" width="9" height="9" rx="1.5" fill="rgba(0,0,0,0.08)" />
                <rect x="3" y="14" width="9" height="9" rx="1.5" fill="rgba(0,0,0,0.08)" />
                <rect x="14" y="14" width="9" height="9" rx="1.5" fill="rgba(0,0,0,0.05)" />
              </svg>
            </div>
            <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>Empty board</p>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Select a tool from the sidebar to get started</p>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute right-6 pointer-events-auto flex items-center gap-2">
        <button
          onClick={() => setSnapEnabled(v => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border shadow-md transition-colors"
          style={{
            backgroundColor: snapEnabled ? 'var(--color-accent)' : 'var(--color-surface-translucent)',
            borderColor: snapEnabled ? 'var(--color-accent)' : 'var(--color-border)',
            color: snapEnabled ? 'white' : 'var(--color-text-secondary)',
            backdropFilter: 'blur(8px)',
          }}
          title={snapEnabled ? 'Snap to grid: on' : 'Snap to grid: off'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3v18M12 3v18M18 3v18M3 6h18M3 12h18M3 18h18" opacity="0.55" />
            <rect x="9" y="9" width="8" height="8" rx="1" fill="currentColor" opacity={snapEnabled ? 1 : 0.55} />
          </svg>
        </button>
        <div className="flex items-center rounded-xl overflow-hidden border shadow-md"
          style={{ backgroundColor: 'var(--color-surface-translucent)', borderColor: 'var(--color-border)', backdropFilter: 'blur(8px)' }}>
          <button
            onClick={() => { const nz = Math.max(ZOOM_MIN, parseFloat((zoom - 0.1).toFixed(2))); onZoomChange(nz); }}
            className="w-8 h-8 flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0,0,0,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
