import { useEffect, useMemo, useState } from 'react';

import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

import { getItemRect } from '@/features/canvas/utils/itemGeometry';

interface CanvasPoint {
  x: number;
  y: number;
}

interface UseCanvasLostStateOptions {
  items: BoardItem[];
  measuredSizes: SizeMap;

  pan: CanvasPoint;
  zoom: number;

  viewportWidth: number;
  viewportHeight: number;

  delay?: number;
}

export function useCanvasLostState({
  items,
  measuredSizes,
  pan,
  zoom,
  viewportWidth,
  viewportHeight,
  delay = 900,
}: UseCanvasLostStateOptions) {
  const [isLost, setIsLost] = useState(false);

  const hasVisibleItem = useMemo(() => {
    if (
      items.length === 0 ||
      viewportWidth <= 0 ||
      viewportHeight <= 0
    ) {
      return true;
    }

    /*
     * Convert screen viewport into canvas coordinates.
     */

    const viewportLeft =
      -pan.x / zoom;

    const viewportTop =
      -pan.y / zoom;

    const viewportRight =
      viewportLeft +
      viewportWidth / zoom;

    const viewportBottom =
      viewportTop +
      viewportHeight / zoom;

    return items.some(item => {
      const rect = getItemRect(
        item,
        measuredSizes,
      );

      return (
        rect.right >= viewportLeft &&
        rect.x <= viewportRight &&
        rect.bottom >= viewportTop &&
        rect.y <= viewportBottom
      );
    });
  }, [
    items,
    measuredSizes,
    pan.x,
    pan.y,
    zoom,
    viewportWidth,
    viewportHeight,
  ]);

  useEffect(() => {
    if (hasVisibleItem) {
      setIsLost(false);
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setIsLost(true);
      },
      delay,
    );

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasVisibleItem, delay]);

  return {
    isLost,
  };
}