import { useCallback, useState } from 'react';

import type { BoardItem, FrameItem } from '@/entities/board/types';

import { FRAME_COLORS } from '@/features/blocks/frame/utils/frameUtils';

interface FrameBlockProps {
  item: FrameItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onFitFrame: () => void;
}

export default function FrameBlock({
  item,
  onUpdate,
  onDelete,
  onFitFrame,
}: FrameBlockProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const update = useCallback(
    (patch: Partial<FrameItem>) => {
      onUpdate(current => {
        if (current.type !== 'frame') return current;

        return {
          ...current,
          ...patch,
        };
      });
    },
    [onUpdate],
  );

  const closeTitleEditing = useCallback(() => {
    setEditingTitle(false);
  }, []);

  const handleTitleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        setEditingTitle(false);
      }
    },
    [],
  );

  const selectColor = useCallback(
    (color: string) => {
      update({ color });
      setShowColorPicker(false);
    },
    [update],
  );

  return (
    <div
      className="group/frame"
      style={{
        width: item.width,
        height: item.height,
        pointerEvents: 'none',
      }}
    >
      {/* Frame background / border */}

      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          border: `2px solid ${item.color}50`,
          backgroundColor: `${item.color}70`,
          transition: 'border-color 0.15s, background-color 0.15s',
        }}
      />

      {/* Hover border */}

      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover/frame:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          border: `2px solid ${item.color}aa`,
          boxShadow: `0 0 0 1px ${item.color}20`,
        }}
      />

      {/* Toolbar above frame */}

      <div
        className="absolute flex items-center gap-1.5"
        style={{
          top: -32,
          left: 0,
          pointerEvents: 'auto',
        }}
      >
        {/* Drag handle + title */}

        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl cursor-grab active:cursor-grabbing"
          style={{
            backgroundColor: `${item.color}20`,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 8 8" fill="none">
            <circle cx="2" cy="2" r="1.2" fill={item.color} opacity="0.7" />
            <circle cx="6" cy="2" r="1.2" fill={item.color} opacity="0.7" />
            <circle cx="2" cy="6" r="1.2" fill={item.color} opacity="0.7" />
            <circle cx="6" cy="6" r="1.2" fill={item.color} opacity="0.7" />
          </svg>

          {editingTitle ? (
            <input
              autoFocus
              className="bg-transparent outline-none text-xs font-semibold"
              style={{
                color: item.color,
                minWidth: 60,
                maxWidth: 160,
              }}
              value={item.title}
              onChange={event => update({ title: event.target.value })}
              onBlur={closeTitleEditing}
              onKeyDown={handleTitleKeyDown}
              onMouseDown={event => event.stopPropagation()}
            />
          ) : (
            <span
              className="text-md font-semibold select-none cursor-text"
              style={{ color: item.color }}
              onDoubleClick={() => setEditingTitle(true)}
            >
              {item.title}
            </span>
          )}
        </div>

        {/* Fit to contents */}

        <button
          className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover/frame:opacity-100 transition-opacity text-[#5a8a94] hover:text-white"
          style={{
            pointerEvents: 'auto',
            backgroundColor: '#0d1e24',
            border: '1px solid #1a3040',
          }}
          title="Fit frame to contents"
          onClick={onFitFrame}
          onMouseDown={event => event.stopPropagation()}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>

        {/* Color picker */}

        <div className="relative" style={{ pointerEvents: 'auto' }}>
          <button
            className="w-4 h-4 rounded-full border-2 border-[#1a3040] opacity-0 group-hover/frame:opacity-100 transition-all hover:scale-110"
            style={{ backgroundColor: item.color }}
            onClick={() => setShowColorPicker(previous => !previous)}
            onMouseDown={event => event.stopPropagation()}
            title="Change frame color"
          />

          {showColorPicker && (
            <div
              className="absolute top-6 left-0 flex gap-1.5 p-2 rounded-xl border shadow-xl z-50"
              style={{
                backgroundColor: '#08171d',
                borderColor: '#1a3040',
              }}
              onMouseDown={event => event.stopPropagation()}
            >
              {FRAME_COLORS.map(color => (
                <button
                  key={color}
                  className="w-4 h-4 rounded-full border border-black/20 transition-transform hover:scale-125"
                  style={{
                    backgroundColor: color,
                    boxShadow: color === item.color ? '0 0 0 2px white' : 'none',
                  }}
                  onClick={() => selectColor(color)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Delete */}

        <button
          className="w-5 h-5 flex items-center justify-center rounded-lg text-[#3a6070] hover:text-[#FF6B8A] opacity-0 group-hover/frame:opacity-100 transition-all"
          style={{ pointerEvents: 'auto' }}
          onClick={onDelete}
          onMouseDown={event => event.stopPropagation()}
          title="Delete frame"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Size indicator */}

      <span
        className="absolute opacity-0 group-hover/frame:opacity-100 transition-opacity text-[9px] font-mono pointer-events-none"
        style={{
          bottom: -22,
          right: 0,
          color: `${item.color}88`,
        }}
      >
        {Math.round(item.width)} × {Math.round(item.height)}
      </span>
    </div>
  );
}