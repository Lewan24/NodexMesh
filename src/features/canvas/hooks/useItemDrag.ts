import { useCallback, useRef, useState } from 'react';

import type { RefObject } from 'react';

import type {
  BoardItem,
  ColumnItem,
  FrameItem,
  LineItem,
} from '@/entities/board/types';

import type { ToolType } from '@/entities/board/toolTypes';

import { DROPPABLE_ON_COLUMN } from '@/features/canvas/constants';

interface ProjectLike {
  items: BoardItem[];
}

interface DragCapture {
  x: number;
  y: number;
  isLine: boolean;
  x2?: number;
  y2?: number;
}

interface UseItemDragOptions {
  projectRef: RefObject<ProjectLike>;
  selectedIdsRef: RefObject<string[]>;
  zoomRef: RefObject<number>;

  snapEnabled: boolean;
  snapValue: (value: number) => number;
  pushHistory: () => void;
  onSelectItems: (ids: string[]) => void;
  onSelectTool: (tool: ToolType) => void;
  onBringToFront: (id: string) => void;

  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;

  onDropOnColumn: (
    itemId: string,
    columnId: string,
  ) => void;

  clearColumnSelection: () => void;
  triggerEnterAnimation: (id: string) => void;
}

export function useItemDrag({
  projectRef,
  selectedIdsRef,
  zoomRef,
  snapEnabled,
  snapValue,
  pushHistory,
  onSelectItems,
  onSelectTool,
  onBringToFront,
  onUpdateItem,
  onDropOnColumn,
  clearColumnSelection,
  triggerEnterAnimation,
}: UseItemDragOptions) {
  const [dragOverColumnId, setDragOverColumnId] =
    useState<string | null>(null);

  const dragOverColumnIdRef = useRef<string | null>(null);

  const setColumnHover = useCallback(
    (columnId: string | null) => {
      dragOverColumnIdRef.current = columnId;
      setDragOverColumnId(columnId);
    },
    [],
  );

  const handleItemMouseDown = useCallback(
    (
      id: string,
      event: React.MouseEvent,
    ) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.target as Element;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      clearColumnSelection();
      triggerEnterAnimation(id);
      onSelectTool('select');

      const currentSelected = selectedIdsRef.current;
      const isSelected = currentSelected.includes(id);

      let newSelected: string[];

      if (event.shiftKey) {
        newSelected = isSelected
          ? currentSelected.filter(currentId => currentId !== id)
          : [...currentSelected, id];
      } else if (!isSelected) {
        newSelected = [id];
      } else {
        newSelected = currentSelected;
      }

      onSelectItems(newSelected);

      const dragIds = newSelected.includes(id)
        ? newSelected
        : [id];

      const items = projectRef.current.items;
      const captureMap = new Map<string, DragCapture>();

      for (const dragId of dragIds) {
        const item = items.find(
          current => current.id === dragId,
        );

        if (!item) {
          continue;
        }

        const isLine = item.type === 'line';

        captureMap.set(dragId, {
          x: item.x,
          y: item.y,
          isLine,
          x2: isLine ? (item as LineItem).x2 : undefined,
          y2: isLine ? (item as LineItem).y2 : undefined,
        });

        if (item.type === 'frame') {
          const frame = item as FrameItem;

          const children = items.filter(
            child =>
              !dragIds.includes(child.id) &&
              !captureMap.has(child.id) &&
              child.type !== 'frame' &&
              child.x >= frame.x &&
              child.y >= frame.y &&
              child.x <= frame.x + frame.width &&
              child.y <= frame.y + frame.height,
          );

          for (const child of children) {
            captureMap.set(child.id, {
              x: child.x,
              y: child.y,
              isLine: false,
            });
          }
        }
      }

      for (const dragId of dragIds) {
        onBringToFront(dragId);
      }

      const startX = event.clientX;
      const startY = event.clientY;
      const currentZoom = zoomRef.current;

      let hasMoved = false;

      const singleDragId =
        dragIds.length === 1 ? dragIds[0] : null;

      const singleDragItem = singleDragId
        ? items.find(item => item.id === singleDragId)
        : undefined;

      const canDropOnColumn = singleDragItem
        ? DROPPABLE_ON_COLUMN.has(singleDragItem.type)
        : false;

      const handleMove = (moveEvent: MouseEvent) => {
        if (!hasMoved) {
          pushHistory();
        }

        hasMoved = true;

        let dx = (moveEvent.clientX - startX) / currentZoom;
        let dy = (moveEvent.clientY - startY) / currentZoom;

        if (snapEnabled) {
          const primary = captureMap.get(id);

          if (primary) {
            const rawX = primary.x + dx;
            const rawY = primary.y + dy;

            dx += snapValue(rawX) - rawX;
            dy += snapValue(rawY) - rawY;
          }
        }

        captureMap.forEach((capture, capturedId) => {
          onUpdateItem(capturedId, item => ({
            ...item,
            x: capture.x + dx,
            y: capture.y + dy,
            ...(capture.isLine
              ? {
                  x2: capture.x2! + dx,
                  y2: capture.y2! + dy,
                }
              : {}),
          }));
        });

        if (
          canDropOnColumn &&
          singleDragItem &&
          singleDragId
        ) {
          const primary = captureMap.get(singleDragId);

          if (primary) {
            const nextX = primary.x + dx;
            const nextY = primary.y + dy;

            const hovered = projectRef.current.items.find(item => {
              if (
                item.type !== 'column' ||
                dragIds.includes(item.id)
              ) {
                return false;
              }

              const column = item as ColumnItem;

              return (
                nextX >= column.x - 20 &&
                nextY >= column.y - 20 &&
                nextX <= column.x + column.width + 20 &&
                nextY <= column.y + 500
              );
            });

            setColumnHover(hovered?.id ?? null);
          }
        }
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);

        const columnId = dragOverColumnIdRef.current;

        if (
          hasMoved &&
          columnId &&
          singleDragItem &&
          canDropOnColumn
        ) {
          onDropOnColumn(singleDragItem.id, columnId);

          onSelectItems([]);
          setColumnHover(null);

          return;
        }

        setColumnHover(null);

        if (
          !hasMoved &&
          !event.shiftKey &&
          dragIds.length > 1
        ) {
          onSelectItems([id]);
        }
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      projectRef,
      selectedIdsRef,
      zoomRef,
      snapEnabled,
      snapValue,
      pushHistory,
      onSelectItems,
      onSelectTool,
      onBringToFront,
      onUpdateItem,
      onDropOnColumn,
      clearColumnSelection,
      triggerEnterAnimation,
      setColumnHover,
    ],
  );

  return {
    dragOverColumnId,
    handleItemMouseDown,
  };
}