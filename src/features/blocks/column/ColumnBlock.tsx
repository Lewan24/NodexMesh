import { useState, useRef, useCallback, useEffect } from 'react';
import type { ColumnItem, BoardItem, NoteItem, ChecklistItem, LinkItem, ImageItem, TextItem } from '@/data/types';
import BlockRenderer from '@/features/blocks/BlockRenderer';

const uid = () => Math.random().toString(36).slice(2, 9);

const COLUMN_BG_COLORS = [
  '#f0f9ff', '#fefce8', '#f0fdf4', '#fdf4ff', '#fff7ed', '#f8fafc',
  '#e0f2fe', '#dcfce7', '#ede9fe', '#fce7f3',
];

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

// ─── Column item wrapper with drag handle + eject + selection ────────────────
interface ItemRowProps {
  item: BoardItem;
  isDragging: boolean;
  isSelected: boolean;
  onDragHandleMouseDown: (e: React.MouseEvent) => void;
  onEject: () => void;
  onSelect: () => void;
  children: React.ReactNode;
}

function ItemRow({ isDragging, isSelected, onDragHandleMouseDown, onEject, onSelect, children }: ItemRowProps) {
  return (
    <div
      className="group/row relative"
      style={{ opacity: isDragging ? 0.3 : 1, transition: 'opacity 0.15s' }}
    >
      {/* Card wrapper */}
      <div
        className="relative rounded-xl overflow-hidden shadow-sm border cursor-pointer"
        style={{
          borderColor: isSelected ? '#7C3AED' : 'rgba(0,0,0,0.07)',
          boxShadow: isSelected ? '0 0 0 2px rgba(124, 58, 237,0.2), 0 4px 16px rgba(0,0,0,0.08)' : '',
          transition: 'box-shadow 0.15s, border-color 0.15s',
        }}
        onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'; }}
        onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.boxShadow = ''; }}
        onClick={onSelect}
      >
        {/* Drag handle (top-left, hover) */}
        <div
          className="absolute top-1.5 left-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
        >
          <div
            className="flex flex-col items-center justify-center gap-[3px] cursor-grab active:cursor-grabbing rounded-lg shadow-sm"
            style={{ width: 24, height: 24, backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.1)' }}
            onMouseDown={onDragHandleMouseDown}
            title="Drag to reorder or move to canvas"
          >
            {[0, 1, 2].map(i => (
              <div key={i} className="flex gap-1">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#6b7280' }} />
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: '#6b7280' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Eject (top-right, hover) */}
        <div
          className="absolute top-1.5 right-1.5 opacity-0 group-hover/row:opacity-100 transition-opacity z-10"
          onMouseDown={e => e.stopPropagation()}
        >
          <button
            onClick={e => { e.stopPropagation(); onEject(); }}
            className="flex items-center justify-center rounded-md transition-colors"
            style={{ width: 24, height: 24, backgroundColor: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.1)' }}
            title="Pop out to canvas"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-9 9M3 21l9-9" />
            </svg>
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

// ─── DROP INDICATOR LINE ─────────────────────────────────────────────────────
function DropLine() {
  return (
    <div className="h-1 rounded-full mx-1 my-1.5" style={{ backgroundColor: '#7C3AED', boxShadow: '0 0 8px rgba(124, 58, 237,0.5)' }} />
  );
}

// ─── Main ColumnBlock ─────────────────────────────────────────────────────────
interface Props {
  item: ColumnItem;
  zoom?: number;
  isSelected?: boolean;
  isDragOver?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onBlockResize: (e: React.MouseEvent, w: number, h: null) => void;
  onEjectItem?: (ejectedItem: BoardItem) => void;
  onSelectColumnItem?: (item: BoardItem | null) => void;
  onRequestDelete?: (execute: () => void) => void;
}

const ADD_TYPES: { kind: BoardItem['type']; label: string; icon: string }[] = [
  { kind: 'note', label: 'Note', icon: '📝' },
  { kind: 'checklist', label: 'Checklist', icon: '✅' },
  { kind: 'link', label: 'Link', icon: '🔗' },
  { kind: 'text', label: 'Text', icon: 'T' },
  { kind: 'image', label: 'Image', icon: '🖼' },
];

function createDefaultItem(kind: BoardItem['type']): BoardItem {
  const base = { id: uid(), x: 0, y: 0, zIndex: 1 };
  switch (kind) {
    case 'note': return { ...base, type: 'note', content: '', color: '#fefce8', width: 240 } as NoteItem;
    case 'checklist': return { ...base, type: 'checklist', title: 'Checklist', color: '#f0fdf4', entries: [] } as ChecklistItem;
    case 'link': return { ...base, type: 'link', url: '', title: 'New Link', description: '' } as LinkItem;
    case 'image': return { ...base, type: 'image', url: '', caption: '', width: 240, imgHeight: 150 } as ImageItem;
    case 'text': return { ...base, type: 'text', content: 'Text', size: 'md' } as TextItem;
    default: return { ...base, type: 'note', content: '', color: '#fefce8', width: 240 } as NoteItem;
  }
}

export default function ColumnBlock({ item, isSelected, isDragOver, onUpdate, onDelete, onBlockResize, onEjectItem, onSelectColumnItem, onRequestDelete }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBgMenu, setShowBgMenu] = useState(false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const dropIdxRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const bgMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddMenu && !showBgMenu) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!containerRef.current?.contains(t) && !bgMenuRef.current?.contains(t)) {
        setShowAddMenu(false);
        setShowBgMenu(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showAddMenu, showBgMenu]);

  const safeItems = item.items ?? [];
  const safeItemsRef = useRef(safeItems);
  safeItemsRef.current = safeItems;
  // Leave room for the card's own padding — items fill the full column inner width
  const innerWidth = item.width - 32; // 16px padding each side

  const columnLight = isLight(item.color);
  const headerTextColor = columnLight ? '#1e293b' : '#f1f5f9';
  const headerMutedColor = columnLight ? '#64748b' : '#94a3b8';

  const update = (patch: Partial<ColumnItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  const updateItems = (fn: (items: BoardItem[]) => BoardItem[]) =>
    update({ items: fn(safeItems) });
  const updateNested = (id: string, fn: (i: BoardItem) => BoardItem) =>
    updateItems(items => items.map(i => i.id === id ? fn(i) : i));
  const deleteNested = (id: string) =>
    updateItems(items => items.filter(i => i.id !== id));

  const addNewItem = (kind: BoardItem['type']) => {
    updateItems(items => [...items, createDefaultItem(kind)]);
    setShowAddMenu(false);
  };

  // ─── Internal drag-drop reorder ───────────────────────────────────────────
  const handleDragStart = useCallback((fromIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const containerEl = containerRef.current;
    if (!containerEl) return;

    setDraggingIdx(fromIdx);
    setDropIdx(fromIdx);

    const getItemCenters = () => {
      const centers: number[] = [];
      for (let i = 0; i < safeItems.length; i++) {
        const el = itemRefsMap.current.get(i);
        if (el) {
          const r = el.getBoundingClientRect();
          centers.push(r.top + r.height / 2);
        } else {
          centers.push(0);
        }
      }
      return centers;
    };

    const handleMove = (me: MouseEvent) => {
      const centers = getItemCenters();
      let target = fromIdx;
      for (let i = 0; i < centers.length; i++) {
        if (me.clientY > centers[i]!) target = i;
      }
      const rect = containerEl.getBoundingClientRect();
      const isOutsideX = me.clientX < rect.left - 40 || me.clientX > rect.right + 40;
      dropIdxRef.current = isOutsideX ? null : target;
      setDropIdx(isOutsideX ? null : target);
    };

    const handleUp = (me: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      const finalDrop = dropIdxRef.current;
      const rect = containerEl.getBoundingClientRect();
      const isOutsideX = me.clientX < rect.left - 40 || me.clientX > rect.right + 40;

      if (isOutsideX && onEjectItem) {
        const ejectedItem = safeItemsRef.current[fromIdx];
        if (ejectedItem) {
          deleteNested(ejectedItem.id);
          onEjectItem(ejectedItem);
        }
      } else if (finalDrop !== null && finalDrop !== fromIdx) {
        updateItems(items => {
          const next = [...items];
          const [moved] = next.splice(fromIdx, 1);
          next.splice(finalDrop, 0, moved!);
          return next;
        });
      }

      setDraggingIdx(null);
      setDropIdx(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [safeItems, onEjectItem, deleteNested, updateItems]);

  return (
    <div className="group/col relative" style={{ width: item.width }}>
      {isDragOver && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{ inset: -4, boxShadow: '0 0 0 3px #7C3AED, 0 0 24px rgba(124, 58, 237,0.3)', zIndex: 1 }}
        />
      )}

      <div
        className="rounded-2xl border shadow-xl"
        style={{
          backgroundColor: item.color,
          borderColor: isSelected ? '#7C3AED' : isDragOver ? '#7C3AED' : columnLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)',
          transition: 'border-color 0.15s',
          minWidth: 220,
        }}
      >
        {/* ─── Header ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing rounded-t-2xl"
          style={{ borderColor: columnLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Column bg color dot */}
            <div className="relative flex-shrink-0" onMouseDown={e => e.stopPropagation()} ref={bgMenuRef}>
              <button
                onClick={() => setShowBgMenu(v => !v)}
                className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-125"
                style={{
                  backgroundColor: item.color,
                  borderColor: columnLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)',
                }}
                title="Column background color"
              />
              {showBgMenu && (
                <div
                  className="absolute top-6 left-0 z-50 rounded-xl shadow-2xl border p-2.5"
                  style={{ backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.1)', minWidth: 170 }}
                  onMouseDown={e => e.stopPropagation()}
                >
                  <p className="text-xs font-semibold mb-2" style={{ color: '#6b7280' }}>Column background</p>
                  <div className="flex flex-wrap gap-2">
                    {COLUMN_BG_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => { update({ color: c }); setShowBgMenu(false); }}
                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: item.color === c ? '#1a2530' : 'rgba(0,0,0,0.12)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            {editingTitle ? (
              <input
                autoFocus
                className="bg-transparent font-bold text-base outline-none border-b-2 min-w-0 flex-1"
                style={{ color: headerTextColor, borderColor: '#7C3AED' }}
                value={item.title}
                onChange={e => update({ title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingTitle(false)}
                onMouseDown={e => e.stopPropagation()}
              />
            ) : (
              <span
                className="font-bold text-base select-none cursor-text truncate"
                style={{ color: headerTextColor }}
                onDoubleClick={() => setEditingTitle(true)}
              >
                {item.title}
              </span>
            )}

            <span
              className="text-xs font-mono flex-shrink-0 px-1.5 py-0.5 rounded-full"
              style={{
                color: headerMutedColor,
                backgroundColor: columnLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
              }}
            >
              {safeItems.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2" onMouseDown={e => e.stopPropagation()}>
            {/* Width resize handle in header */}
            <div
              className="opacity-0 group-hover/col:opacity-100 cursor-ew-resize transition-opacity rounded-lg p-1.5"
              style={{ color: headerMutedColor }}
              onMouseDown={e => { e.stopPropagation(); onBlockResize(e, item.width, null); }}
              title="Drag to resize width"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
              </svg>
            </div>

            <button
              onClick={onDelete}
              className="opacity-0 group-hover/col:opacity-100 transition-all rounded-lg p-1.5"
              style={{ color: headerMutedColor }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = headerMutedColor; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ─── Items ──────────────────────────────────────────────────────── */}
        <div
          ref={containerRef}
          className="px-4 pt-3 pb-1 flex flex-col gap-2.5"
          onClick={e => {
            if (e.target === e.currentTarget) { setSelectedItemId(null); onSelectColumnItem?.(null); }
          }}
        >
          {safeItems.map((ni, idx) => (
            <div key={ni.id}>
              {dropIdx === idx && draggingIdx !== null && draggingIdx !== idx && draggingIdx !== idx - 1 && (
                <DropLine />
              )}

              <div ref={el => { if (el) itemRefsMap.current.set(idx, el); else itemRefsMap.current.delete(idx); }}>
                <ItemRow
                  item={ni}
                  isDragging={draggingIdx === idx}
                  isSelected={selectedItemId === ni.id}
                  onDragHandleMouseDown={e => handleDragStart(idx, e)}
                  onEject={() => {
                    deleteNested(ni.id);
                    onEjectItem?.(ni);
                    if (selectedItemId === ni.id) { setSelectedItemId(null); onSelectColumnItem?.(null); }
                  }}
                  onSelect={() => {
                    setSelectedItemId(ni.id);
                    onSelectColumnItem?.(ni);
                  }}
                >
                  <div
                    onMouseDown={e => {
                      const target = e.target as Element;
                      const isInteractive =
                        target instanceof HTMLInputElement ||
                        target instanceof HTMLTextAreaElement ||
                        target instanceof HTMLButtonElement ||
                        target.closest('button') !== null;
                      if (!isInteractive) e.stopPropagation();
                    }}
                  >
                    <BlockRenderer
                      item={{ ...ni, width: ni.type === 'note' ? innerWidth : (ni as any).width ?? innerWidth } as BoardItem}
                      zoom={1}
                      isSelected={false}
                      onUpdate={fn => updateNested(ni.id, fn)}
                      onDelete={() => (onRequestDelete ? onRequestDelete(() => deleteNested(ni.id)) : deleteNested(ni.id))}
                      onFrameResize={() => {}}
                      onFitFrame={() => {}}
                      onBlockResize={() => {}}
                      onLineEndpointDrag={() => {}}
                    />
                  </div>
                </ItemRow>
              </div>
            </div>
          ))}

          {dropIdx === safeItems.length && draggingIdx !== null && <DropLine />}

          {safeItems.length === 0 && (
            <div
              className="py-8 text-center text-sm select-none rounded-xl border-2 border-dashed"
              style={{
                color: columnLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)',
                borderColor: columnLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
              }}
            >
              Drop items here or click + to add
            </div>
          )}
        </div>

        {/* ─── Add item ────────────────────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-2 relative" onMouseDown={e => e.stopPropagation()}>
          <button
            onClick={() => setShowAddMenu(v => !v)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              color: '#7C3AED',
              backgroundColor: columnLight ? 'rgba(124, 58, 237,0.07)' : 'rgba(124, 58, 237,0.12)',
              border: '1.5px dashed rgba(124, 58, 237,0.35)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(124, 58, 237,0.14)'; (e.currentTarget as HTMLElement).style.borderStyle = 'solid'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = columnLight ? 'rgba(124, 58, 237,0.07)' : 'rgba(124, 58, 237,0.12)'; (e.currentTarget as HTMLElement).style.borderStyle = 'dashed'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add item
          </button>

          {showAddMenu && (
            <div
              className="absolute bottom-full left-4 right-4 mb-1.5 rounded-2xl border shadow-2xl z-50 overflow-hidden"
              style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.08)' }}
              onMouseDown={e => e.stopPropagation()}
            >
              {ADD_TYPES.map(({ kind, label, icon }) => (
                <button
                  key={kind}
                  onClick={() => addNewItem(kind)}
                  className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
                  style={{ color: '#374151' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#f3f4f6'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Right-edge resize handle ────────────────────────────────────────── */}
      <div
        className="absolute top-0 bottom-0 cursor-ew-resize flex items-center opacity-0 group-hover/col:opacity-100 transition-opacity"
        style={{ right: -8, width: 16 }}
        onMouseDown={e => { e.stopPropagation(); onBlockResize(e, item.width, null); }}
        title="Drag to resize"
      >
        <div
          className="rounded-full"
          style={{ width: 5, height: 44, backgroundColor: '#7C3AED', opacity: 0.65, margin: '0 auto' }}
        />
      </div>
    </div>
  );
}
