import { useState, useRef, useEffect, useCallback } from 'react';
import type { ChecklistItem, ChecklistEntry, BoardItem } from '@/data/types';

const uid = () => Math.random().toString(36).slice(2, 9);

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

interface EntryRowProps {
  entry: ChecklistEntry;
  dragging: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
  onDragHandleMouseDown: (e: React.MouseEvent) => void;
  textColor: string;
  accentColor: string;
}

function EntryRow({ entry, dragging, onToggle, onDelete, onEdit, onDragHandleMouseDown, textColor, accentColor }: EntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  const commit = () => { onEdit(text); setEditing(false); };

  return (
    <div className="group/entry flex items-center gap-1 py-1" style={{ opacity: dragging ? 0.35 : 1 }}>
      {/* Drag handle — visible on hover, grabs the row for reordering */}
      <div
        onMouseDown={onDragHandleMouseDown}
        className="opacity-0 group-hover/entry:opacity-100 flex-shrink-0 cursor-grab active:cursor-grabbing transition-opacity flex flex-col items-center justify-center gap-[3px] rounded-md"
        style={{ width: 16, height: 22, color: `${textColor}90` }}
        title="Drag to reorder or move to another checklist"
      >
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-1">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'currentColor' }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'currentColor' }} />
          </div>
        ))}
      </div>

      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={onToggle}
        className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-200 border"
        style={{
          borderColor: entry.done ? accentColor : `${textColor}40`,
          backgroundColor: entry.done ? accentColor : 'transparent',
        }}
      >
        {entry.done && (
          <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
            <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
          style={{ color: textColor }}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commit(); }}
          onMouseDown={e => e.stopPropagation()}
        />
      ) : (
        <span
          className="flex-1 min-w-0 text-sm leading-snug select-none cursor-text transition-all duration-150 truncate"
          style={{
            color: entry.done ? `${textColor}55` : textColor,
            textDecoration: entry.done ? 'line-through' : 'none',
          }}
          onDoubleClick={() => setEditing(true)}
        >
          {entry.text || <span style={{ opacity: 0.4 }}>Untitled</span>}
        </span>
      )}

      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={onDelete}
        className="opacity-0 group-hover/entry:opacity-100 flex-shrink-0 transition-opacity"
        style={{ color: `${textColor}55` }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function DropLine() {
  return <div className="h-1 rounded-full mx-1 my-1" style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 8px rgba(124,58,237,0.5)' }} />;
}

interface Props {
  item: ChecklistItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onBlockResize?: (e: React.MouseEvent, w: number, h: null) => void;
  /** Called when an entry is dragged out past this checklist's own bounds, so
   *  Canvas can figure out whether another checklist is under the cursor. */
  onEntryDroppedOutside?: (entry: ChecklistEntry, clientX: number, clientY: number) => void;
}

export default function ChecklistBlock({ item, onUpdate, onDelete, onBlockResize, onEntryDroppedOutside }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [addingEntry, setAddingEntry] = useState(false);
  const [newText, setNewText] = useState('');
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const dropIdxRef = useRef<number | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const entriesRef = useRef(item.entries);
  entriesRef.current = item.entries;

  useEffect(() => { if (addingEntry) addInputRef.current?.focus(); }, [addingEntry]);

  const light = isLight(item.color);
  const textColor = light ? '#1e293b' : '#e8f4f4';
  const mutedColor = light ? 'rgba(30,41,59,0.45)' : 'rgba(232,244,244,0.4)';
  const accentColor = light ? 'var(--color-accent)' : '#e8f4f4';

  const update = (patch: Partial<ChecklistItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  const updateEntries = (fn: (entries: ChecklistEntry[]) => ChecklistEntry[]) =>
    update({ entries: fn(entriesRef.current) });

  const done = item.entries.filter(e => e.done).length;
  const total = item.entries.length;
  const pct = total > 0 ? (done / total) * 100 : 0;

  const commitNew = () => {
    if (newText.trim()) {
      updateEntries(entries => [...entries, { id: uid(), text: newText.trim(), done: false }]);
      setNewText('');
    } else {
      setAddingEntry(false);
    }
  };

  // ─── Drag to reorder within this checklist, or drop onto another one ─────
  const handleDragStart = useCallback((fromIdx: number, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const card = cardRef.current;
    if (!card) return;

    setDraggingIdx(fromIdx);
    setDropIdx(fromIdx);
    dropIdxRef.current = fromIdx;

    const getCenters = () => {
      const centers: number[] = [];
      for (let i = 0; i < entriesRef.current.length; i++) {
        const el = rowRefs.current.get(i);
        centers.push(el ? el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2 : 0);
      }
      return centers;
    };

    const handleMove = (me: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const inside = me.clientX >= rect.left - 24 && me.clientX <= rect.right + 24 &&
        me.clientY >= rect.top - 24 && me.clientY <= rect.bottom + 24;

      if (!inside) {
        dropIdxRef.current = null;
        setDropIdx(null);
        return;
      }
      const centers = getCenters();
      let target = fromIdx;
      for (let i = 0; i < centers.length; i++) {
        if (me.clientY > centers[i]!) target = i;
      }
      dropIdxRef.current = target;
      setDropIdx(target);
    };

    const handleUp = (me: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      const rect = card.getBoundingClientRect();
      const inside = me.clientX >= rect.left - 24 && me.clientX <= rect.right + 24 &&
        me.clientY >= rect.top - 24 && me.clientY <= rect.bottom + 24;

      const entry = entriesRef.current[fromIdx];
      if (!inside) {
        // Dragged out — only act if the parent wired up cross-checklist
        // drops (top-level canvas items); otherwise snap back so nothing
        // is silently lost (e.g. a checklist nested inside a column).
        if (entry && onEntryDroppedOutside) {
          updateEntries(entries => entries.filter(en => en.id !== entry.id));
          onEntryDroppedOutside(entry, me.clientX, me.clientY);
        }
      } else {
        const finalDrop = dropIdxRef.current;
        if (finalDrop !== null && finalDrop !== fromIdx) {
          updateEntries(entries => {
            const next = [...entries];
            const [moved] = next.splice(fromIdx, 1);
            if (moved) next.splice(finalDrop, 0, moved);
            return next;
          });
        }
      }

      setDraggingIdx(null);
      setDropIdx(null);
      dropIdxRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [onEntryDroppedOutside]);

  return (
    <div className="group relative transition-all duration-200 hover:shadow-2xl" style={{ width: item.width ?? 220 }}>
      <div ref={cardRef} className="rounded-2xl shadow-xl overflow-hidden" style={{ backgroundColor: item.color }}>
        {/* Top accent strip */}
        {item.topColor && (
          <div style={{ height: 5, backgroundColor: item.topColor }} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                className="w-full bg-transparent outline-none font-bold text-base"
                style={{ color: textColor }}
                value={item.title}
                onChange={e => update({ title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingTitle(false)}
                onMouseDown={e => e.stopPropagation()}
              />
            ) : (
              <h3
                className="font-bold text-base leading-snug cursor-text select-none truncate"
                style={{ color: textColor }}
                onDoubleClick={() => setEditingTitle(true)}
              >
                {item.title}
              </h3>
            )}
          </div>

          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded-full p-0.5 hover:bg-black/10 ml-2"
            style={{ color: mutedColor }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="px-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: `${textColor}18` }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: accentColor, opacity: 0.9 }}
                />
              </div>
              <span className="text-[11px] font-mono flex-shrink-0" style={{ color: mutedColor }}>
                {done}/{total}
              </span>
            </div>
          </div>
        )}

        <div className="mx-3 mb-2" style={{ height: 1, backgroundColor: `${textColor}12` }} />

        {/* Entries */}
        <div className="px-3 pb-1">
          {item.entries.map((entry, idx) => (
            <div key={entry.id}>
              {dropIdx === idx && draggingIdx !== null && draggingIdx !== idx && draggingIdx !== idx - 1 && <DropLine />}
              <div ref={el => { if (el) rowRefs.current.set(idx, el); else rowRefs.current.delete(idx); }}>
                <EntryRow
                  entry={entry}
                  dragging={draggingIdx === idx}
                  textColor={textColor}
                  accentColor={accentColor}
                  onDragHandleMouseDown={e => handleDragStart(idx, e)}
                  onToggle={() => updateEntries(entries =>
                    entries.map(e => e.id === entry.id ? { ...e, done: !e.done } : e)
                  )}
                  onDelete={() => updateEntries(entries => entries.filter(e => e.id !== entry.id))}
                  onEdit={text => updateEntries(entries =>
                    entries.map(e => e.id === entry.id ? { ...e, text } : e)
                  )}
                />
              </div>
            </div>
          ))}
          {dropIdx === item.entries.length && draggingIdx !== null && <DropLine />}

          {addingEntry ? (
            <div className="flex items-center gap-2 py-1" onMouseDown={e => e.stopPropagation()}>
              <div className="w-4 h-4 rounded border flex-shrink-0" style={{ borderColor: `${textColor}40` }} />
              <input
                ref={addInputRef}
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitNew();
                  if (e.key === 'Escape') { setAddingEntry(false); setNewText(''); }
                }}
                onBlur={commitNew}
                placeholder="New item…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: textColor }}
              />
            </div>
          ) : (
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setAddingEntry(true)}
              className="flex items-center gap-1.5 text-xs py-1.5 w-full transition-opacity hover:opacity-80"
              style={{ color: mutedColor }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add item
            </button>
          )}
        </div>

        <div className="pb-2" />
      </div>

      {/* Width resize handle — height always stays auto */}
      {onBlockResize && (
        <div
          className="absolute opacity-0 group-hover:opacity-100 transition-opacity cursor-ew-resize"
          style={{ top: 0, bottom: 0, right: -7, width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={e => { if (e.button !== 0) return; e.stopPropagation(); onBlockResize(e, item.width ?? 220, null); }}
        >
          <div className="w-1.5 rounded-full" style={{ height: 36, backgroundColor: light ? 'rgba(30,41,59,0.4)' : 'rgba(232,244,244,0.4)' }} />
        </div>
      )}
    </div>
  );
}
