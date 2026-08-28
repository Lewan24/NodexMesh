import { useCallback } from 'react';

import type { RefObject } from 'react';
import type { BoardItem } from '@/entities/board/types';
import type { ResizeDirection } from '@/features/canvas/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';
import { getContainedItemIds } from '@/features/canvas/utils/itemGeometry';

import {
  MIN_BLOCK_WIDTH,
  MIN_FRAME_HEIGHT,
  MIN_FRAME_WIDTH,
  MIN_IMAGE_HEIGHT,
} from '@/features/canvas/constants';

interface ProjectLike {
  items: BoardItem[];
}

interface UseItemResizeOptions {
  projectRef: RefObject<ProjectLike>;
  zoomRef: RefObject<number>;
  measuredSizes: SizeMap;
  snapValue: (value: number) => number;
  pushHistory: () => void;
  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
  onResizeEnd?: (itemId: string) => void;
  onFramePreviewChange?: (ids: string[]) => void;
  onFrameResizeEnd?: (frameId: string, containedIds: string[]) => void;
}

interface MinSize {
  width: number;
  height: number;
}

function getMinSize(item: BoardItem): MinSize {
  switch (item.type) {
    case 'frame':
      return { width: MIN_FRAME_WIDTH, height: MIN_FRAME_HEIGHT };

    case 'column':
      return { width: 220, height: 120 };

    case 'kanban':
      return { width: 280, height: 180 };

    case 'image':
      return { width: MIN_BLOCK_WIDTH, height: MIN_IMAGE_HEIGHT };

    default:
      return { width: MIN_BLOCK_WIDTH, height: 60 };
  }
}

export function useItemResize({
  projectRef,
  zoomRef,
  measuredSizes,
  snapValue,
  pushHistory,
  onUpdateItem,
  onResizeEnd,
  onFramePreviewChange,
  onFrameResizeEnd,
}: UseItemResizeOptions) {
  const handleItemResize = useCallback(
    (id: string, event: React.MouseEvent, direction: ResizeDirection) => {
      if (event.button !== 0) return;

      const item = projectRef.current.items.find(current => current.id === id);
      if (!item || item.type === 'line') return;

      event.preventDefault();
      event.stopPropagation();

      const measured = measuredSizes.get(id);
      const startWidth = item.width ?? measured?.width ?? 220;
      const startHeight = item.height ?? measured?.height ?? 120;

      const startLeft = item.x;
      const startTop = item.y;
      const startRight = startLeft + startWidth;
      const startBottom = startTop + startHeight;

      const startClientX = event.clientX;
      const startClientY = event.clientY;
      const zoom = zoomRef.current;

      const minimum = getMinSize(item);

      let moved = false;
      let framePreviewIds: string[] = [];

      const movesLeft = direction.includes('w');
      const movesRight = direction.includes('e');
      const movesTop = direction.includes('n');
      const movesBottom = direction.includes('s');

      const handleMove = (moveEvent: MouseEvent) => {
        if (!moved) {
          pushHistory();
          moved = true;
        }

        const dx = (moveEvent.clientX - startClientX) / zoom;
        const dy = (moveEvent.clientY - startClientY) / zoom;

        let left = startLeft;
        let right = startRight;
        let top = startTop;
        let bottom = startBottom;

        if (movesLeft) left = snapValue(startLeft + dx);
        if (movesRight) right = snapValue(startRight + dx);
        if (movesTop) top = snapValue(startTop + dy);
        if (movesBottom) bottom = snapValue(startBottom + dy);

        if (right - left < minimum.width) {
          if (movesLeft) left = right - minimum.width;
          else right = left + minimum.width;
        }

        if (bottom - top < minimum.height) {
          if (movesTop) top = bottom - minimum.height;
          else bottom = top + minimum.height;
        }

        const width = right - left;
        const height = bottom - top;

        if (item.type === 'frame') {
          framePreviewIds = getContainedItemIds(
            projectRef.current.items,
            {
              x: left,
              y: top,
              width,
              height,
              right,
              bottom,
            },
            measuredSizes,
            item.id,
          );

          onFramePreviewChange?.(framePreviewIds);
        }

        onUpdateItem(id, current => {
          if (current.type === 'line') return current;

          /*
           * Image currently uses imgHeight internally.
           * Keep it synchronized during the migration to shared height.
           */
          if (current.type === 'image') {
            const originalImageHeight = current.imgHeight ?? 178;
            const originalOuterHeight = measured?.height ?? originalImageHeight;
            const chromeHeight = Math.max(0, originalOuterHeight - originalImageHeight);

            return {
              ...current,
              x: left,
              y: top,
              width,
              height,
              imgHeight: Math.max(MIN_IMAGE_HEIGHT, height - chromeHeight),
            };
          }

          return {
            ...current,
            x: left,
            y: top,
            width,
            height,
          };
        });
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);

        if (moved) {
          onResizeEnd?.(id);

          if (item.type === 'frame') {
            onFrameResizeEnd?.(id, framePreviewIds);
            onFramePreviewChange?.([]);
          }
        }
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      projectRef,
      zoomRef,
      measuredSizes,
      snapValue,
      pushHistory,
      onUpdateItem,
      onResizeEnd,
      onFramePreviewChange,
      onFrameResizeEnd,
    ],
  );

  return { handleItemResize };
}