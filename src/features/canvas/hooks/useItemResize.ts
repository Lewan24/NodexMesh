import { useCallback } from 'react';

import type { RefObject } from 'react';
import type { BoardItem } from '@/entities/board/types';

import {
  MIN_BLOCK_WIDTH,
  MIN_FRAME_HEIGHT,
  MIN_FRAME_WIDTH,
  MIN_IMAGE_HEIGHT,
} from '@/features/canvas/constants';

interface UseItemResizeOptions {
  zoomRef: RefObject<number>;
  snapValue: (value: number) => number;
  pushHistory: () => void;

  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;
}

export function useItemResize({
  zoomRef,
  snapValue,
  pushHistory,
  onUpdateItem,
}: UseItemResizeOptions) {
  const handleFrameResize = useCallback(
    (
      id: string,
      event: React.MouseEvent,
      startWidth: number,
      startHeight: number,
    ) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const currentZoom = zoomRef.current;

      let moved = false;

      const handleMove = (moveEvent: MouseEvent) => {
        if (!moved) {
          pushHistory();
          moved = true;
        }

        const width = Math.max(
          MIN_FRAME_WIDTH,
          snapValue(
            startWidth +
              (moveEvent.clientX - startX) / currentZoom,
          ),
        );

        const height = Math.max(
          MIN_FRAME_HEIGHT,
          snapValue(
            startHeight +
              (moveEvent.clientY - startY) / currentZoom,
          ),
        );

        onUpdateItem(id, item => {
          if (item.type !== 'frame') {
            return item;
          }

          return {
            ...item,
            width,
            height,
          };
        });
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      zoomRef,
      snapValue,
      pushHistory,
      onUpdateItem,
    ],
  );

  const handleBlockResize = useCallback(
    (
      id: string,
      event: React.MouseEvent,
      startWidth: number,
      startHeight: number | null,
    ) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startY = event.clientY;
      const currentZoom = zoomRef.current;

      let moved = false;

      const handleMove = (moveEvent: MouseEvent) => {
        if (!moved) {
          pushHistory();
          moved = true;
        }

        const width = Math.max(
          MIN_BLOCK_WIDTH,
          snapValue(
            startWidth +
              (moveEvent.clientX - startX) / currentZoom,
          ),
        );

        const imageHeight =
          startHeight !== null
            ? Math.max(
                MIN_IMAGE_HEIGHT,
                snapValue(
                  startHeight +
                    (moveEvent.clientY - startY) / currentZoom,
                ),
              )
            : null;

        onUpdateItem(id, item => ({
          ...item,
          width,
          ...(imageHeight !== null
            ? {
                imgHeight: imageHeight,
              }
            : {}),
        }));
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      zoomRef,
      snapValue,
      pushHistory,
      onUpdateItem,
    ],
  );

  return {
    handleFrameResize,
    handleBlockResize,
  };
}