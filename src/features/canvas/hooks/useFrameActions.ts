import {
  useCallback,
} from 'react';

import type {
  BoardItem,
} from '@/entities/board/types';

import {
  FRAME_FIT_PADDING,
} from '@/features/canvas/constants';

import {
  getApproxItemSize,
} from '@/features/canvas/utils/itemGeometry';

interface UseFrameActionsOptions {
  items: BoardItem[];

  onUpdateItem: (
    id: string,
    updater: (
      item: BoardItem,
    ) => BoardItem,
  ) => void;
}

export function useFrameActions({
  items,
  onUpdateItem,
}: UseFrameActionsOptions) {
  const handleFitFrame =
    useCallback(
      (
        frameId: string,
      ) => {
        const frame =
          items.find(
            item =>
              item.id ===
                frameId &&
              item.type ===
                'frame',
          );

        if (
          !frame ||
          frame.type !== 'frame'
        ) {
          return;
        }

        const inside =
          items.filter(
            item =>
              item.id !==
                frameId &&
              item.type !==
                'frame' &&
              item.x >=
                frame.x &&
              item.y >=
                frame.y &&
              item.x <=
                frame.x +
                  frame.width &&
              item.y <=
                frame.y +
                  frame.height,
          );

        if (
          inside.length === 0
        ) {
          return;
        }

        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (
          const item of inside
        ) {
          const size =
            getApproxItemSize(
              item,
            );

          minX =
            Math.min(
              minX,
              item.x,
            );

          minY =
            Math.min(
              minY,
              item.y,
            );

          maxX =
            Math.max(
              maxX,
              item.x +
                size.width,
            );

          maxY =
            Math.max(
              maxY,
              item.y +
                size.height,
            );
        }

        onUpdateItem(
          frameId,
          item => {
            if (
              item.type !==
              'frame'
            ) {
              return item;
            }

            return {
              ...item,

              x:
                minX -
                FRAME_FIT_PADDING,

              y:
                minY -
                FRAME_FIT_PADDING,

              width:
                maxX -
                minX +
                FRAME_FIT_PADDING *
                  2,

              height:
                maxY -
                minY +
                FRAME_FIT_PADDING *
                  2,
            };
          },
        );
      },
      [
        items,
        onUpdateItem,
      ],
    );

  return {
    handleFitFrame,
  };
}