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
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';
import { getItemSize } from '@/features/canvas/utils/itemGeometry';
import { isItemInsideFrame } from '../utils/frameGeometry';

export interface ItemDropPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  measuredSizes: SizeMap;

  snapEnabled: boolean;
  snapValue: (value: number) => number;
  pushHistory: () => void;
  onSelectItems: (ids: string[]) => void;
  onSelectTool: (tool: ToolType) => void;

  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;

  onDropOnColumn: (
    itemId: string,
    columnId: string,
  ) => void;

  clearColumnSelection: () => void;
}

export function useItemDrag({
  projectRef,
  selectedIdsRef,
  zoomRef,
  snapEnabled,
  measuredSizes,
  snapValue,
  pushHistory,
  onSelectItems,
  onSelectTool,
  onUpdateItem,
  onDropOnColumn,
  clearColumnSelection,
}: UseItemDragOptions) {
  const [dragOverColumnId, setDragOverColumnId] =
    useState<string | null>(null);
  const [settlingIds, setSettlingIds] = useState<string[]>([]);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dropPreview, setDropPreview] =
    useState<ItemDropPreview | null>(null);

  const [dragTilt, setDragTilt] = useState(0);

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

          const children = items.filter(child => {
            if (dragIds.includes(child.id)) return false;
            if (captureMap.has(child.id)) return false;

            return isItemInsideFrame(child, frame, measuredSizes);
          });

          for (const child of children) {
            const isChildLine = child.type === 'line';

            captureMap.set(child.id, {
              x: child.x,
              y: child.y,
              isLine: isChildLine,
              x2: isChildLine ? child.x2 : undefined,
              y2: isChildLine ? child.y2 : undefined,
            });
          }
        }
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

      let lastDx = 0;
      let lastDy = 0;

      let previousClientX = event.clientX;

      const handleMove = (moveEvent: MouseEvent) => {
        if (!hasMoved) {
          pushHistory();

          setDraggingIds(
            Array.from(captureMap.keys()),
          );
        }

        hasMoved = true;

        const dx = (moveEvent.clientX - startX) / currentZoom;
        const dy = (moveEvent.clientY - startY) / currentZoom;

        lastDx = dx;
        lastDy = dy;

        const movementX =
          moveEvent.clientX - previousClientX;

        previousClientX = moveEvent.clientX;

        const nextTilt = Math.max(
          -3,
          Math.min(3, movementX * 0.35),
        );

        setDragTilt(nextTilt);

        const primaryCapture =
          captureMap.get(id);

        const primaryItem =
          items.find(item => item.id === id);

        if (
          primaryCapture &&
          primaryItem &&
          primaryItem.type !== 'line'
        ) {
          const rawX =
            primaryCapture.x + dx;

          const rawY =
            primaryCapture.y + dy;

          const size =
            getItemSize(
              primaryItem,
              measuredSizes,
            );

          setDropPreview({
            x: snapValue(rawX),
            y: snapValue(rawY),
            width: size.width,
            height: size.height,
          });
        } else {
          setDropPreview(null);
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
        document.removeEventListener(
          'mousemove',
          handleMove,
        );

        document.removeEventListener(
          'mouseup',
          handleUp,
        );

        setDraggingIds([]);
        setDropPreview(null);
        setDragTilt(0);

        const columnId =
          dragOverColumnIdRef.current;

        /*
        * Drop inside a Column takes priority over
        * normal canvas grid snapping.
        */
        if (
          hasMoved &&
          columnId &&
          singleDragItem &&
          canDropOnColumn
        ) {
          onDropOnColumn(
            singleDragItem.id,
            columnId,
          );

          onSelectItems([]);
          setColumnHover(null);

          return;
        }

        setColumnHover(null);

        /*
        * While dragging the item follows the cursor freely.
        * Only after mouseup do we settle it onto the grid.
        */
        if (hasMoved && snapEnabled) {
          const primary = captureMap.get(id);

          if (primary) {
            const rawX =
              primary.x + lastDx;

            const rawY =
              primary.y + lastDy;

            const snappedX =
              snapValue(rawX);

            const snappedY =
              snapValue(rawY);

            const snapDx =
              snappedX - rawX;

            const snapDy =
              snappedY - rawY;

            if (
              Math.abs(snapDx) > 0.01 ||
              Math.abs(snapDy) > 0.01
            ) {
              const idsToSettle =
                Array.from(captureMap.keys());

              setSettlingIds(idsToSettle);

              requestAnimationFrame(() => {
                captureMap.forEach(
                  (
                    capture,
                    capturedId,
                  ) => {
                    onUpdateItem(
                      capturedId,
                      current => ({
                        ...current,

                        x:
                          capture.x +
                          lastDx +
                          snapDx,

                        y:
                          capture.y +
                          lastDy +
                          snapDy,

                        ...(capture.isLine
                          ? {
                              x2:
                                capture.x2! +
                                lastDx +
                                snapDx,

                              y2:
                                capture.y2! +
                                lastDy +
                                snapDy,
                            }
                          : {}),
                      }),
                    );
                  },
                );

                window.setTimeout(() => {
                  setSettlingIds([]);
                }, 160);
              });
            }
          }
        }

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
      onUpdateItem,
      onDropOnColumn,
      clearColumnSelection,
      setColumnHover,
    ],
  );

  return {
    dragOverColumnId,
    draggingIds,
    settlingIds,
    dropPreview,
    dragTilt,
    handleItemMouseDown,
  };
}