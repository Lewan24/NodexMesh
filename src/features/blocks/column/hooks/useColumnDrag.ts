import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { BoardItem } from '@/entities/board/types';

interface UseColumnDragOptions {
  items: BoardItem[];
  containerRef: RefObject<HTMLDivElement | null>;
  itemRefsMap: RefObject<Map<number, HTMLDivElement>>;
  updateItems: (updater: (items: BoardItem[]) => BoardItem[]) => void;
  deleteNested: (id: string) => void;
  onEjectItem?: (item: BoardItem) => void;
}

export function useColumnDrag({
  items,
  containerRef,
  itemRefsMap,
  updateItems,
  deleteNested,
  onEjectItem,
}: UseColumnDragOptions) {
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const dropIndexRef = useRef<number | null>(null);
  const itemsRef = useRef(items);

  itemsRef.current = items;

  const handleDragStart = useCallback(
    (fromIndex: number, event: React.MouseEvent) => {
      if (event.button !== 0) return;

      event.stopPropagation();
      event.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      setDraggingIndex(fromIndex);
      setDropIndex(fromIndex);
      dropIndexRef.current = fromIndex;

      const getItemCenters = () => {
        const centers: number[] = [];

        for (let index = 0; index < itemsRef.current.length; index++) {
          const element = itemRefsMap.current.get(index);

          if (!element) {
            centers.push(0);
            continue;
          }

          const rect = element.getBoundingClientRect();
          centers.push(rect.top + rect.height / 2);
        }

        return centers;
      };

      const handleMove = (moveEvent: MouseEvent) => {
        const centers = getItemCenters();
        let targetIndex = fromIndex;

        for (let index = 0; index < centers.length; index++) {
          if (moveEvent.clientY > centers[index]!) targetIndex = index;
        }

        const rect = container.getBoundingClientRect();

        const outsideX =
          moveEvent.clientX < rect.left - 40 || moveEvent.clientX > rect.right + 40;

        const nextDropIndex = outsideX ? null : targetIndex;

        dropIndexRef.current = nextDropIndex;
        setDropIndex(nextDropIndex);
      };

      const handleUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);

        const finalDropIndex = dropIndexRef.current;
        const rect = container.getBoundingClientRect();

        const outsideX =
          upEvent.clientX < rect.left - 40 || upEvent.clientX > rect.right + 40;

        if (outsideX && onEjectItem) {
          const ejectedItem = itemsRef.current[fromIndex];

          if (ejectedItem) {
            deleteNested(ejectedItem.id);
            onEjectItem(ejectedItem);
          }
        } else if (finalDropIndex !== null && finalDropIndex !== fromIndex) {
          updateItems(currentItems => {
            const next = [...currentItems];
            const [moved] = next.splice(fromIndex, 1);

            if (!moved) return currentItems;

            next.splice(finalDropIndex, 0, moved);
            return next;
          });
        }

        setDraggingIndex(null);
        setDropIndex(null);
        dropIndexRef.current = null;
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [containerRef, itemRefsMap, updateItems, deleteNested, onEjectItem],
  );

  return {
    draggingIndex,
    dropIndex,
    handleDragStart,
  };
}