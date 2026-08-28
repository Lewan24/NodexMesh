import { useCallback, useEffect, useRef, useState } from 'react';

import type { BoardItem, NoteItem } from '@/entities/board/types';

import {
  isLightColor,
  NOTE_FONT_SIZE_CLASS,
  type NoteFontSize,
} from '@/features/blocks/note/utils/noteUtils';

interface NoteBlockProps {
  item: NoteItem;
  zoom?: number;
  isSelected: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
}

export default function NoteBlock({
  item,
  isSelected,
  onUpdate,
  onDelete,
}: NoteBlockProps) {
  const [editing, setEditing] = useState(!item.content);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const light = isLightColor(item.color);

  const textColor = light ? '#1e293b' : '#e8f4f4';
  const mutedColor = light
    ? 'rgba(30,41,59,0.4)'
    : 'rgba(232,244,244,0.4)';

  const fontSize: NoteFontSize = item.fontSize ?? 'base';

  const update = useCallback(
    (patch: Partial<NoteItem>) => {
      onUpdate(current => {
        if (current.type !== 'note') return current;

        return {
          ...current,
          ...patch,
        };
      });
    },
    [onUpdate],
  );

  /*
   * Selection controls edit mode.
   */

  useEffect(() => {
    setEditing(isSelected);
  }, [isSelected]);

  /*
   * Auto-grow only while no fixed/manual height exists.
   */

  const resizeTextarea = useCallback(() => {
    if (item.height) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [item.height]);

  useEffect(() => {
    if (!editing) return;

    resizeTextarea();
    textareaRef.current?.focus();
  }, [editing, resizeTextarea]);

  useEffect(() => {
    resizeTextarea();
  }, [item.content, resizeTextarea]);

  return (
    <div
      className="group relative"
      style={{
        width: item.width ?? 220,
        height: item.height,
      }}
    >
      <div
        className="rounded-2xl shadow-xl overflow-hidden transition-shadow duration-150 group-hover:shadow-2xl flex flex-col"
        style={{
          height: item.height ? '100%' : undefined,
          backgroundColor: item.color,
          outline: isSelected
            ? '2px solid var(--color-accent)'
            : 'none',
          outlineOffset: 3,
        }}
      >
        {/* Top accent */}

        {item.topColor && (
          <div
            style={{
              height: 5,
              backgroundColor: item.topColor,
            }}
          />
        )}

        {/* Header */}

        <div className="flex items-center justify-between px-3 pt-2.5 pb-0 cursor-grab active:cursor-grabbing">
          {item.height && (
            <button
              onMouseDown={event => event.stopPropagation()}
              onClick={() =>
                update({
                  height: undefined,
                })
              }
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5"
              style={{ color: mutedColor }}
              title="Reset to auto height"
            >
              Auto-fit
            </button>
          )}

          <button
            onMouseDown={event => event.stopPropagation()}
            onClick={onDelete}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1 hover:bg-black/10"
            style={{ color: mutedColor }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}

        <div
          ref={contentRef}
          className="px-3 pb-3 pt-1 flex-1 min-h-0"
          style={{
            overflowY: item.height
              ? 'auto'
              : undefined,
          }}
        >
          {editing ? (
            <textarea
              ref={textareaRef}
              value={item.content}
              onChange={event => {
                update({
                  content: event.target.value,
                });

                resizeTextarea();
              }}
              onMouseDown={event => event.stopPropagation()}
              onBlur={() => setEditing(false)}
              onKeyDown={event => {
                /*
                 * Enter is intentionally preserved,
                 * since notes are multiline.
                 */
                if (event.key === 'Escape') {
                  event.currentTarget.blur();
                  setEditing(false);
                }
              }}
              className={`w-full bg-transparent resize-none outline-none leading-relaxed ${
                item.height ? 'overflow-y-auto h-full' : 'overflow-hidden'
              } ${NOTE_FONT_SIZE_CLASS[fontSize]}`}
              style={{
                color: textColor,
                minHeight: item.height ? undefined : 52,
                textAlign: item.textAlign ?? 'left',
                fontWeight: item.bold ? 700 : 400,
                fontStyle: item.italic ? 'italic' : 'normal',
              }}
              placeholder="Type your note…"
              rows={1}
            />
          ) : (
            <div
              onClick={() => setEditing(true)}
              className={`leading-relaxed whitespace-pre-wrap cursor-text select-none ${NOTE_FONT_SIZE_CLASS[fontSize]}`}
              style={{
                color: item.content ? textColor : mutedColor,
                minHeight: item.height ? undefined : 52,
                textAlign: item.textAlign ?? 'left',
                fontWeight: item.bold ? 700 : 400,
                fontStyle: item.italic ? 'italic' : 'normal',
              }}
            >
              {item.content || 'Click to edit…'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}