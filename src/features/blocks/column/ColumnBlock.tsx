import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

import type { BoardItem, ColumnItem } from '@/entities/board/types';

import BlockRenderer from '@/features/blocks/BlockRenderer';
import ColumnItemRow from '@/features/blocks/column/ColumnItemRow';

import {
  COLUMN_ADD_TYPES,
  COLUMN_BG_COLORS,
  createDefaultColumnItem,
  isLightColor,
} from '@/features/blocks/column/utils/columnItems';

import { useColumnDrag } from '@/features/blocks/column/hooks/useColumnDrag';
import { getTypographyStyle } from '../typography/typographyUtils';

interface ColumnBlockProps {
  item: ColumnItem;
  isSelected?: boolean;
  isDragOver?: boolean;
  selectedItemId?: string | null;
  zoom?: number;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onEjectItem?: (ejectedItem: BoardItem, clientX?: number, clientY?: number) => void;
  onSelectColumnItem?: (item: BoardItem | null) => void;
  onRequestDelete?: (execute: () => void) => void;
}

function DropIndicator({ layout }: { layout: 'vertical' | 'horizontal' | 'grid' }) {
  if (layout === 'grid') {
    return (
      <div
        className="rounded-xl border-2 border-dashed"
        style={{
          minHeight: 80,
          borderColor: 'var(--color-accent)',
          backgroundColor: 'var(--color-accent-soft)',
          boxShadow: '0 0 12px rgba(124,58,237,0.18)',
        }}
      />
    );
  }

  if (layout === 'horizontal') {
    return (
      <div
        className="w-1 self-stretch rounded-full mx-1"
        style={{
          minHeight: 60,
          backgroundColor: 'var(--color-accent)',
          boxShadow: '0 0 8px rgba(124,58,237,0.5)',
        }}
      />
    );
  }

  return (
    <div
      className="h-1 rounded-full mx-1 my-1.5"
      style={{
        backgroundColor: 'var(--color-accent)',
        boxShadow: '0 0 8px rgba(124,58,237,0.5)',
      }}
    />
  );
}

