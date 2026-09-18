import { autoGrowthLayout, growsAutomatically } from '../utils/autoGrowthLayout';
import { useCallback, useEffect, useRef, useState } from 'react';

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

  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
}

export function useCanvasMeasurements({ projectRef, suppressAutoLayout, onUpdateItem }: UseCanvasMeasurementsOptions) {
  const [measuredSizes, setMeasuredSizes] = useState<SizeMap>(() => new Map());

  const sizesRef = useRef<SizeMap>(new Map());
  const pendingFrame = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
      pendingFrame.current = null;
    },
    [],
  );
  const geometryRef = useRef(new Map<string, { width?: number; height?: number; x: number; y: number }>());
  const handleItemResize = useCallback(
    (itemId: string, width: number, height: number) => {
      const prior = sizesRef.current.get(itemId);
      const changed = projectRef.current.items.find((item) => item.id === itemId);
      const previousGeometry = geometryRef.current.get(itemId);
      if (changed)
        geometryRef.current.set(itemId, { width: changed.width, height: changed.height, x: changed.x, y: changed.y });
      if (prior && prior.width === width && prior.height === height) return;
      const explicitResize =
        !changed ||
        !previousGeometry ||
        changed.width !== previousGeometry.width ||
        changed.height !== previousGeometry.height;
      const needsLayout =
        !suppressAutoLayout.current &&
        !explicitResize &&
        changed &&
        growsAutomatically(changed) &&
        prior &&
        height > prior.height + 0.5;
      // Initial measurements only mutate the working map. Copy once per frame,
      // except when auto-growth needs the previous geometry immediately.
      const before = needsLayout ? new Map(sizesRef.current) : sizesRef.current;
      const after = sizesRef.current.set(itemId, { width, height });
      if (pendingFrame.current === null) {
        pendingFrame.current = requestAnimationFrame(() => {
          pendingFrame.current = null;
          setMeasuredSizes(new Map(sizesRef.current));
        });
      }
      if (needsLayout) {
        const patches = autoGrowthLayout(projectRef.current.items, itemId, before, after);
        for (const [id, patch] of patches)
          onUpdateItem(id, (current) => {
            if (patch.y !== undefined && current.y >= patch.y) return current;
            return {
              ...current,
              ...patch,
              ...(patch.height !== undefined ? { height: Math.max(current.height ?? 0, patch.height) } : {}),
            } as BoardItem;
          });
      }

      const items = projectRef.current.items;

      const changedItem = items.find((item) => item.id === itemId);

      if (!changedItem) {
        return;
      }

      for (const item of items) {
        if (item.type !== 'frame' || item.locked || changedItem.frameId !== item.id) {
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

        if (!touchesFrame) continue;

        const neededWidth = changedItem.x + width - frame.x + FRAME_AUTO_EXPAND_PADDING;

        const neededHeight = changedItem.y + height - frame.y + FRAME_AUTO_EXPAND_PADDING;

        const needsResize = neededWidth > frame.width || neededHeight > frame.height;

        if (!needsResize) {
          continue;
        }

        onUpdateItem(frame.id, (currentItem) => {
          if (currentItem.type !== 'frame') {
            return currentItem;
          }

          return {
            ...currentItem,
            width: Math.max(currentItem.width, neededWidth),
            height: Math.max(currentItem.height, neededHeight),
          };
        });
      }
    },
    [onUpdateItem, projectRef, suppressAutoLayout],
  );

  return { measuredSizes, handleItemResize };
}
