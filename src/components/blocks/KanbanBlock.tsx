import { useState, useRef, useCallback } from 'react';
import type { KanbanItem, KanbanColumn, KanbanCard, BoardItem } from '../../data/types';

const uid = () => Math.random().toString(36).slice(2, 9);
const COL_COLORS = ['#5a8a94', '#FFBD65', '#7C3AED', '#02A0A0', '#FF6B8A', '#059669'];
const DEFAULT_BG = '#08171d';

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

function DropLine() {
  return <div className="h-1 rounded-full my-1" style={{ backgroundColor: 'var(--color-accent)', boxShadow: '0 0 8px rgba(124,58,237,0.5)' }} />;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  card: KanbanCard;
  dragging: boolean;
  textColor: string;
  mutedColor: string;
  doneColor: string;
  cardBg: string;
  cardBorder: string;
  cardBorderHover: string;
  accentColor: string;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
  onDragHandleMouseDown: (e: React.MouseEvent) => void;
}

function CardItem({
  card, dragging, textColor, mutedColor, doneColor, cardBg, cardBorder, cardBorderHover, accentColor,
  onToggle, onDelete, onEdit, onDragHandleMouseDown,
}: CardProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(card.text);
  const commit = () => { onEdit(text); setEditing(false); };

  return (
    <div
      className="group/card flex items-start gap-1.5 rounded-xl px-2 py-2 mb-1.5 border transition-all duration-150"
      style={{ backgroundColor: cardBg, borderColor: cardBorder, opacity: dragging ? 0.35 : 1 }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = cardBorderHover)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = cardBorder)}
    >
      {/* Drag handle — visible on hover, grabs the card for reordering / moving */}
      <div
        onMouseDown={onDragHandleMouseDown}
        className="opacity-0 group-hover/card:opacity-100 flex-shrink-0 cursor-grab active:cursor-grabbing transition-opacity flex flex-col items-center justify-center gap-[3px] mt-1 rounded-md"
        style={{ width: 14, height: 20, color: mutedColor }}
        title="Drag to reorder or move to another column/board"
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
        className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 border-2 flex items-center justify-center transition-all duration-200"
        style={{ backgroundColor: card.done ? accentColor : 'transparent', borderColor: card.done ? accentColor : mutedColor }}
      >
        {card.done && (
          <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
            <path d="M2 5.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color: textColor }}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commit(); }}
          onMouseDown={e => e.stopPropagation()}
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-sm leading-snug select-none cursor-text transition-colors"
          style={{ color: card.done ? doneColor : textColor, textDecoration: card.done ? 'line-through' : 'none' }}
        >
          {card.text}
        </span>
      )}

      <button
        onClick={onDelete}
        className="opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0"
        style={{ color: mutedColor }}
        onMouseDown={e => e.stopPropagation()}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF6B8A'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; }}
        title="Delete card"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ─── KanbanBlock ──────────────────────────────────────────────────────────────
interface Props {
  item: KanbanItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  /** Called when a card is dragged past this board's own bounds, so Canvas
   *  can figure out whether another kanban board is under the cursor. */
  onCardDroppedOutside?: (card: KanbanCard, clientX: number, clientY: number) => void;
}

