import { useEffect, useState } from 'react';

import type { KanbanCard } from '@/entities/board/types';

interface KanbanCardItemProps {
  card: KanbanCard;
  isDragging: boolean;
  textColor: string;
  mutedColor: string;
  doneColor: string;
  cardBackground: string;
  cardBorder: string;
  cardBorderHover: string;
  accentColor: string;
  textStyle?: React.CSSProperties;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
  onDragHandleMouseDown: (event: React.MouseEvent) => void;
}

export default function KanbanCardItem({
  card,
  isDragging,
  textColor,
  mutedColor,
  doneColor,
  cardBackground,
  cardBorder,
  cardBorderHover,
  accentColor,
  textStyle,
  onToggle,
  onDelete,
  onEdit,
  onDragHandleMouseDown,
}: KanbanCardItemProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(card.text);

  /*
   * Jeśli tekst karty zmieni się z zewnątrz,
   * lokalny input nie powinien zostać ze starą wartością.
   */
  useEffect(() => {
    if (!editing) {
      setText(card.text);
    }
  }, [card.text, editing]);

  const commit = () => {
    const nextText = text.trim();

    if (nextText && nextText !== card.text) {
      onEdit(nextText);
    } else {
      setText(card.text);
    }

    setEditing(false);
  };

  return (
    <div
      className="group/card flex items-center gap-1.5 item-rounded px-2 py-2 mb-1.5 border transition-all duration-150"
      style={{
        backgroundColor: cardBackground,
        borderColor: cardBorder,
        opacity: isDragging ? 0.35 : 1,
      }}
      onMouseEnter={event => {
        event.currentTarget.style.borderColor = cardBorderHover;
      }}
      onMouseLeave={event => {
        event.currentTarget.style.borderColor = cardBorder;
      }}
    >
      {/* Drag handle */}

      <div
        onMouseDown={onDragHandleMouseDown}
        className="py-2 px-4 mr-[-2px] flex-shrink-0 cursor-grab active:cursor-grabbing transition-opacity flex flex-col items-center justify-center gap-[3px] mt-1 rounded-md hover:ring-1"
        style={{
          width: 20,
          color: mutedColor,
        }}
        title="Drag to reorder or move to another column/board"
      >
        {[0, 1, 2].map(index => (
          <div key={index} className="flex gap-1">
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'currentColor' }} />
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: 'currentColor' }} />
          </div>
        ))}
      </div>

      {/* Done toggle */}

      <button
        onMouseDown={event => event.stopPropagation()}
        onClick={onToggle}
        className="w-4 h-4 rounded-full mt-0.5 flex-shrink-0 border-2 flex items-center justify-center transition-all duration-200"
        style={{
          backgroundColor: card.done ? accentColor : 'transparent',
          borderColor: card.done ? accentColor : mutedColor,
        }}
      >
        {card.done && (
          <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
            <path
              d="M2 5.5l2 2 4-4"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>

      {/* Text */}

      {editing ? (
        <input
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ 
            color: textColor,
            ...textStyle
          }}
          value={text}
          onChange={event => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === 'Escape') {
              commit();
            }
          }}
          onMouseDown={event => event.stopPropagation()}
        />
      ) : (
        <span
          onDoubleClick={() => setEditing(true)}
          className="flex-1 min-w-0 text-sm leading-snug select-none cursor-text transition-colors"
          style={{
            color: card.done ? doneColor : textColor,
            textDecoration: card.done ? 'line-through' : 'none',
            ...textStyle
          }}
        >
          {card.text}
        </span>
      )}

      {/* Delete */}

      <button
        onClick={onDelete}
        className="opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0"
        style={{ color: mutedColor }}
        onMouseDown={event => event.stopPropagation()}
        onMouseEnter={event => {
          event.currentTarget.style.color = '#FF6B8A';
        }}
        onMouseLeave={event => {
          event.currentTarget.style.color = mutedColor;
        }}
        title="Delete card"
      >
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}