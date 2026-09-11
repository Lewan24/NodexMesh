import { autoGrowthLayout } from '../utils/autoGrowthLayout';
import { useCallback, useRef, useState } from 'react';

import type { RefObject } from 'react';

import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

import { FRAME_AUTO_EXPAND_PADDING } from '@/features/canvas/constants';

interface ProjectLike {
  items: BoardItem[];
}

interface UseCanvasMeasurementsOptions {
  projectRef: RefObject<ProjectLike>;
  suppressAutoLayout: RefObject<boolean>;

  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;
}

export function useCanvasMeasurements({
  projectRef,
  suppressAutoLayout,
  onUpdateItem,
}: UseCanvasMeasurementsOptions) {
  const [measuredSizes, setMeasuredSizes] = useState<SizeMap>(
    () => new Map(),
  );

  const sizesRef = useRef<SizeMap>(new Map());
  const geometryRef = useRef(new Map<string, { width?: number; height?: number; x: number; y: number }>());
  const handleItemResize = useCallback(
    (itemId: string, width: number, height: number) => {
      const before = sizesRef.current;
      const prior = before.get(itemId);
      const changed = projectRef.current.items.find(item => item.id === itemId);
      const previousGeometry = geometryRef.current.get(itemId);
      if (changed) geometryRef.current.set(itemId, { width: changed.width, height: changed.height, x: changed.x, y: changed.y });
      if (prior && prior.width === width && prior.height === height) return;
      const after = new Map(before).set(itemId, { width, height });
      sizesRef.current = after;
      setMeasuredSizes(after);
      const explicitResize = !changed || !previousGeometry || changed.width !== previousGeometry.width || changed.height !== previousGeometry.height;
      if (!suppressAutoLayout.current && !explicitResize) {
        const patches = autoGrowthLayout(projectRef.current.items, itemId, before, after);
        for (const [id, patch] of patches) onUpdateItem(id, current => {
          if (patch.y !== undefined && current.y >= patch.y) return current;
          return { ...current, ...patch, ...(patch.height !== undefined ? { height: Math.max(current.height ?? 0, patch.height) } : {}) } as BoardItem;
        });
      }

      const items = projectRef.current.items;

      const changedItem = items.find(
        item => item.id === itemId,
      );

      if (!changedItem) {
        return;
      }

      for (const item of items) {
        if (item.type !== 'frame' || item.locked) {
          continue;
        }

        const frame = item;

        const itemRight = changedItem.x + width;
        const itemBottom = changedItem.y + height;

        const touchesFrame =
          itemRight >= frame.x &&
          itemBottom >= frame.y &&
          changedItem.x <= frame.x + frame.width &&
          changedItem.y <= frame.y + frame.height;

        if (!touchesFrame) 
          continue;

        const neededWidth =
          changedItem.x +
          width -
          frame.x +
          FRAME_AUTO_EXPAND_PADDING;

        const neededHeight =
          changedItem.y +
          height -
          frame.y +
          FRAME_AUTO_EXPAND_PADDING;

        const needsResize =
          neededWidth > frame.width ||
          neededHeight > frame.height;

        if (!needsResize) {
          continue;
        }

        onUpdateItem(frame.id, currentItem => {
          if (currentItem.type !== 'frame') {
            return currentItem;
          }

          return {
            ...currentItem,
            width: Math.max(
              currentItem.width,
              neededWidth,
            ),
            height: Math.max(
              currentItem.height,
              neededHeight,
            ),
          };
        });
      }
    },
    [onUpdateItem, projectRef, suppressAutoLayout],
  );

  return {
    measuredSizes,
    handleItemResize,
  };
}