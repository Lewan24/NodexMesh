import { useCallback, useEffect, useRef, useState } from 'react';

import type { BoardItem, TextItem } from '@/entities/board/types';

import {
  DEFAULT_TEXT_CARD_WIDTH,
  isLightColor,
  TEXT_SIZE_STYLES,
} from '@/features/blocks/text/utils/textUtils';

interface TextBlockProps {
  item: TextItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  fillWidth?: boolean;
}

export default function TextBlock({
  item,
  onUpdate,
  fillWidth = false,
}: TextBlockProps) {
  const [editing, setEditing] = useState(
    !item.content || item.content === 'Heading',
  );

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  const update = useCallback(
    (patch: Partial<TextItem>) => {
      onUpdate(current => {
        if (current.type !== 'text') {
          return current;
        }

        return {
          ...current,
          ...patch,
        };
      });
    },
    [onUpdate],
  );

  const isCard = Boolean(item.color);

  const light =
    isCard && item.color
      ? isLightColor(item.color)
      : true;

  const textColor = isCard
    ? light
      ? '#1e293b'
      : '#f1f5f9'
    : 'var(--color-text-primary)';

  const mutedColor = isCard
    ? light
      ? 'rgba(30,41,59,0.4)'
      : 'rgba(241,245,249,0.4)'
    : 'var(--color-text-faint)';

  const cardWidth = item.width ?? DEFAULT_TEXT_CARD_WIDTH;

  const finishEditing = useCallback(() => {
    setEditing(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' || event.key === 'Escape') {
        setEditing(false);
      }
    },
    [],
  );

  return (
    <div
      className="group relative"
      style={{
        minWidth: 140,
        width:
          isCard ||
          fillWidth ||
          item.width
            ? cardWidth
            : undefined,
        height: item.height,
      }}
    >
      <div
        className="transition-all duration-150"
        style={
          isCard
            ? {
                backgroundColor: item.color,
                borderRadius: 16,
                padding: '14px 18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                height: item.height
                ? '100%'
                : undefined,
              }
            : {
                padding: 12,
                height: item.height
                ? '100%'
                : undefined,
              }
        }
      >
        {/* Top accent */}

        {isCard && item.topColor && (
          <div
            style={{
              height: 5,
              backgroundColor: item.topColor,
              margin: '-14px -18px 12px',
              borderRadius: '16px 16px 0 0',
            }}
          />
        )}

        {/* Text */}

        {editing ? (
          <input
            ref={inputRef}
            value={item.content}
            onChange={event =>
              update({
                content: event.target.value,
              })
            }
            onBlur={finishEditing}
            onKeyDown={handleKeyDown}
            onMouseDown={event => event.stopPropagation()}
            className={`bg-transparent outline-none leading-tight ${TEXT_SIZE_STYLES[item.size]}`}
            style={{
              minWidth: 80,
              width: '100%',
              color: textColor,
              caretColor: 'var(--color-accent)',
              textAlign: item.textAlign ?? 'left',
              fontWeight: item.bold ? 700 : 400,
              fontStyle: item.italic ? 'italic' : 'normal',
            }}
          />
        ) : (
          <span
            className={`block leading-tight select-none cursor-text ${
              TEXT_SIZE_STYLES[item.size]
            } ${isCard ? 'whitespace-pre-wrap break-words' : 'text-nowrap'}`}
            style={{
              color: item.content ? textColor : mutedColor,
              textAlign: item.textAlign ?? 'left',
              fontWeight: item.bold ? 700 : 400,
              fontStyle: item.italic ? 'italic' : 'normal',
            }}
            onDoubleClick={() => setEditing(true)}
          >
            {item.content || 'Text'}
          </span>
        )}
      </div>
    </div>
  );
}