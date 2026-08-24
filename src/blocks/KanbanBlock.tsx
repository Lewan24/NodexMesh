import { useState } from 'react';
import type { KanbanItem, KanbanColumn, KanbanCard, BoardItem } from '../types';

const uid = () => Math.random().toString(36).slice(2, 9);
const COL_COLORS = ['#5a8a94', '#FFBD65', '#7C3AED', '#02A0A0', '#FF6B8A', '#059669'];
const DEFAULT_BG = '#08171d';

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 155;
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  card: KanbanCard;
  colIndex: number;
  totalCols: number;
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
  onMoveLeft: () => void;
  onMoveRight: () => void;
}

function CardItem({
  card, colIndex, totalCols, textColor, mutedColor, doneColor, cardBg, cardBorder, cardBorderHover, accentColor,
  onToggle, onDelete, onEdit, onMoveLeft, onMoveRight,
}: CardProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(card.text);
  const commit = () => { onEdit(text); setEditing(false); };

  return (
    <div
      className="group/card flex items-start gap-2 rounded-xl px-2.5 py-2 mb-1.5 border transition-all duration-150"
      style={{ backgroundColor: cardBg, borderColor: cardBorder }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = cardBorderHover)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = cardBorder)}
    >
      <button
        onMouseDown={e => e.stopPropagation()}
        onClick={onToggle}
        className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 border-2 flex items-center justify-center transition-all duration-200"
        style={{ backgroundColor: card.done ? accentColor : 'transparent', borderColor: card.done ? accentColor : mutedColor }}
      >
        {card.done && (
          <svg viewBox="0 0 10 10" fill="none" width="8" height="8">
            <path d="M2 5.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {editing ? (
        <input
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none"
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
          className="flex-1 text-sm leading-snug select-none cursor-text transition-colors"
          style={{ color: card.done ? doneColor : textColor, textDecoration: card.done ? 'line-through' : 'none' }}
        >
          {card.text}
        </span>
      )}

      {/* Action buttons (visible on hover) */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0"
        onMouseDown={e => e.stopPropagation()}
      >
        {colIndex > 0 && (
          <button
            onClick={onMoveLeft}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: mutedColor }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; }}
            title="Move to previous column"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}
        {colIndex < totalCols - 1 && (
          <button
            onClick={onMoveRight}
            className="w-5 h-5 flex items-center justify-center rounded transition-colors"
            style={{ color: mutedColor }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; }}
            title="Move to next column"
          >
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}
        <button
          onClick={onDelete}
          className="w-5 h-5 flex items-center justify-center rounded transition-colors"
          style={{ color: mutedColor }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF6B8A'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = mutedColor; }}
          title="Delete card"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
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
}

export default function KanbanBlock({ item, onUpdate, onDelete }: Props) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [addingCardCol, setAddingCardCol] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState('');

  const bg = item.color ?? DEFAULT_BG;
  const light = isLight(bg);
  const textColor = light ? '#1e293b' : '#ffffff';
  const mutedColor = light ? '#64748b' : '#5a8a94';
  const doneColor = light ? 'rgba(30,41,59,0.4)' : '#3a6070';
  const cardBg = light ? 'rgba(0,0,0,0.05)' : 'rgba(7,19,23,0.5)';
  const cardBorder = light ? 'rgba(0,0,0,0.08)' : '#1a3040';
  const cardBorderHover = light ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.35)';
  const trackBg = light ? 'rgba(0,0,0,0.08)' : '#1a3040';
  const borderColor = light ? 'rgba(0,0,0,0.1)' : '#1a3040';
  const accentColor = 'var(--color-accent)';

  const updateKanban = (patch: Partial<KanbanItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));
  const updateColumns = (fn: (cols: KanbanColumn[]) => KanbanColumn[]) =>
    updateKanban({ columns: fn(item.columns) });

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

  const moveCard = (fromColId: string, cardId: string, dir: -1 | 1) => {
    const fromIdx = item.columns.findIndex(c => c.id === fromColId);
    const toIdx = fromIdx + dir;
    if (toIdx < 0 || toIdx >= item.columns.length) return;
    updateColumns(cols => {
      const next = cols.map(c => ({ ...c, cards: [...c.cards] }));
      const fromCol = next[fromIdx];
      const toCol = next[toIdx];
      if (!fromCol || !toCol) return cols;
      const card = fromCol.cards.find(c => c.id === cardId);
      if (!card) return cols;
      fromCol.cards = fromCol.cards.filter(c => c.id !== cardId);
      toCol.cards = [...toCol.cards, card];
      return next;
    });
  };

  const totalCards = item.columns.reduce((acc, col) => acc + col.cards.length, 0);
  const doneCards = item.columns.reduce((acc, col) => acc + col.cards.filter(c => c.done).length, 0);

  return (
    <div className="group relative">
      <div className="rounded-2xl border shadow-xl overflow-visible" style={{ backgroundColor: bg, borderColor }}>
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
                <span className="text-[10px] font-mono" style={{ color: mutedColor }}>{doneCards}/{totalCards}</span>
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Columns */}
        <div className="flex p-3 gap-2">
          {item.columns.map((col, colIdx) => (
            <div key={col.id} className="flex flex-col group/col" style={{ width: 172 }}>
              {/* Column header — editable */}
              <div className="flex items-center gap-1.5 mb-2.5 group/colhdr">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: col.color }} />
                {editingColId === col.id ? (
                  <input
                    autoFocus
                    className="flex-1 text-[10px] font-bold uppercase tracking-widest bg-transparent outline-none border-b"
                    style={{ color: col.color, borderColor: col.color + '80' }}
                    value={col.title}
                    onChange={e => updateColumns(cols => cols.map(c => c.id === col.id ? { ...c, title: e.target.value } : c))}
                    onBlur={() => setEditingColId(null)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditingColId(null)}
                    onMouseDown={e => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 text-[10px] font-bold uppercase tracking-widest select-none cursor-text"
                    style={{ color: col.color }}
                    onDoubleClick={() => setEditingColId(col.id)}
                    title="Double-click to rename"
                  >
                    {col.title}
                  </span>
                )}
                <span className="ml-auto text-[10px] font-mono flex-shrink-0" style={{ color: mutedColor }}>{col.cards.length}</span>
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
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex-1" style={{ minHeight: 40 }}>
                {col.cards.map(card => (
                  <CardItem
                    key={card.id}
                    card={card}
                    colIndex={colIdx}
                    totalCols={item.columns.length}
                    textColor={textColor}
                    mutedColor={mutedColor}
                    doneColor={doneColor}
                    cardBg={cardBg}
                    cardBorder={cardBorder}
                    cardBorderHover={cardBorderHover}
                    accentColor={accentColor}
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
                    onMoveLeft={() => moveCard(col.id, card.id, -1)}
                    onMoveRight={() => moveCard(col.id, card.id, 1)}
                  />
                ))}
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
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
