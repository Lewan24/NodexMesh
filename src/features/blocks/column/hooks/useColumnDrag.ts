import {
  useCallback,
  useRef,
  useState,
} from 'react';

import type {
  RefObject,
} from 'react';

import type {
  BoardItem, ColumnLayout 
} from '@/entities/board/types';

import {
  emitNestedDragEnd,
  emitNestedDragMove,
} from '@/features/canvas/utils/nestedDrag';

interface UseColumnDragOptions {
  columnId: string;

  items: BoardItem[];

  containerRef:
    RefObject<HTMLDivElement | null>;

  itemRefsMap:
    RefObject<
      Map<number, HTMLDivElement>
    >;

  layout: ColumnLayout;

  updateItems: (
    updater: (
      items: BoardItem[],
    ) => BoardItem[],
  ) => void;

  deleteNested: (
    id: string,
  ) => void;

  onEjectItem?: (
    item: BoardItem,
    clientX?: number,
    clientY?: number,
  ) => void;
}

export function useColumnDrag({
  columnId,
  items,
  layout,
  containerRef,
  itemRefsMap,
  updateItems,
  deleteNested,
  onEjectItem,
}: UseColumnDragOptions) {
  const [
    draggingIndex,
    setDraggingIndex,
  ] =
    useState<number | null>(
      null,
    );

  const [
    dropIndex,
    setDropIndex,
  ] =
    useState<number | null>(
      null,
    );

  const dropIndexRef =
    useRef<number | null>(
      null,
    );

  const itemsRef =
    useRef(items);

  itemsRef.current =
    items;

  const handleDragStart =
    useCallback(
      (
        fromIndex: number,
        event: React.MouseEvent,
      ) => {
        if (
          event.button !== 0
        ) {
          return;
        }

        event.stopPropagation();
        event.preventDefault();

        const container =
          containerRef.current;

        if (!container) return;

        const draggedItem =
          itemsRef.current[
            fromIndex
          ];

        if (!draggedItem) {
          return;
        }

        setDraggingIndex(
          fromIndex,
        );

        setDropIndex(
          fromIndex,
        );

        dropIndexRef.current =
          fromIndex;

        const getLinearDropIndex = (clientX: number, clientY: number) => {
          const coordinate = layout === 'horizontal' ? clientX : clientY;

          for (let index = 0; index < itemsRef.current.length; index++) {
            const element = itemRefsMap.current.get(index);
            if (!element) continue;

            const rect = element.getBoundingClientRect();

            const center = layout === 'horizontal'
              ? rect.left + rect.width / 2
              : rect.top + rect.height / 2;

            if (coordinate < center) return index;
          }

          return itemsRef.current.length;
        };

        const getGridDropIndex = (clientX: number, clientY: number) => {
          if (itemsRef.current.length === 0) return 0;

          let closestIndex = 0;
          let closestDistance = Infinity;
          let closestRect: DOMRect | null = null;

          for (let index = 0; index < itemsRef.current.length; index++) {
            const element = itemRefsMap.current.get(index);
            if (!element) continue;

            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const distance = Math.hypot(clientX - centerX, clientY - centerY);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestIndex = index;
              closestRect = rect;
            }
          }

          if (!closestRect) return itemsRef.current.length;

          const afterCenter =
            clientY > closestRect.top + closestRect.height / 2 ||
            (
              clientY >= closestRect.top &&
              clientY <= closestRect.bottom &&
              clientX > closestRect.left + closestRect.width / 2
            );

          return Math.min(
            closestIndex + (afterCenter ? 1 : 0),
            itemsRef.current.length,
          );
        };

        const getDropIndex = (clientX: number, clientY: number) => {
          if (layout === 'grid') return getGridDropIndex(clientX, clientY);

          return getLinearDropIndex(clientX, clientY);
        };

        const isOutside =
          (
            clientX: number,
            clientY: number,
          ) => {
            const rect =
              container.getBoundingClientRect();

            return (
              clientX <
                rect.left - 40 ||
              clientX >
                rect.right + 40 ||
              clientY <
                rect.top - 40 ||
              clientY >
                rect.bottom + 40
            );
          };

        const handleMove = (
          moveEvent: MouseEvent,
        ) => {
          emitNestedDragMove(
            {
              kind:
                'column-item',

              item:
                draggedItem,

              columnId,
            },
            moveEvent.clientX,
            moveEvent.clientY,
          );

          if (
            isOutside(
              moveEvent.clientX,
              moveEvent.clientY,
            )
          ) {
            dropIndexRef.current =
              null;

            setDropIndex(null);

            return;
          }

          const targetIndex = getDropIndex(
            moveEvent.clientX,
            moveEvent.clientY,
          );

          dropIndexRef.current = targetIndex;
          setDropIndex(targetIndex);
        };

        const handleUp = (
          upEvent: MouseEvent,
        ) => {
          document.removeEventListener(
            'mousemove',
            handleMove,
          );

          document.removeEventListener(
            'mouseup',
            handleUp,
          );

          emitNestedDragEnd(
            {
              kind:
                'column-item',

              item:
                draggedItem,

              columnId,
            },
            upEvent.clientX,
            upEvent.clientY,
          );

          if (
            isOutside(
              upEvent.clientX,
              upEvent.clientY,
            ) &&
            onEjectItem
          ) {
            deleteNested(
              draggedItem.id,
            );

            onEjectItem(
              draggedItem,
              upEvent.clientX,
              upEvent.clientY,
            );
          } else {
            const finalDropIndex =
              dropIndexRef.current;

            if (
              finalDropIndex !==
                null &&
              finalDropIndex !==
                fromIndex
            ) {
              updateItems(
                currentItems => {
                  const next = [
                    ...currentItems,
                  ];

                  const sourceIndex =
                    next.findIndex(
                      candidate =>
                        candidate.id ===
                        draggedItem.id,
                    );

                  if (
                    sourceIndex ===
                    -1
                  ) {
                    return currentItems;
                  }

                  const [moved] =
                    next.splice(
                      sourceIndex,
                      1,
                    );

                  if (!moved) {
                    return currentItems;
                  }

                  let insertIndex =
                    finalDropIndex;

                  if (
                    sourceIndex <
                    finalDropIndex
                  ) {
                    insertIndex -= 1;
                  }

                  insertIndex =
                    Math.max(
                      0,
                      Math.min(
                        insertIndex,
                        next.length,
                      ),
                    );

                  next.splice(
                    insertIndex,
                    0,
                    moved,
                  );

                  return next;
                },
              );
            }
          }

          setDraggingIndex(null);
          setDropIndex(null);
          dropIndexRef.current =
            null;
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
        columnId,
        containerRef,
        itemRefsMap,
        layout,
        updateItems,
        deleteNested,
        onEjectItem,
      ],
    );

  return {
    draggingIndex,
    dropIndex,
    handleDragStart,
  };
}