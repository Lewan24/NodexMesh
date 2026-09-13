import { useCardAppearance } from '../shared/cardAppearance';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { BoardItem, TextItem } from '@/entities/board/types';

import { DEFAULT_TEXT_CARD_WIDTH, TEXT_SIZE_STYLES } from '@/features/blocks/text/utils/textUtils';
import { getTypographyStyle } from '../typography/typographyUtils';

interface TextBlockProps {
  item: TextItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  fillWidth?: boolean;
}

export default function TextBlock({ item, onUpdate, fillWidth = false }: TextBlockProps) {
  const [editing, setEditing] = useState(false);

  const typographyStyle = getTypographyStyle(item);

  const verticalAlign = item.typography?.verticalAlign ?? 'top';

  const verticalJustify =
    verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    const textarea = inputRef.current;
    if (!editing || !textarea) return;
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [editing, item.content, item.width, item.typography?.fontSize, item.typography?.fontFamily]);

  const update = useCallback(
    (patch: Partial<TextItem>) => {
      onUpdate((current) => {
        if (current.type !== 'text') {
          return current;
        }

        return { ...current, ...patch };
      });
    },
    [onUpdate],
  );

  const isCard = Boolean(item.color || item.colorRole || item.gradient);

  const { background, light } = useCardAppearance(item.color, item.gradient, item.colorRole);

  const textColor = isCard ? (light ? '#1e293b' : '#f1f5f9') : 'var(--color-text-primary)';

  const mutedColor = isCard ? (light ? 'rgba(30,41,59,0.4)' : 'rgba(241,245,249,0.4)') : 'var(--color-text-faint)';

  const cardWidth = item.width ?? DEFAULT_TEXT_CARD_WIDTH;

  const finishEditing = useCallback(() => {
    setEditing(false);
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape' || (event.key === 'Enter' && (event.ctrlKey || event.metaKey))) {
      setEditing(false);
    }
  }, []);

  return (
    <div
      className="group relative"
      style={{ minWidth: 140, width: isCard || fillWidth || item.width ? cardWidth : undefined, height: item.height }}
    >
      <div
        className="transition-all duration-150 item-rounded flex flex-col"
        style={
          isCard
            ? {
                background,
                padding: '14px 18px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                height: item.height ? '100%' : undefined,
              }
            : { padding: 12, height: item.height ? '100%' : undefined }
        }
      >
        {/* Top accent */}

        {isCard && item.topColor && (
          <div style={{ height: 5, backgroundColor: item.topColor, margin: '-14px -18px 8px' }} />
        )}

        <div
          className="flex flex-col"
          style={{ height: item.height ? '100%' : undefined, justifyContent: verticalJustify }}
        >
          {/* Text */}

          {editing ? (
            <textarea
              aria-label="Text content"
              rows={1}
              ref={inputRef}
              value={item.content}
              onChange={(event) => update({ content: event.target.value })}
              onBlur={finishEditing}
              onKeyDown={handleKeyDown}
              onMouseDown={(event) => event.stopPropagation()}
              className={`bg-transparent resize-none outline-none leading-tight ${
                item.typography?.fontSize ? '' : TEXT_SIZE_STYLES[item.size]
              }`}
              style={{
                minWidth: 80,
                width: '100%',
                color: textColor,
                caretColor: 'var(--color-accent)',

                ...typographyStyle,

                fontSize: item.typography?.fontSize ? `${item.typography.fontSize}px` : undefined,
              }}
            />
          ) : (
            <span
              className={`block leading-tight select-none cursor-text ${
                item.typography?.fontSize ? '' : TEXT_SIZE_STYLES[item.size]
              } ${isCard ? 'whitespace-pre-wrap break-words' : 'whitespace-pre-wrap break-words'}`}
              style={{
                color: item.content ? textColor : mutedColor,

                ...typographyStyle,
              }}
              onDoubleClick={() => setEditing(true)}
            >
              {item.content || 'Text'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
