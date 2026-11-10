import { ITEM_WIDTH } from '@/features/canvas/constants';
import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { getSectionStyle } from '@/features/blocks/typography/sectionTypography';
import { useCardAppearance } from '../shared/cardAppearance';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import type { BoardItem, NoteItem } from '@/entities/board/types';

import { NOTE_FONT_SIZE_CLASS, type NoteFontSize } from '@/features/blocks/note/utils/noteUtils';
import { getTypographyStyle } from '../typography/typographyUtils';

import NoteContent from './noteContent';
import './noteRichText.css';
const NoteRichEditor = lazy(() => import('./NoteRichEditor'));

interface NoteBlockProps {
  readOnly?: boolean;
  item: NoteItem;
  zoom?: number;
  isSelected: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
}

export default function NoteBlock({ item, isSelected, onUpdate, onDelete, readOnly = false }: NoteBlockProps) {
  useTranslation();
  const [editing, setEditing] = useState(false);
  const typographyStyle = {
    ...getTypographyStyle(item),
    ...(item.dispenserId && !item.typography?.textAlign ? { textAlign: 'center' as const } : {}),
  };

  const noteRef = useRef<HTMLDivElement>(null);

  const { background, textColor, mutedColor } = useCardAppearance(
    item.color,
    item.gradient,
    item.colorRole,
    item.backgroundOpacity,
  );

  const fontSize: NoteFontSize = item.fontSize ?? 'base';

  const verticalAlign = item.typography?.verticalAlign ?? (item.dispenserId ? 'middle' : 'top');

  const verticalJustify =
    verticalAlign === 'middle' ? 'center' : verticalAlign === 'bottom' ? 'flex-end' : 'flex-start';

  const update = useCallback(
    (patch: Partial<NoteItem>) => {
      onUpdate((current) => {
        if (current.type !== 'note') return current;

        return { ...current, ...patch };
      });
    },
    [onUpdate],
  );

  /*
   * Deselecting ends editing; selecting only prepares the note for moving.
   */

  useEffect(() => {
    if (!isSelected) setEditing(false);
  }, [isSelected]);

  useEffect(() => {
    if (!editing) return;
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !noteRef.current?.contains(target) && !target.closest('dialog, [role="dialog"]'))
        setEditing(false);
    };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, [editing]);

  return (
    <div ref={noteRef} className="group relative" style={{ width: item.width ?? ITEM_WIDTH.note, height: item.height }}>
      <div
        className="item-rounded shadow-xl transition-shadow duration-150 group-hover:shadow-2xl flex flex-col"
        style={{
          height: item.height ? '100%' : undefined,
          background,
          outline: isSelected ? '2px solid var(--color-accent)' : 'none',
          outlineOffset: 3,
        }}
      >
        {/* Top accent */}

        {item.topColor && <div style={{ height: 5, background: item.topColor }} />}

        {/* Header */}

        {!editing && (
          <div className="absolute top-1 left-2 right-2 z-10 flex items-center justify-between pointer-events-none [&>button]:pointer-events-auto">
            {item.height && !item.locked && (
              <button
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => update({ height: undefined })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-semibold uppercase tracking-wide rounded-full px-1.5 py-0.5"
                style={{ color: mutedColor }}
                title={translate('Reset to auto height')}
              >
                {translate('Auto-fit')}
              </button>
            )}

            <button
              onMouseDown={(event) => event.stopPropagation()}
              onClick={onDelete}
              aria-label={translate('Delete')}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1 hover:bg-black/10"
              style={{ color: mutedColor }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}

        <div
          data-touch-content={!editing}
          data-wheel-scroll={item.height ? 'true' : 'false'}
          className={`p-3 flex-1 min-h-0 flex flex-col ${NOTE_FONT_SIZE_CLASS[fontSize]}`}
          style={{
            overflow: 'auto',
            justifyContent: editing ? 'flex-start' : verticalJustify,
            color: textColor,
            ...typographyStyle,
            ...getSectionStyle(item.typography, 'body'),
          }}
        >
          {editing ? (
            <Suspense fallback={<div role="status">{translate('Loading…')}</div>}>
              <NoteRichEditor
                item={item}
                onChange={(content) => update({ content, contentFormat: 'tiptap-html', contentVersion: 1 })}
                onDone={() => setEditing(false)}
              />
            </Suspense>
          ) : (
            <div
              onDoubleClick={() => {
                if (!readOnly) setEditing(true);
              }}
              className={`note-rich-text cursor-text select-none ${NOTE_FONT_SIZE_CLASS[fontSize]}`}
              style={{ color: textColor, ...typographyStyle, ...getSectionStyle(item.typography, 'body') }}
            >
              {item.content ? <NoteContent item={item} /> : translate('Double-click to edit…')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
