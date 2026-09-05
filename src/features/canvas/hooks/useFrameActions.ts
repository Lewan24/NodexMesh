import { useCallback } from 'react';

import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

import { FRAME_FIT_PADDING } from '@/features/canvas/constants';
import { getFrameContents } from '@/features/canvas/utils/frameGeometry';
import { getItemRect } from '@/features/canvas/utils/itemGeometry';

interface UseFrameActionsOptions {
  items: BoardItem[];
  measuredSizes: SizeMap;
  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;
}

export function useFrameActions({
  items,
  measuredSizes,
  onUpdateItem,
}: UseFrameActionsOptions) {
  const handleFitFrame = useCallback(
    (frameId: string) => {
      const frame = items.find(item => item.id === frameId && item.type === 'frame');
      if (!frame || frame.type !== 'frame') return;

      const inside = getFrameContents(frame, items, measuredSizes);
      if (inside.length === 0) return;

      const rects = inside.map(item => getItemRect(item, measuredSizes));

      const minX = Math.min(...rects.map(rect => rect.x));
      const minY = Math.min(...rects.map(rect => rect.y));
      const maxX = Math.max(...rects.map(rect => rect.right));
      const maxY = Math.max(...rects.map(rect => rect.bottom));

      onUpdateItem(frameId, current => {
        if (current.type !== 'frame') return current;

        return {
          ...current,
          x: minX - FRAME_FIT_PADDING,
          y: minY - FRAME_FIT_PADDING,
          width: maxX - minX + FRAME_FIT_PADDING * 2,
          height: maxY - minY + FRAME_FIT_PADDING * 2,
        };
      });
    },
    [items, measuredSizes, onUpdateItem],
  );

  return { handleFitFrame };
}