export default function KanbanBlock({ item, onUpdate, onDelete, onCardDroppedOutside }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState('');
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ colId: string; idx: number } | null>(null);
  const dropTargetRef = useRef<{ colId: string; idx: number } | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const columnsRef = useRef(item.columns);
  columnsRef.current = item.columns;

  const bg = item.color ?? DEFAULT_BG;
  const light = isLight(bg);
  const textColor = light ? '#1e293b' : '#ffffff';
  const mutedColor = light ? '#64748b' : '#5a8a94';
  const doneColor = light ? 'rgba(30,41,59,0.4)' : '#3a6070';
  const cardBg = light ? 'rgba(0,0,0,0.05)' : 'rgba(7,19,23,0.5)';
  const cardBorder = light ? 'rgba(0,0,0,0.08)' : '#1a3040';
  const cardBorderHover = 'rgba(124,58,237,0.35)';
  const trackBg = light ? 'rgba(0,0,0,0.08)' : '#1a3040';
  const borderColor = light ? 'rgba(0,0,0,0.1)' : '#1a3040';
  const accentColor = 'var(--color-accent)';

  const updateKanban = (patch: Partial<KanbanItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  const updateColumns = (fn: (cols: KanbanColumn[]) => KanbanColumn[]) =>
    updateKanban({ columns: fn(columnsRef.current) });

  const addCard = (colId: string) => {
    if (!newCardText.trim()) return;
    updateColumns(cols =>
      cols.map(col => col.id === colId
        ? { ...col, cards: [...col.cards, { id: uid(), text: newCardText.trim(), done: false }] }
        : col
      )
    );
    setNewCardText('');
    setAddingCardCol(null);
  };

  // ─── Drag a card: reorder within/between columns of this board, or hand
  // off to Canvas once it's dragged past this board's own edges ───────────
  const getColUnderCursor = useCallback((clientX: number, fallback: string) => {
    for (const [colId, el] of colRefs.current) {
      const r = el.getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right) return colId;
    }
    return fallback;
  }, []);

  const getDropIndex = useCallback((colId: string, clientY: number) => {
    const col = columnsRef.current.find(c => c.id === colId);
    if (!col) return 0;
    for (let i = 0; i < col.cards.length; i++) {
      const el = cardRowRefs.current.get(col.cards[i]!.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (clientY < r.top + r.height / 2) return i;
    }
    return col.cards.length;
  }, []);

  const handleCardDragStart = useCallback((fromColId: string, cardId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();

    const board = cardRef.current;
    if (!board) return;

    setDraggingCardId(cardId);
    const initial = { colId: fromColId, idx: getDropIndex(fromColId, e.clientY) };
    setDropTarget(initial);
    dropTargetRef.current = initial;

    const handleMove = (me: MouseEvent) => {
      const rect = board.getBoundingClientRect();
      const inside = me.clientX >= rect.left - 24 && me.clientX <= rect.right + 24 &&
        me.clientY >= rect.top - 24 && me.clientY <= rect.bottom + 24;
      if (!inside) {
        dropTargetRef.current = null;
        setDropTarget(null);
        return;
      }
      const colId = getColUnderCursor(me.clientX, fromColId);
      const idx = getDropIndex(colId, me.clientY);
      const next = { colId, idx };
      dropTargetRef.current = next;
      setDropTarget(next);
    };

    const handleUp = (me: MouseEvent) => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);

      const rect = board.getBoundingClientRect();
      const inside = me.clientX >= rect.left - 24 && me.clientX <= rect.right + 24 &&
        me.clientY >= rect.top - 24 && me.clientY <= rect.bottom + 24;

      const sourceCol = columnsRef.current.find(c => c.id === fromColId);
      const card = sourceCol?.cards.find(c => c.id === cardId);

      if (!inside) {
        if (card && onCardDroppedOutside) {
          updateColumns(cols => cols.map(c => c.id === fromColId ? { ...c, cards: c.cards.filter(cd => cd.id !== cardId) } : c));
          onCardDroppedOutside(card, me.clientX, me.clientY);
        }
      } else {
        const target = dropTargetRef.current;
        if (card && target) {
          updateColumns(cols => {
            let removed: KanbanCard | undefined;
            let next = cols.map(c => {
              if (c.id !== fromColId) return c;
              const idx = c.cards.findIndex(cd => cd.id === cardId);
              if (idx === -1) return c;
              const copy = [...c.cards];
              removed = copy.splice(idx, 1)[0];
              return { ...c, cards: copy };
            });
            if (!removed) return cols;
            next = next.map(c => {
              if (c.id !== target.colId) return c;
              const copy = [...c.cards];
              copy.splice(Math.max(0, Math.min(target.idx, copy.length)), 0, removed!);
              return { ...c, cards: copy };
            });
            return next;
          });
        }
      }

      setDraggingCardId(null);
      setDropTarget(null);
      dropTargetRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, [getColUnderCursor, getDropIndex, onCardDroppedOutside]);

  const totalCards = item.columns.reduce((acc, col) => acc + col.cards.length, 0);
  const doneCards = item.columns.reduce((acc, col) => acc + col.cards.filter(c => c.done).length, 0);

  return (
    <div className="group relative">
      <div ref={cardRef} className="rounded-2xl border shadow-xl overflow-visible" style={{ backgroundColor: bg, borderColor }}>
        {/* Top accent strip */}
        {item.topColor && (
          <div style={{ height: 5, backgroundColor: item.topColor, borderRadius: '16px 16px 0 0' }} />
        )}
        {/* Board header */}
        <div className="flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing rounded-t-2xl" style={{ backgroundColor: bg, borderColor }}>
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <input
                autoFocus
                className="bg-transparent font-semibold text-sm outline-none border-b"
                style={{ color: textColor, borderColor: accentColor }}
                value={item.title}
                onChange={e => updateKanban({ title: e.target.value })}
                onBlur={() => setEditingTitle(false)}
                onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingTitle(false)}
                onMouseDown={e => e.stopPropagation()}
              />
            ) : (
              <span
                className="font-semibold text-sm cursor-text select-none"
                style={{ color: textColor }}
                onDoubleClick={() => setEditingTitle(true)}
              >
                {item.title}
              </span>
            )}

            {totalCards > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="h-1 rounded-full overflow-hidden" style={{ width: 48, backgroundColor: trackBg }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(doneCards / totalCards) * 100}%`, backgroundColor: accentColor }}
                  />
                </div>
                <span className="text-[11px] font-mono" style={{ color: mutedColor }}>{doneCards}/{totalCards}</span>
              </div>
            )}
          </div>

          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-all"
            style={{ color: mutedColor }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF6B8A'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Columns */}
        <div className="flex p-3 gap-2">
          {item.columns.map(col => (
            <div
              key={col.id}
              ref={el => { if (el) colRefs.current.set(col.id, el); else colRefs.current.delete(col.id); }}
              className="flex flex-col group/col"
              style={{ width: 180 }}
            >
              {/* Column header — editable */}
              <div className="flex items-center gap-1.5 mb-2.5 group/colhdr">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                {editingColId === col.id ? (
                  <input
                    autoFocus
                    className="flex-1 text-[11px] font-bold uppercase tracking-widest bg-transparent outline-none border-b"
                    style={{ color: col.color, borderColor: col.color + '80' }}
                    value={col.title}
                    onChange={e => updateColumns(cols => cols.map(c => c.id === col.id ? { ...c, title: e.target.value } : c))}
                    onBlur={() => setEditingColId(null)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingColId(null)}
                    onMouseDown={e => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 text-[11px] font-bold uppercase tracking-widest select-none cursor-text"
                    style={{ color: col.color }}
                    onDoubleClick={() => setEditingColId(col.id)}
                    title="Double-click to rename"
                  >
                    {col.title}
                  </span>
                )}
                <span className="ml-auto text-[11px] font-mono flex-shrink-0" style={{ color: mutedColor }}>{col.cards.length}</span>
                {/* Delete column */}
                {item.columns.length > 1 && (
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={() => updateColumns(cols => cols.filter(c => c.id !== col.id))}
                    className="opacity-0 group-hover/col:opacity-100 transition-all flex-shrink-0 ml-0.5"
                    style={{ color: mutedColor }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF6B8A'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div
                className="flex-1 rounded-lg transition-colors"
                style={{
                  minHeight: 40,
                  backgroundColor: dropTarget?.colId === col.id && draggingCardId ? 'rgba(124,58,237,0.06)' : 'transparent',
                  outline: dropTarget?.colId === col.id && draggingCardId ? '1.5px dashed rgba(124,58,237,0.4)' : 'none',
                  outlineOffset: -2,
                }}
              >
                {col.cards.map((card, idx) => (
                  <div key={card.id}>
                    {dropTarget?.colId === col.id && dropTarget.idx === idx && draggingCardId && draggingCardId !== card.id && <DropLine />}
                    <div ref={el => { if (el) cardRowRefs.current.set(card.id, el); else cardRowRefs.current.delete(card.id); }}>
                      <CardItem
                        card={card}
                        dragging={draggingCardId === card.id}
                        textColor={textColor}
                        mutedColor={mutedColor}
                        doneColor={doneColor}
                        cardBg={cardBg}
                        cardBorder={cardBorder}
                        cardBorderHover={cardBorderHover}
                        accentColor={accentColor}
                        onDragHandleMouseDown={e => handleCardDragStart(col.id, card.id, e)}
                        onToggle={() => updateColumns(cols =>
                          cols.map(c => c.id === col.id
                            ? { ...c, cards: c.cards.map(cd => cd.id === card.id ? { ...cd, done: !cd.done } : cd) }
                            : c)
                        )}
                        onDelete={() => updateColumns(cols =>
                          cols.map(c => c.id === col.id
                            ? { ...c, cards: c.cards.filter(cd => cd.id !== card.id) }
                            : c)
                        )}
                        onEdit={text => updateColumns(cols =>
                          cols.map(c => c.id === col.id
                            ? { ...c, cards: c.cards.map(cd => cd.id === card.id ? { ...cd, text } : cd) }
                            : c)
                        )}
                      />
                    </div>
                  </div>
                ))}
                {dropTarget?.colId === col.id && dropTarget.idx === col.cards.length && draggingCardId && <DropLine />}
              </div>

              {addingCardCol === col.id ? (
                <div className="mt-1" onMouseDown={e => e.stopPropagation()}>
                  <input
                    autoFocus
                    value={newCardText}
                    onChange={e => setNewCardText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addCard(col.id);
                      if (e.key === 'Escape') { setAddingCardCol(null); setNewCardText(''); }
                    }}
                    onBlur={() => {
                      if (newCardText.trim()) addCard(col.id);
                      else { setAddingCardCol(null); setNewCardText(''); }
                    }}
                    placeholder="Card title…"
                    className="w-full text-sm px-2.5 py-1.5 rounded-xl outline-none border transition-colors"
                    style={{ backgroundColor: cardBg, borderColor: accentColor, color: textColor }}
                  />
                </div>
              ) : (
                <button
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setAddingCardCol(col.id)}
                  className="mt-1 flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg transition-colors"
                  style={{ color: mutedColor }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.backgroundColor = cardBg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add card
                </button>
              )}
            </div>
          ))}

          {/* Add column */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => updateColumns(cols => [...cols, {
              id: uid(),
              title: 'New',
              color: COL_COLORS[cols.length % COL_COLORS.length] ?? COL_COLORS[0]!,
              cards: [],
            }])}
            className="self-start mt-5 w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0"
            style={{ color: mutedColor }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.backgroundColor = cardBg; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            title="Add column"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
