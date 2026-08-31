import { useCallback, useRef, useState } from 'react';

import type {
  BoardItem,
  KanbanCard,
  KanbanColumn,
  KanbanItem,
} from '@/entities/board/types';

import KanbanCardItem from '@/features/blocks/kanban/KanbanCardItem';

import {
  createKanbanCard,
  createKanbanColumn,
  DEFAULT_KANBAN_BACKGROUND,
  isLightColor,
} from '@/features/blocks/kanban/utils/kanbanUtils';

import { useKanbanDrag } from '@/features/blocks/kanban/hooks/useKanbanDrag';
import { getTypographyStyle } from '../typography/typographyUtils';

interface KanbanBlockProps {
  item: KanbanItem;
  zoom?: number;
  isSelected?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onCardDroppedOutside?: (
    card: KanbanCard,
    clientX: number,
    clientY: number,
  ) => void;
}

function DropLine() {
  return (
    <div
      className="h-1 rounded-full my-1"
      style={{
        backgroundColor: 'var(--color-accent)',
        boxShadow: '0 0 8px rgba(124,58,237,0.5)',
      }}
    />
  );
}

export default function KanbanBlock({
  item,
  onUpdate,
  onDelete,
  onCardDroppedOutside,
}: KanbanBlockProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [addingCardColumnId, setAddingCardColumnId] = useState<string | null>(null);
  const [newCardText, setNewCardText] = useState('');

  const typographyStyle = getTypographyStyle(item);
  const baseFontSize = item.typography?.fontSize;

  const boardRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cardRowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const columnsRef = useRef(item.columns);
  columnsRef.current = item.columns;

  const background = item.color ?? DEFAULT_KANBAN_BACKGROUND;

  const isLight = isLightColor(background);

  const textColor = isLight ? '#1e293b' : '#ffffff';
  const mutedColor = isLight ? '#64748b' : '#5a8a94';
  const doneColor = isLight ? 'rgba(30,41,59,0.4)' : '#3a6070';
  const cardBackground = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(7,19,23,0.5)';
  const cardBorder = isLight ? 'rgba(0,0,0,0.08)' : '#1a3040';
  const cardBorderHover = 'rgba(124,58,237,0.35)';
  const trackBackground = isLight ? 'rgba(0,0,0,0.08)' : '#1a3040';
  const borderColor = isLight ? 'rgba(0,0,0,0.1)' : '#1a3040';
  const accentColor = 'var(--color-accent)';

  const updateKanban = useCallback(
    (patch: Partial<KanbanItem>) => {
      onUpdate(current => {
        if (current.type !== 'kanban') return current;

        return {
          ...current,
          ...patch,
        };
      });
    },
    [onUpdate],
  );

  const updateColumns = useCallback(
    (updater: (columns: KanbanColumn[]) => KanbanColumn[]) => {
      updateKanban({
        columns: updater(columnsRef.current),
      });
    },
    [updateKanban],
  );

  const addCard = useCallback(
    (columnId: string) => {
      const text = newCardText.trim();
      if (!text) return;

      updateColumns(columns =>
        columns.map(column =>
          column.id === columnId
            ? {
                ...column,
                cards: [...column.cards, createKanbanCard(text)],
              }
            : column,
        ),
      );

      setNewCardText('');
      setAddingCardColumnId(null);
    },
    [newCardText, updateColumns],
  );

  const {
    draggingCardId,
    dropTarget,
    handleCardDragStart,
  } = useKanbanDrag({
    columns: item.columns,
    boardRef,
    columnRefs,
    cardRowRefs,
    updateColumns,
    onCardDroppedOutside,
  });

  const totalCards = item.columns.reduce(
    (total, column) => total + column.cards.length,
    0,
  );

  const doneCards = item.columns.reduce(
    (total, column) => total + column.cards.filter(card => card.done).length,
    0,
  );

  const toggleCard = useCallback(
    (columnId: string, cardId: string) => {
      updateColumns(columns =>
        columns.map(column =>
          column.id === columnId
            ? {
                ...column,
                cards: column.cards.map(card =>
                  card.id === cardId
                    ? {
                        ...card,
                        done: !card.done,
                      }
                    : card,
                ),
              }
            : column,
        ),
      );
    },
    [updateColumns],
  );

  const deleteCard = useCallback(
    (columnId: string, cardId: string) => {
      updateColumns(columns =>
        columns.map(column =>
          column.id === columnId
            ? {
                ...column,
                cards: column.cards.filter(card => card.id !== cardId),
              }
            : column,
        ),
      );
    },
    [updateColumns],
  );

  const editCard = useCallback(
    (columnId: string, cardId: string, text: string) => {
      updateColumns(columns =>
        columns.map(column =>
          column.id === columnId
            ? {
                ...column,
                cards: column.cards.map(card =>
                  card.id === cardId
                    ? {
                        ...card,
                        text,
                      }
                    : card,
                ),
              }
            : column,
        ),
      );
    },
    [updateColumns],
  );

  const deleteColumn = useCallback(
    (columnId: string) => {
      updateColumns(columns =>
        columns.filter(column => column.id !== columnId),
      );
    },
    [updateColumns],
  );

  const renameColumn = useCallback(
    (columnId: string, title: string) => {
      updateColumns(columns =>
        columns.map(column =>
          column.id === columnId
            ? {
                ...column,
                title,
              }
            : column,
        ),
      );
    },
    [updateColumns],
  );

  const addColumn = useCallback(() => {
    updateColumns(columns => [
      ...columns,
      createKanbanColumn(columns.length),
    ]);
  }, [updateColumns]);

  return (
    <div className="group relative" style={{
      width: item.width,
      height: item.height,
    }}>
      <div
        ref={boardRef}
        className="item-rounded border shadow-xl overflow-auto"
        style={{
          width: item.width
            ? '100%'
            : undefined,
          height: item.height
            ? '100%'
            : undefined,
          backgroundColor: background,
          borderColor,
        }}
      >
        {item.topColor && (
          <div
            style={{
              height: 5,
              backgroundColor: item.topColor,
              borderRadius: '16px 16px 0 0',
            }}
          />
        )}

        {/* Header */}

        <div
          className="flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing rounded-t-2xl"
          style={{
            backgroundColor: background,
            borderColor,
          }}
        >
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <input
                autoFocus
                className="bg-transparent font-semibold text-sm outline-none border-b"
                style={{
                  color: textColor,
                  borderColor: accentColor,
                  ...typographyStyle,
                  fontSize: baseFontSize
                    ? `${baseFontSize + 2}px`
                    : undefined,
                }}
                value={item.title}
                onChange={event =>
                  updateKanban({
                    title: event.target.value,
                  })
                }
                onBlur={() => setEditingTitle(false)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === 'Escape') {
                    setEditingTitle(false);
                  }
                }}
                onMouseDown={event => event.stopPropagation()}
              />
            ) : (
              <span
                className="font-semibold text-sm cursor-text select-none"
                style={{ 
                  ...typographyStyle,
                  color: textColor,
                  fontSize: baseFontSize
                    ? `${baseFontSize + 2}px`
                    : undefined, }}
                onDoubleClick={() => setEditingTitle(true)}
              >
                {item.title}
              </span>
            )}

            {totalCards > 0 && (
              <div className="flex items-center gap-1.5">
                <div
                  className="h-1 rounded-full overflow-hidden"
                  style={{
                    width: 48,
                    backgroundColor: trackBackground,
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(doneCards / totalCards) * 100}%`,
                      backgroundColor: accentColor,
                    }}
                  />
                </div>

                <span
                  className="text-[11px] font-mono"
                  style={{ color: mutedColor }}
                >
                  {doneCards}/{totalCards}
                </span>
              </div>
            )}
          </div>

          <button
            onMouseDown={event => event.stopPropagation()}
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-all"
            style={{ color: mutedColor }}
            onMouseEnter={event => {
              event.currentTarget.style.color = '#FF6B8A';
            }}
            onMouseLeave={event => {
              event.currentTarget.style.color = mutedColor;
            }}
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

        {/* Columns */}

        <div className="flex p-3 gap-2">
          {item.columns.map(column => (
            <div
              key={column.id}
              ref={element => {
                if (element) {
                  columnRefs.current.set(column.id, element);
                } else {
                  columnRefs.current.delete(column.id);
                }
              }}
              className="flex flex-col group/col"
              style={{ width: 180 }}
            >
              {/* Column header */}

              <div className="flex items-center gap-1.5 mb-2.5 group/colhdr">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: column.color }}
                />

                {editingColumnId === column.id ? (
                  <input
                    autoFocus
                    className="flex-1 text-[11px] font-bold uppercase tracking-widest bg-transparent outline-none border-b"
                    style={{
                      color: column.color,
                      borderColor: `${column.color}80`,
                      ...typographyStyle,
                      fontSize: baseFontSize
                        ? `${baseFontSize}px`
                        : undefined,
                    }}
                    value={column.title}
                    onChange={event =>
                      renameColumn(column.id, event.target.value)
                    }
                    onBlur={() => setEditingColumnId(null)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === 'Escape') {
                        setEditingColumnId(null);
                      }
                    }}
                    onMouseDown={event => event.stopPropagation()}
                  />
                ) : (
                  <span
                    className="flex-1 text-[11px] font-bold uppercase tracking-widest select-none cursor-text"
                    style={{ 
                      color: column.color,
                      ...typographyStyle,
                      fontSize: baseFontSize
                        ? `${baseFontSize}px`
                        : undefined, }}
                    onDoubleClick={() => setEditingColumnId(column.id)}
                    title="Double-click to rename"
                  >
                    {column.title}
                  </span>
                )}

                <span
                  className="ml-auto text-[11px] font-mono flex-shrink-0"
                  style={{ color: mutedColor }}
                >
                  {column.cards.length}
                </span>

                {item.columns.length > 1 && (
                  <button
                    onMouseDown={event => event.stopPropagation()}
                    onClick={() => deleteColumn(column.id)}
                    className="transition-all flex-shrink-0 ml-0.5"
                    style={{ color: mutedColor }}
                    onMouseEnter={event => {
                      event.currentTarget.style.color = '#FF6B8A';
                    }}
                    onMouseLeave={event => {
                      event.currentTarget.style.color = mutedColor;
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Cards */}

              <div
                className="flex-1 rounded-lg transition-colors"
                style={{
                  minHeight: 40,
                  backgroundColor:
                    dropTarget?.columnId === column.id && draggingCardId
                      ? 'rgba(124,58,237,0.06)'
                      : 'transparent',
                  outline:
                    dropTarget?.columnId === column.id && draggingCardId
                      ? '1.5px dashed rgba(124,58,237,0.4)'
                      : 'none',
                  outlineOffset: -2,
                }}
              >
                {column.cards.map((card, index) => (
                  <div key={card.id}>
                    {dropTarget?.columnId === column.id &&
                      dropTarget.index === index &&
                      draggingCardId &&
                      draggingCardId !== card.id && <DropLine />}

                    <div
                      ref={element => {
                        if (element) {
                          cardRowRefs.current.set(card.id, element);
                        } else {
                          cardRowRefs.current.delete(card.id);
                        }
                      }}
                    >
                      <KanbanCardItem
                        card={card}
                        isDragging={draggingCardId === card.id}
                        textColor={textColor}
                        mutedColor={mutedColor}
                        doneColor={doneColor}
                        cardBackground={cardBackground}
                        cardBorder={cardBorder}
                        cardBorderHover={cardBorderHover}
                        accentColor={accentColor}
                        onDragHandleMouseDown={event =>
                          handleCardDragStart(column.id, card.id, event)
                        }
                        onToggle={() => toggleCard(column.id, card.id)}
                        onDelete={() => deleteCard(column.id, card.id)}
                        onEdit={text =>
                          editCard(column.id, card.id, text)
                        }
                        textStyle={{
                          ...typographyStyle,
                          fontSize: baseFontSize
                            ? `${baseFontSize}px`
                            : undefined,
                        }}
                      />
                    </div>
                  </div>
                ))}

                {dropTarget?.columnId === column.id &&
                  dropTarget.index === column.cards.length &&
                  draggingCardId && <DropLine />}
              </div>

              {/* Add card */}

              {addingCardColumnId === column.id ? (
                <div
                  className="mt-1"
                  onMouseDown={event => event.stopPropagation()}
                >
                  <input
                    autoFocus
                    value={newCardText}
                    onChange={event => setNewCardText(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') addCard(column.id);

                      if (event.key === 'Escape') {
                        setAddingCardColumnId(null);
                        setNewCardText('');
                      }
                    }}
                    onBlur={() => {
                      if (newCardText.trim()) {
                        addCard(column.id);
                      } else {
                        setAddingCardColumnId(null);
                        setNewCardText('');
                      }
                    }}
                    placeholder="Card title…"
                    className="w-full text-sm px-2.5 py-1.5 rounded-xl outline-none border transition-colors"
                    style={{
                      backgroundColor: cardBackground,
                      borderColor: accentColor,
                      color: textColor,
                    }}
                  />
                </div>
              ) : (
                <button
                  onMouseDown={event => event.stopPropagation()}
                  onClick={() => setAddingCardColumnId(column.id)}
                  className="mt-1 flex items-center gap-1.5 text-xs py-1.5 px-2 rounded-lg transition-colors"
                  style={{ color: mutedColor }}
                  onMouseEnter={event => {
                    event.currentTarget.style.color = accentColor;
                    event.currentTarget.style.backgroundColor = cardBackground;
                  }}
                  onMouseLeave={event => {
                    event.currentTarget.style.color = mutedColor;
                    event.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>

                  Add card
                </button>
              )}
            </div>
          ))}

          {/* Add column */}

          <button
            onMouseDown={event => event.stopPropagation()}
            onClick={addColumn}
            className="self-start mt-5 w-8 h-8 flex items-center justify-center rounded-xl transition-colors flex-shrink-0"
            style={{ color: mutedColor }}
            onMouseEnter={event => {
              event.currentTarget.style.color = accentColor;
              event.currentTarget.style.backgroundColor = cardBackground;
            }}
            onMouseLeave={event => {
              event.currentTarget.style.color = mutedColor;
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
            title="Add column"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}