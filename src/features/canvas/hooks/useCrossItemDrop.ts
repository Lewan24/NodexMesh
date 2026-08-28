import { useCallback } from 'react';

import type { RefObject } from 'react';

import type {
  BoardItem,
  ChecklistEntry,
  KanbanCard,
} from '@/entities/board/types';

import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';

interface ProjectLike {
  items: BoardItem[];
}

interface CanvasPoint {
  x: number;
  y: number;
}

interface UseCrossItemDropOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  projectRef: RefObject<ProjectLike>;

  measuredSizes: SizeMap;

  screenToCanvas: (
    x: number,
    y: number,
  ) => CanvasPoint;

  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;
}

export function useCrossItemDrop({
  containerRef,
  projectRef,
  measuredSizes,
  screenToCanvas,
  onUpdateItem,
}: UseCrossItemDropOptions) {
  const getCanvasPoint = useCallback(
    (
      clientX: number,
      clientY: number,
    ): CanvasPoint | null => {
      const rect = containerRef.current?.getBoundingClientRect();

      if (!rect) {
        return null;
      }

      return screenToCanvas(
        clientX - rect.left,
        clientY - rect.top,
      );
    },
    [containerRef, screenToCanvas],
  );

  const isPointInsideItem = useCallback(
    (
      item: BoardItem,
      point: CanvasPoint,
    ) => {
      const size =
        measuredSizes.get(item.id) ??
        getApproxItemSize(item);

      return (
        point.x >= item.x &&
        point.y >= item.y &&
        point.x <= item.x + size.width &&
        point.y <= item.y + size.height
      );
    },
    [measuredSizes],
  );

  const handleChecklistDropOutside = useCallback(
    (
      sourceId: string,
      entry: ChecklistEntry,
      clientX: number,
      clientY: number,
    ) => {
      const point = getCanvasPoint(clientX, clientY);

      if (!point) {
        return;
      }

      const target = projectRef.current.items.find(
        item =>
          item.id !== sourceId &&
          item.type === 'checklist' &&
          isPointInsideItem(item, point),
      );

      const destinationId = target?.id ?? sourceId;

      onUpdateItem(destinationId, item => {
        if (item.type !== 'checklist') {
          return item;
        }

        return {
          ...item,
          entries: [
            ...item.entries,
            entry,
          ],
        };
      });
    },
    [
      projectRef,
      getCanvasPoint,
      isPointInsideItem,
      onUpdateItem,
    ],
  );

  const handleKanbanCardDropOutside = useCallback(
    (
      sourceId: string,
      card: KanbanCard,
      clientX: number,
      clientY: number,
    ) => {
      const point = getCanvasPoint(clientX, clientY);

      if (!point) {
        return;
      }

      const target = projectRef.current.items.find(
        item =>
          item.id !== sourceId &&
          item.type === 'kanban' &&
          isPointInsideItem(item, point),
      );

      const destinationId = target?.id ?? sourceId;

      onUpdateItem(destinationId, item => {
        if (item.type !== 'kanban') {
          return item;
        }

        if (item.columns.length === 0) {
          return item;
        }

        const columns = [...item.columns];
        const firstColumn = columns[0];

        if (!firstColumn) {
          return item;
        }

        columns[0] = {
          ...firstColumn,
          cards: [
            ...firstColumn.cards,
            card,
          ],
        };

        return {
          ...item,
          columns,
        };
      });
    },
    [
      projectRef,
      getCanvasPoint,
      isPointInsideItem,
      onUpdateItem,
    ],
  );

  return {
    handleChecklistDropOutside,
    handleKanbanCardDropOutside,
  };
}