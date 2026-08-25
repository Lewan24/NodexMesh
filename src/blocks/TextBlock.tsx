import { useState, useRef, useEffect } from 'react';
import type { TextItem, BoardItem } from '../types';

const SIZE_STYLES: Record<TextItem['size'], string> = {
  sm: 'text-sm font-normal',
  md: 'text-base font-medium',
  lg: 'text-2xl font-bold',
  xl: 'text-4xl font-extrabold',
};

const SIZE_LABELS: TextItem['size'][] = ['sm', 'md', 'lg', 'xl'];

function isLight(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

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

  // When a background color is set (via the edit bar), render as a card
  // for better readability. With no color, it stays a bare heading.
  const isCard = !!item.color;
  const light = isCard && item.color ? isLight(item.color) : true;
  const textColor = isCard ? (light ? '#1e293b' : '#f1f5f9') : 'var(--color-text-primary)';
  const mutedColor = isCard ? (light ? 'rgba(30,41,59,0.4)' : 'rgba(241,245,249,0.4)') : 'var(--color-text-faint)';

  return (
    <div
      className="group relative"
      style={{ minWidth: 140 }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div
        className="transition-all duration-150"
        style={isCard ? {
          backgroundColor: item.color,
          borderRadius: 16,
          padding: '14px 18px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        } : { padding: 12 }}
      >
        {/* Top accent strip */}
        {isCard && item.topColor && (
          <div
            style={{
              height: 5, backgroundColor: item.topColor,
              margin: '-14px -18px 12px', borderRadius: '16px 16px 0 0',
            }}
          />
        )}

        {editing ? (
          <input
            ref={inputRef}
            value={item.content}
            onChange={e => update({ content: e.target.value })}
            onBlur={() => setEditing(false)}
            onKeyDown={e => (e.key === 'Enter' || e.key === 'Escape') && setEditing(false)}
            onMouseDown={e => e.stopPropagation()}
            className={`bg-transparent outline-none leading-tight ${SIZE_STYLES[item.size]}`}
            style={{ minWidth: 80, width: '100%', color: textColor, caretColor: 'var(--color-accent)' }}
          />
        ) : (
          <span
            className={`block leading-tight select-none cursor-text ${SIZE_STYLES[item.size]} ${isCard ? '' : 'text-nowrap'}`}
            style={{ color: item.content ? textColor : mutedColor, whiteSpace: isCard ? 'pre-wrap' : 'nowrap' }}
            onDoubleClick={() => setEditing(true)}
          >
            {item.content || 'Text'}
          </span>
        )}
      </div>

      {/* Floating controls */}
      {showControls && !editing && (
        <div
          className="relative flex items-center gap-1 z-20"
          style={{ marginTop: isCard ? 6 : 2 }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div
            className="flex items-center gap-1 px-1 py-1 rounded-lg"
            style={{ backgroundColor: 'var(--color-surface-translucent)', border: '1px solid var(--color-border)', animation: 'slide-up 0.15s ease forwards' }}
          >
            {SIZE_LABELS.map(s => (
              <button
                key={s}
                onClick={() => update({ size: s })}
                className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider transition-all duration-100"
                style={{
                  backgroundColor: item.size === s ? 'var(--color-accent)' : 'transparent',
                  color: item.size === s ? 'white' : 'var(--color-text-muted)',
                }}
              >
                {s}
              </button>
            ))}
            <button
              onClick={onDelete}
              className="ml-1 transition-colors"
              style={{ color: 'var(--color-text-faint)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-danger-strong)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--color-text-faint)'; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