export default function ColumnBlock({
  item,
  isSelected,
  isDragOver,
  zoom = 1,
  selectedItemId = null,
  onUpdate,
  onDelete,
  onEjectItem,
  onSelectColumnItem,
  onRequestDelete,
}: ColumnBlockProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);

  const typographyStyle = getTypographyStyle(item);

  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const backgroundMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showAddMenu && !showBackgroundMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Element;
      const outsideColumn = !containerRef.current?.contains(target);
      const outsideBackgroundMenu = !backgroundMenuRef.current?.contains(target);

      if (outsideColumn && outsideBackgroundMenu) {
        setShowAddMenu(false);
        setShowBackgroundMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showAddMenu, showBackgroundMenu]);

  const layout = item.layout ?? 'vertical';
  const gridColumns = item.gridColumns ?? 2;
  const gap = item.gap ?? 10;

  const isVertical = layout === 'vertical';
  const isHorizontal = layout === 'horizontal';
  const isGrid = layout === 'grid';

  const items = item.items ?? [];
  const columnContentWidth = item.width - 32;
  const nestedControlsWidth = 24 + 24 + 16;

  const getNestedItemWidth = (nestedItem: BoardItem) => {
    if (isVertical) {
      return Math.max(
        120,
        columnContentWidth - nestedControlsWidth,
      );
    }

    if (isHorizontal) {
      return Math.max(
        140,
        (nestedItem.width ?? 260) - nestedControlsWidth,
      );
    }

    const totalGap = gap * Math.max(0, gridColumns - 1);
    const cellWidth =
      (columnContentWidth - totalGap) / gridColumns;

    return Math.max(
      140,
      cellWidth - nestedControlsWidth,
    );
  };

  const columnLight = isLightColor(item.color);
  const headerTextColor = columnLight ? '#1e293b' : '#f1f5f9';
  const headerMutedColor = columnLight ? '#64748b' : '#94a3b8';

  const update = useCallback(
    (patch: Partial<ColumnItem>) => {
      onUpdate(current => current.type === 'column' ? { ...current, ...patch } : current);
    },
    [onUpdate],
  );

  const updateItems = useCallback(
    (updater: (items: BoardItem[]) => BoardItem[]) => {
      update({ items: updater(item.items ?? []) });
    },
    [item.items, update],
  );

  const updateNested = useCallback(
    (id: string, updater: (item: BoardItem) => BoardItem) => {
      updateItems(currentItems =>
        currentItems.map(nestedItem => nestedItem.id === id ? updater(nestedItem) : nestedItem),
      );
    },
    [updateItems],
  );

  const deleteNested = useCallback(
    (id: string) => {
      updateItems(currentItems => currentItems.filter(nestedItem => nestedItem.id !== id));
    },
    [updateItems],
  );

  const { draggingIndex, dropIndex, handleDragStart } = useColumnDrag({
    columnId: item.id,
    layout,
    items,
    containerRef,
    itemRefsMap,
    updateItems,
    deleteNested,
    onEjectItem,
  });

  const addNewItem = useCallback(
    (kind: Parameters<typeof createDefaultColumnItem>[0]) => {
      updateItems(currentItems => [...currentItems, createDefaultColumnItem(kind)]);
      setShowAddMenu(false);
    },
    [updateItems],
  );

  const updateNestedItem = useCallback(
    (
      itemId: string,
      updater: (item: BoardItem) => BoardItem,
    ) => {
      onUpdate(current => {
        if (current.type !== 'column') return current;

        return {
          ...current,
          items: current.items.map(item =>
            item.id === itemId
              ? updater(item)
              : item,
          ),
        };
      });
    },
    [onUpdate],
  );

  const resetNestedItemWidth = useCallback(
    (itemId: string) => {
      updateNestedItem(itemId, current => ({
        ...current,
        width: 260,
      }));
    },
    [updateNestedItem],
  );

  const handleNestedWidthResizeStart = useCallback(
    (
      itemId: string,
      event: React.MouseEvent,
    ) => {
      if (!isHorizontal || event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const nestedItem = items.find(
        item => item.id === itemId,
      );

      if (!nestedItem) return;

      const startX = event.clientX;
      const startWidth =
        nestedItem.width ?? 260;

      const handleMove = (moveEvent: MouseEvent) => {
        const deltaX =
          (moveEvent.clientX - startX) / zoom;

        const width = Math.max(
          140,
          Math.min(
            800,
            startWidth + deltaX,
          ),
        );

        updateNestedItem(
          itemId,
          current => ({
            ...current,
            width: Math.round(width),
          }),
        );
      };

      const handleUp = () => {
        document.removeEventListener(
          'mousemove',
          handleMove,
        );

        document.removeEventListener(
          'mouseup',
          handleUp,
        );
      };

      document.addEventListener(
        'mousemove',
        handleMove,
      );

      document.addEventListener(
        'mouseup',
        handleUp,
      );
    },
    [
      isHorizontal,
      items,
      zoom,
      updateNestedItem,
    ],
  );

  const clearNestedSelection = useCallback(() => {
    onSelectColumnItem?.(null);
  }, [onSelectColumnItem]);

  const selectNestedItem = useCallback(
    (nestedItem: BoardItem) => {
      onSelectColumnItem?.(nestedItem);
    },
    [onSelectColumnItem],
  );

  const ejectNestedItem = useCallback(
    (nestedItem: BoardItem, clientX?: number, clientY?: number) => {
      deleteNested(nestedItem.id);
      onEjectItem?.(nestedItem, clientX, clientY);

      if (selectedItemId === nestedItem.id) clearNestedSelection();
    },
    [deleteNested, onEjectItem, selectedItemId, clearNestedSelection],
  );

  function prepareNestedItemForColumn(nestedItem: BoardItem, width: number): BoardItem {
    switch (nestedItem.type) {
      case 'note':
      case 'checklist':
      case 'link':
      case 'image':
      case 'text':
        return { ...nestedItem, width };

      default:
        return nestedItem;
    }
  }

  const showDropIndicator = (index: number) =>
    dropIndex === index &&
    draggingIndex !== null &&
    draggingIndex !== index &&
    draggingIndex !== index - 1;

  return (
    <div
      className="group/col relative"
      style={{
        width: item.width,
        height: item.height,
      }}
    >
      {isDragOver && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{
            inset: -4,
            boxShadow: '0 0 0 3px var(--color-accent), 0 0 24px rgba(124,58,237,0.3)',
            zIndex: 1,
          }}
        />
      )}

      <div
        className="item-rounded border shadow-xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: item.color,
          borderColor: isSelected || isDragOver
            ? 'var(--color-accent)'
            : columnLight
              ? 'rgba(0,0,0,0.08)'
              : 'rgba(255,255,255,0.1)',
          transition: 'border-color 0.15s',
          minWidth: 220,
          height: item.height ? '100%' : undefined,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing"
          style={{
            borderColor: columnLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              ref={backgroundMenuRef}
              className="relative flex-shrink-0"
              onMouseDown={event => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setShowBackgroundMenu(previous => !previous)}
                className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-125 cursor-pointer"
                style={{
                  backgroundColor: item.color,
                  borderColor: columnLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.4)',
                }}
                title="Column background color"
              />

              {showBackgroundMenu && (
                <div
                  className="absolute top-6 left-0 z-50 rounded-xl shadow-2xl border p-2.5"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    borderColor: 'var(--color-border)',
                    minWidth: 170,
                  }}
                  onMouseDown={event => event.stopPropagation()}
                >
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Layout background
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {COLUMN_BG_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => {
                          update({ color });
                          setShowBackgroundMenu(false);
                        }}
                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 cursor-pointer"
                        style={{
                          backgroundColor: color,
                          borderColor: item.color === color
                            ? 'var(--color-accent)'
                            : 'rgba(0,0,0,0.12)',
                        }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {editingTitle ? (
              <input
                autoFocus
                className="bg-transparent font-bold text-base outline-none border-b-2 min-w-0 flex-1"
                style={{
                  ...typographyStyle,
                  color: headerTextColor,
                  borderColor: 'var(--color-accent)',
                }}
                value={item.title}
                onChange={event => update({ title: event.target.value })}
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
                className="font-bold text-base select-none cursor-text truncate"
                style={{
                  ...typographyStyle,
                  color: headerTextColor,
                }}
                onDoubleClick={() => setEditingTitle(true)}
              >
                {item.title}
              </span>
            )}

            <span
              className="text-xs font-mono flex-shrink-0 px-1.5 py-0.5 rounded-full"
              style={{
                color: headerMutedColor,
                backgroundColor: columnLight
                  ? 'rgba(0,0,0,0.06)'
                  : 'rgba(255,255,255,0.08)',
              }}
              title={`${items.length} items`}
            >
              {items.length}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 flex-shrink-0 ml-2"
            onMouseDown={event => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onDelete}
              className="opacity-0 group-hover/col:opacity-100 transition-all rounded-lg p-1.5 cursor-pointer"
              style={{ color: headerMutedColor }}
              onMouseEnter={event => {
                event.currentTarget.style.color = 'var(--color-danger-strong)';
                event.currentTarget.style.backgroundColor = 'rgba(255,107,138,0.1)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.color = headerMutedColor;
                event.currentTarget.style.backgroundColor = 'transparent';
              }}
              title="Delete layout"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Nested items */}
        <div
          data-wheel-scroll="true"
          ref={containerRef}
          className="px-4 pt-3 pb-1 overflow-auto"
          style={{
            flex: 1,
            display: isGrid ? 'grid' : 'flex',
            flexDirection: isHorizontal ? 'row' : 'column',
            gridTemplateColumns: isGrid
              ? `repeat(${gridColumns}, minmax(0, 1fr))`
              : undefined,
            gap,
            alignContent: 'start',
            alignItems: 'flex-start',
          }}
          onClick={event => {
            if (event.target === event.currentTarget) clearNestedSelection();
          }}
        >
          {items.map((nestedItem, index) => (
            <Fragment key={nestedItem.id}>
              {showDropIndicator(index) && (
                <DropIndicator layout={layout} />
              )}

              <div
                ref={element => {
                  if (element) {
                    itemRefsMap.current.set(index, element);
                  } else {
                    itemRefsMap.current.delete(index);
                  }
                }}
                className="relative flex-shrink-0 group/nested"
                style={{
                  width: isHorizontal
                    ? nestedItem.width ?? 260
                    : '100%',
                  minWidth: 0,
                }}
              >
                <ColumnItemRow
                  isDragging={draggingIndex === index}
                  isSelected={selectedItemId === nestedItem.id}
                  onDragHandleMouseDown={event => handleDragStart(index, event)}
                  onEject={() => ejectNestedItem(nestedItem)}
                  onSelect={() => selectNestedItem(nestedItem)}
                >
                  <div
                    className="min-w-0"
                    onMouseDown={event => {
                      const target = event.target as Element;

                      const interactive =
                        target instanceof HTMLInputElement ||
                        target instanceof HTMLTextAreaElement ||
                        target instanceof HTMLButtonElement ||
                        target instanceof HTMLSelectElement ||
                        target.closest('button, input, textarea, select') !== null;

                      if (!interactive) event.stopPropagation();
                    }}
                  >
                    <BlockRenderer
                      item={prepareNestedItemForColumn(nestedItem, getNestedItemWidth(nestedItem))}
                      isInsideColumn
                      isSelected={false}
                      onUpdate={updater => updateNested(nestedItem.id, updater)}
                      onDelete={() => {
                        const execute = () => deleteNested(nestedItem.id);

                        if (onRequestDelete) {
                          onRequestDelete(execute);
                        } else {
                          execute();
                        }
                      }}
                      onFitFrame={() => {}}
                      onLineEndpointDrag={() => {}}
                    />
                  </div>
                </ColumnItemRow>

                {isHorizontal && (
                  <div
                    className="absolute top-0 -right-2 w-4 h-full cursor-col-resize z-30 group/resize"
                    onMouseDown={event =>
                      handleNestedWidthResizeStart(
                        nestedItem.id,
                        event,
                      )
                    }
                    onDoubleClick={event => {
                      event.stopPropagation();
                      resetNestedItemWidth(
                        nestedItem.id,
                      );
                    }}
                    title={`Resize item (${Math.round(
                      nestedItem.width ?? 260,
                    )}px) · Double-click to reset`}
                  >
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-8 rounded-full opacity-0 group-hover/nested:opacity-50 group-hover/resize:opacity-100 transition-all"
                      style={{
                        backgroundColor:
                          'var(--color-accent)',
                      }}
                    />
                  </div>
                )}
              </div>
            </Fragment>
          ))}

          {dropIndex === items.length && draggingIndex !== null && (
            <DropIndicator layout={layout} />
          )}

          {items.length === 0 && (
            <div
              className="py-8 px-4 text-center text-sm select-none rounded-xl border-2 border-dashed"
              style={{
                gridColumn: isGrid ? '1 / -1' : undefined,
                minWidth: isHorizontal ? 180 : undefined,
                color: columnLight
                  ? 'rgba(0,0,0,0.25)'
                  : 'rgba(255,255,255,0.2)',
                borderColor: columnLight
                  ? 'rgba(0,0,0,0.1)'
                  : 'rgba(255,255,255,0.1)',
              }}
            >
              Drop items here or click + to add
            </div>
          )}
        </div>

        {/* Add item */}
        <div
          className="px-4 pb-4 pt-2 relative"
          onMouseDown={event => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setShowAddMenu(previous => !previous)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 item-rounded text-sm font-semibold transition-all cursor-pointer"
            style={{
              color: 'var(--color-accent)',
              backgroundColor: columnLight
                ? 'rgba(124,58,237,0.07)'
                : 'rgba(124,58,237,0.12)',
              border: '1.5px dashed rgba(124,58,237,0.35)',
            }}
            onMouseEnter={event => {
              event.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.14)';
              event.currentTarget.style.borderStyle = 'solid';
            }}
            onMouseLeave={event => {
              event.currentTarget.style.backgroundColor = columnLight
                ? 'rgba(124,58,237,0.07)'
                : 'rgba(124,58,237,0.12)';
              event.currentTarget.style.borderStyle = 'dashed';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>

            Add item
          </button>

          {showAddMenu && (
            <div
              className="absolute bottom-full left-4 right-4 mb-1.5 rounded-2xl border shadow-2xl z-50 overflow-hidden"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
              }}
              onMouseDown={event => event.stopPropagation()}
            >
              {COLUMN_ADD_TYPES.map(({ kind, label, icon }) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => addNewItem(kind)}
                  className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3 cursor-pointer"
                  style={{ color: 'var(--color-text-primary)' }}
                  onMouseEnter={event => {
                    event.currentTarget.style.backgroundColor = 'var(--color-surface-alt)';
                  }}
                  onMouseLeave={event => {
                    event.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span className="text-base">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}