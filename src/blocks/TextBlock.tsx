import { useState, useRef, useEffect } from 'react';
import type { TextItem, BoardItem } from '../types';

const SIZE_STYLES: Record<TextItem['size'], string> = {
  sm: 'text-sm font-normal text-[#8aacb8]',
  md: 'text-base font-medium text-white',
  lg: 'text-2xl font-bold text-white',
  xl: 'text-4xl font-extrabold text-white',
};

const SIZE_LABELS: TextItem['size'][] = ['sm', 'md', 'lg', 'xl'];

interface Props {
  item: TextItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
}

export default function TextBlock({ item, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(!item.content || item.content === 'Heading');
  const [showControls, setShowControls] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const update = (patch: Partial<TextItem>) => onUpdate(i => ({ ...i, ...patch } as BoardItem));

  return (
    <div
      className="group relative"
      style={{ minWidth: 140 }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div>
        {editing ? (
          <input
            ref={inputRef}
            value={item.content}
            onChange={e => update({ content: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditing(false)}
            onMouseDown={e => e.stopPropagation()}
            className={`bg-transparent outline-none leading-tight ${SIZE_STYLES[item.size]}`}
            style={{ minWidth: 80, caretColor: '#7C3AED' }}
          />
        ) : (
          <span
            className={`block leading-tight select-none cursor-text ${SIZE_STYLES[item.size]}`}
            onDoubleClick={() => setEditing(true)}
          >
            {item.content || 'Text'}
          </span>
        )}
      </div>

      {/* Floating controls */}
      {showControls && !editing && (
        <div
          className="absolute -bottom-7 left-0 flex items-center gap-1 z-20"
          onMouseDown={e => e.stopPropagation()}
          style={{ animation: 'slide-up 0.15s ease forwards' }}
        >
          {SIZE_LABELS.map(s => (
            <button
              key={s}
              onClick={() => update({ size: s })}
              className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider transition-all duration-100"
              style={{
                backgroundColor: item.size === s ? '#7C3AED' : '#112028',
                color: item.size === s ? 'white' : '#5a8a94',
              }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={onDelete}
            className="ml-1 text-[#3a6070] hover:text-[#FF6B8A] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
