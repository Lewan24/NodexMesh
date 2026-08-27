import {
  useCallback,
  useState,
} from 'react';

import type {
  RefObject,
} from 'react';

import type {
  BoardItem,
} from '@/entities/board/types';

import type {
  SizeMap,
} from '@/features/canvas/utils/lineGeometry';

import {
  FRAME_AUTO_EXPAND_PADDING,
} from '@/features/canvas/constants';

interface ProjectLike {
  items: BoardItem[];
}

interface UseCanvasMeasurementsOptions {
  projectRef: RefObject<ProjectLike>;

  onUpdateItem: (
    id: string,
    updater: (
      item: BoardItem,
    ) => BoardItem,
  ) => void;
}

export function useCanvasMeasurements({
  projectRef,
  onUpdateItem,
}: UseCanvasMeasurementsOptions) {
  const [
    measuredSizes,
    setMeasuredSizes,
  ] = useState<SizeMap>(
    () => new Map(),
  );

  const handleItemResize =
    useCallback(
      (
        itemId: string,
        width: number,
        height: number,
      ) => {
        setMeasuredSizes(
          previous => {
            const current =
              previous.get(
                itemId,
              );

            if (
              current &&
              current.width ===
                width &&
              current.height ===
                height
            ) {
              return previous;
            }

            const next =
              new Map(previous);

            next.set(
              itemId,
              {
                width,
                height,
              },
            );

            return next;
          },
        );

        const items =
          projectRef.current.items;

        const changedItem =
          items.find(
            item =>
              item.id ===
              itemId,
          );

        if (!changedItem) {
          return;
        }

        for (
          const item of items
        ) {
          if (
            item.type !==
            'frame'
          ) {
            continue;
          }

          const frame = item;

          const insideFrame =
            changedItem.x >=
              frame.x &&
            changedItem.y >=
              frame.y &&
            changedItem.x <=
              frame.x +
                frame.width &&
            changedItem.y <=
              frame.y +
                frame.height;

          if (!insideFrame) {
            continue;
          }

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
            neededWidth >
              frame.width ||
            neededHeight >
              frame.height;

          if (!needsResize) {
            continue;
          }

          onUpdateItem(
            frame.id,
            currentItem => {
              if (
                currentItem.type !==
                'frame'
              ) {
                return currentItem;
              }

              return {
                ...currentItem,

                width:
                  Math.max(
                    currentItem.width,
                    neededWidth,
                  ),

                height:
                  Math.max(
                    currentItem.height,
                    neededHeight,
                  ),
              };
            },
          );
        }
      },
      [
        onUpdateItem,
        projectRef,
      ],
    );

  return {
    measuredSizes,
    handleItemResize,
  };
}