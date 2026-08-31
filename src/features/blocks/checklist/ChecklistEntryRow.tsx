import { useEffect, useRef, useState } from 'react';

import type { ChecklistEntry } from '@/entities/board/types';
import DragHandle from '../shared/DragHandle';

interface ChecklistEntryRowProps {
  entry: ChecklistEntry;
  isDragging: boolean;
  textColor: string;
  accentColor: string;
  onToggle: () => void;
  onDelete: () => void;
  onEdit: (text: string) => void;
  onDragHandleMouseDown: (event: React.MouseEvent) => void;
}

export default function ChecklistEntryRow({ entry, isDragging, textColor, accentColor, onToggle, onDelete, onEdit, onDragHandleMouseDown }: ChecklistEntryRowProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(entry.text);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (!editing) setText(entry.text);
  }, [entry.text, editing]);

  const commit = () => {
    const nextText = text.trim();

    if (nextText !== entry.text) {
      onEdit(nextText);
    }

    setEditing(false);
  };

  return (
    <div
      className="group/entry flex items-center gap-1 py-1"
      style={{ opacity: isDragging ? 0.35 : 1 }}
    >
      <DragHandle
        compact
        color={`${textColor}90`}
        title="Drag to reorder or move to another checklist"
        onMouseDown={onDragHandleMouseDown}
      />

      {/* Toggle */}
      <button
        onMouseDown={event => event.stopPropagation()}
        onClick={onToggle}
        className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all duration-200 border"
        style={{
          borderColor: entry.done ? accentColor : `${textColor}40`,
          backgroundColor: entry.done ? accentColor : 'transparent',
        }}
      >
        {entry.done && (
          <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
            <path
              d="M1.5 5l2.5 2.5 4.5-5"
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
          ref={inputRef}
          className="flex-1 bg-transparent outline-none text-sm min-w-0"
          style={{ color: textColor }}
          value={text}
          onChange={event => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === 'Escape') commit();
          }}
          onMouseDown={event => event.stopPropagation()}
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

      {/* Delete */}
      <button
        onMouseDown={event => event.stopPropagation()}
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