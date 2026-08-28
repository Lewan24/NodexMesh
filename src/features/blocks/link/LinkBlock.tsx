import { useCallback, useState } from 'react';

import type { BoardItem, LinkItem } from '@/entities/board/types';

import {
  DEFAULT_LINK_BACKGROUND,
  getLinkDomain,
  isLightColor,
} from '@/features/blocks/link/utils/linkUtils';

interface LinkBlockProps {
  item: LinkItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
}

export default function LinkBlock({
  item,
  onUpdate,
  onDelete,
}: LinkBlockProps) {
  const [editing, setEditing] = useState(
    !item.url || item.url === 'https://',
  );

  const background = item.color ?? DEFAULT_LINK_BACKGROUND;
  const light = isLightColor(background);

  const textColor = light ? '#1e293b' : '#e2e8f0';
  const mutedColor = light ? '#64748b' : '#5a8a94';

  const borderBase = light ? 'rgba(0,0,0,0.1)' : '#1a3040';
  const borderHover = light
    ? 'rgba(124, 58, 237,0.5)'
    : 'rgba(124, 58, 237,0.4)';

  const accentBackground = light ? '#f0fdf4' : '#112028';
  const inputBackground = light ? '#f8fafc' : '#071317';
  const inputBorder = light ? 'rgba(0,0,0,0.12)' : '#1a3040';

  const width = item.width ?? 260;

  const update = useCallback(
    (patch: Partial<LinkItem>) => {
      onUpdate(current => {
        if (current.type !== 'link') return current;

        return {
          ...current,
          ...patch,
        };
      });
    },
    [onUpdate],
  );

  const domain = getLinkDomain(item.url);

  const closeEditing = useCallback(() => {
    setEditing(false);
  }, []);

  const handleEditorKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        setEditing(false);
      }
    },
    [],
  );

  return (
    <div
      className="group relative transition-all duration-200 hover:shadow-2xl"
      style={{ 
        width,
        height: item.height,
       }}
    >
      <div
        className="rounded-2xl border shadow-xl overflow-hidden transition-colors duration-150"
        style={{
          height: item.height
          ? '100%'
          : undefined,
          backgroundColor: background,
          borderColor: borderBase,
        }}
        onMouseEnter={event => {
          event.currentTarget.style.borderColor = borderHover;
        }}
        onMouseLeave={event => {
          event.currentTarget.style.borderColor = borderBase;
        }}
      >
        {/* Top accent */}

        {item.topColor ? (
          <div
            style={{
              height: 5,
              backgroundColor: item.topColor,
            }}
          />
        ) : (
          <div className="h-0.5 bg-gradient-to-r from-[#7C3AED] to-[#FFBD65]" />
        )}

        <div className="p-4">
          {/* Domain row */}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{
                  backgroundColor: accentBackground,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7C3AED"
                  strokeWidth="2"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
              </div>

              <span
                className="text-[11px] truncate"
                style={{
                  color: mutedColor,
                  maxWidth: 110,
                }}
              >
                {domain}
              </span>
            </div>

            {/* Actions */}

            <div
              className="flex items-center gap-1.5"
              onMouseDown={event => event.stopPropagation()}
            >
              <button
                onClick={() => setEditing(previous => !previous)}
                className="opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: mutedColor }}
                onMouseEnter={event => {
                  event.currentTarget.style.color = '#7C3AED';
                }}
                onMouseLeave={event => {
                  event.currentTarget.style.color = mutedColor;
                }}
                title="Edit link"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
                </svg>
              </button>

              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-all"
                style={{ color: mutedColor }}
                onMouseEnter={event => {
                  event.currentTarget.style.color = '#FF6B8A';
                }}
                onMouseLeave={event => {
                  event.currentTarget.style.color = mutedColor;
                }}
                title="Delete link"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Editor */}

          {editing ? (
            <div
              className="space-y-2"
              onMouseDown={event => event.stopPropagation()}
              onBlur={event => {
                /*
                 * Tabbing between url/title/description
                 * should not close the editor.
                 */
                if (
                  !event.currentTarget.contains(
                    event.relatedTarget as Node | null,
                  )
                ) {
                  closeEditing();
                }
              }}
            >
              <input
                autoFocus
                value={item.url}
                onChange={event =>
                  update({
                    url: event.target.value,
                  })
                }
                onKeyDown={handleEditorKeyDown}
                placeholder="https://…"
                className="w-full text-sm px-2.5 py-1.5 rounded-xl outline-none border focus:border-[#7C3AED] transition-colors"
                style={{
                  backgroundColor: inputBackground,
                  color: textColor,
                  borderColor: '#7C3AED',
                  caretColor: '#7C3AED',
                }}
              />

              <input
                value={item.title}
                onChange={event =>
                  update({
                    title: event.target.value,
                  })
                }
                onKeyDown={handleEditorKeyDown}
                placeholder="Title"
                className="w-full text-sm px-2.5 py-1.5 rounded-xl outline-none border transition-colors"
                style={{
                  backgroundColor: inputBackground,
                  color: textColor,
                  borderColor: inputBorder,
                }}
              />

              <textarea
                value={item.description}
                onChange={event =>
                  update({
                    description: event.target.value,
                  })
                }
                onKeyDown={event => {
                  if (event.key === 'Escape') setEditing(false);
                }}
                placeholder="Description"
                rows={3}
                className="w-full text-xs px-2.5 py-1.5 rounded-xl outline-none border transition-colors resize-none"
                style={{
                  backgroundColor: inputBackground,
                  color: mutedColor,
                  borderColor: inputBorder,
                }}
              />
            </div>
          ) : (
            <div>
              <h4
                className="text-sm font-semibold leading-snug mb-1"
                style={{ color: textColor }}
              >
                {item.title || 'Untitled link'}
              </h4>

              {item.description && (
                <p
                  className="text-xs leading-relaxed mb-2"
                  style={{ color: mutedColor }}
                >
                  {item.description}
                </p>
              )}

              {item.url && item.url !== 'https://' && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseDown={event => event.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[#7C3AED] text-xs hover:text-[#FFBD65] transition-colors"
                >
                  Open link

                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}