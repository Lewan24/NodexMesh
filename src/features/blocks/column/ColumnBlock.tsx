import { useCallback, useEffect, useRef, useState } from 'react';

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

interface ColumnBlockProps {
  item: ColumnItem;
  isSelected?: boolean;
  isDragOver?: boolean;
  selectedItemId?: string | null;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onBlockResize: (event: React.MouseEvent, width: number, height: null) => void;
  onEjectItem?: (ejectedItem: BoardItem) => void;
  onSelectColumnItem?: (item: BoardItem | null) => void;
  onRequestDelete?: (execute: () => void) => void;
}

function DropLine() {
  return (
    <div
      className="h-1 rounded-full mx-1 my-1.5"
      style={{
        backgroundColor: '#7C3AED',
        boxShadow: '0 0 8px rgba(124, 58, 237,0.5)',
      }}
    />
  );
}

export default function ColumnBlock({
  item,
  isSelected,
  isDragOver,
  selectedItemId = null,
  onUpdate,
  onDelete,
  onBlockResize,
  onEjectItem,
  onSelectColumnItem,
  onRequestDelete,
}: ColumnBlockProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);

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

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showAddMenu, showBackgroundMenu]);

  const items = item.items ?? [];
  const innerWidth = item.width - 32;
  const columnLight = isLightColor(item.color);

  const headerTextColor = columnLight ? '#1e293b' : '#f1f5f9';
  const headerMutedColor = columnLight ? '#64748b' : '#94a3b8';

  const update = useCallback(
    (patch: Partial<ColumnItem>) => {
      onUpdate(current => {
        if (current.type !== 'column') return current;

        return {
          ...current,
          ...patch,
        };
      });
    },
    [onUpdate],
  );

  const updateItems = useCallback(
    (updater: (items: BoardItem[]) => BoardItem[]) => {
      update({
        items: updater(item.items ?? []),
      });
    },
    [item.items, update],
  );

  const updateNested = useCallback(
    (id: string, updater: (item: BoardItem) => BoardItem) => {
      updateItems(currentItems =>
        currentItems.map(nestedItem => (nestedItem.id === id ? updater(nestedItem) : nestedItem)),
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
    (nestedItem: BoardItem) => {
      deleteNested(nestedItem.id);
      onEjectItem?.(nestedItem);

      if (selectedItemId === nestedItem.id) clearNestedSelection();
    },
    [deleteNested, onEjectItem, selectedItemId, clearNestedSelection],
  );

  function prepareNestedItemForColumn(item: BoardItem, innerWidth: number): BoardItem {
    if (item.type === 'note') {
      return {
        ...item,
        width: innerWidth,
      };
    }

    if ('width' in item) {
      return {
        ...item,
        width: typeof item.width === 'number' ? item.width : innerWidth,
      };
    }

    return item;
  }

  return (
    <div className="group/col relative" style={{ width: item.width }}>
      {isDragOver && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{
            inset: -4,
            boxShadow: '0 0 0 3px #7C3AED, 0 0 24px rgba(124, 58, 237,0.3)',
            zIndex: 1,
          }}
        />
      )}

      <div
        className="rounded-2xl border shadow-xl"
        style={{
          backgroundColor: item.color,
          borderColor:
            isSelected || isDragOver
              ? '#7C3AED'
              : columnLight
                ? 'rgba(0,0,0,0.08)'
                : 'rgba(255,255,255,0.1)',
          transition: 'border-color 0.15s',
          minWidth: 220,
        }}
      >
        {/* Header */}

        <div
          className="flex items-center justify-between px-4 py-3 border-b cursor-grab active:cursor-grabbing rounded-t-2xl"
          style={{
            borderColor: columnLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="relative flex-shrink-0"
              onMouseDown={event => event.stopPropagation()}
              ref={backgroundMenuRef}
            >
              <button
                onClick={() => setShowBackgroundMenu(previous => !previous)}
                className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-125"
                style={{
                  backgroundColor: item.color,
                  borderColor: columnLight
                    ? 'rgba(0,0,0,0.2)'
                    : 'rgba(255,255,255,0.4)',
                }}
                title="Column background color"
              />

              {showBackgroundMenu && (
                <div
                  className="absolute top-6 left-0 z-50 rounded-xl shadow-2xl border p-2.5"
                  style={{
                    backgroundColor: '#fff',
                    borderColor: 'rgba(0,0,0,0.1)',
                    minWidth: 170,
                  }}
                  onMouseDown={event => event.stopPropagation()}
                >
                  <p
                    className="text-xs font-semibold mb-2"
                    style={{ color: '#6b7280' }}
                  >
                    Column background
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {COLUMN_BG_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          update({ color });
                          setShowBackgroundMenu(false);
                        }}
                        className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor:
                            item.color === color ? '#1a2530' : 'rgba(0,0,0,0.12)',
                        }}
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
                  color: headerTextColor,
                  borderColor: '#7C3AED',
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
                style={{ color: headerTextColor }}
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
            >
              {items.length}
            </span>
          </div>

          <div
            className="flex items-center gap-1.5 flex-shrink-0 ml-2"
            onMouseDown={event => event.stopPropagation()}
          >
            <div
              className="opacity-0 group-hover/col:opacity-100 cursor-ew-resize transition-opacity rounded-lg p-1.5"
              style={{ color: headerMutedColor }}
              onMouseDown={event => {
                event.stopPropagation();
                onBlockResize(event, item.width, null);
              }}
              title="Drag to resize width"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
              </svg>
            </div>

            <button
              onClick={onDelete}
              className="opacity-0 group-hover/col:opacity-100 transition-all rounded-lg p-1.5"
              style={{ color: headerMutedColor }}
              onMouseEnter={event => {
                event.currentTarget.style.color = '#ef4444';
                event.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)';
              }}
              onMouseLeave={event => {
                event.currentTarget.style.color = headerMutedColor;
                event.currentTarget.style.backgroundColor = 'transparent';
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
        </div>

        {/* Nested items */}

        <div
          ref={containerRef}
          className="px-4 pt-3 pb-1 flex flex-col gap-2.5"
          onClick={event => {
            if (event.target === event.currentTarget) clearNestedSelection();
          }}
        >
          {items.map((nestedItem, index) => (
            <div key={nestedItem.id}>
              {dropIndex === index &&
                draggingIndex !== null &&
                draggingIndex !== index &&
                draggingIndex !== index - 1 && <DropLine />}

              <div
                ref={element => {
                  if (element) {
                    itemRefsMap.current.set(index, element);
                  } else {
                    itemRefsMap.current.delete(index);
                  }
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
                    onMouseDown={event => {
                      const target = event.target as Element;

                      const interactive =
                        target instanceof HTMLInputElement ||
                        target instanceof HTMLTextAreaElement ||
                        target instanceof HTMLButtonElement ||
                        target.closest('button') !== null;

                      if (!interactive) event.stopPropagation();
                    }}
                  >
                    <BlockRenderer
                      item={prepareNestedItemForColumn(nestedItem, innerWidth)}
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
                      onFrameResize={() => {}}
                      onFitFrame={() => {}}
                      onBlockResize={() => {}}
                      onLineEndpointDrag={() => {}}
                    />
                  </div>
                </ColumnItemRow>
              </div>
            </div>
          ))}

          {dropIndex === items.length && draggingIndex !== null && <DropLine />}

          {items.length === 0 && (
            <div
              className="py-8 text-center text-sm select-none rounded-xl border-2 border-dashed"
              style={{
                color: columnLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.2)',
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
            onClick={() => setShowAddMenu(previous => !previous)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              color: '#7C3AED',
              backgroundColor: columnLight
                ? 'rgba(124, 58, 237,0.07)'
                : 'rgba(124, 58, 237,0.12)',
              border: '1.5px dashed rgba(124, 58, 237,0.35)',
            }}
            onMouseEnter={event => {
              event.currentTarget.style.backgroundColor = 'rgba(124, 58, 237,0.14)';
              event.currentTarget.style.borderStyle = 'solid';
            }}
            onMouseLeave={event => {
              event.currentTarget.style.backgroundColor = columnLight
                ? 'rgba(124, 58, 237,0.07)'
                : 'rgba(124, 58, 237,0.12)';
              event.currentTarget.style.borderStyle = 'dashed';
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
              <path d="M12 5v14M5 12h14" />
            </svg>

            Add item
          </button>

          {showAddMenu && (
            <div
              className="absolute bottom-full left-4 right-4 mb-1.5 rounded-2xl border shadow-2xl z-50 overflow-hidden"
              style={{
                backgroundColor: '#ffffff',
                borderColor: 'rgba(0,0,0,0.08)',
              }}
              onMouseDown={event => event.stopPropagation()}
            >
              {COLUMN_ADD_TYPES.map(({ kind, label, icon }) => (
                <button
                  key={kind}
                  onClick={() => addNewItem(kind)}
                  className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center gap-3"
                  style={{ color: '#374151' }}
                  onMouseEnter={event => {
                    event.currentTarget.style.backgroundColor = '#f3f4f6';
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

      {/* Right resize handle */}

      <div
        className="absolute top-0 bottom-0 cursor-ew-resize flex items-center opacity-0 group-hover/col:opacity-100 transition-opacity"
        style={{
          right: -8,
          width: 16,
        }}
        onMouseDown={event => {
          event.stopPropagation();
          onBlockResize(event, item.width, null);
        }}
        title="Drag to resize"
      >
        <div
          className="rounded-full"
          style={{
            width: 5,
            height: 44,
            backgroundColor: '#7C3AED',
            opacity: 0.65,
            margin: '0 auto',
          }}
        />
      </div>
    </div>
  );
}