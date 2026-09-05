import { useCallback, useRef, useState } from 'react';

import type { RefObject } from 'react';

import type {
  BoardItem,
  LineItem,
} from '@/entities/board/types';

import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

import {
  getItemRect,
  getRectBorderPoint,
  resolveLineItem,
} from '@/features/canvas/utils/lineGeometry';

import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';

interface ProjectLike {
  items: BoardItem[];
}

interface UseLineDragOptions {
  projectRef: RefObject<ProjectLike>;
  zoomRef: RefObject<number>;

  measuredSizes: SizeMap;
  pushHistory: () => void;

  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;
}

export function useLineDrag({
  projectRef,
  zoomRef,
  measuredSizes,
  pushHistory,
  onUpdateItem,
}: UseLineDragOptions) {
  const [attachHoverId, setAttachHoverId] =
    useState<string | null>(null);

  const attachHoverIdRef = useRef<string | null>(null);

  const setAttachHover = useCallback((id: string | null) => {
    attachHoverIdRef.current = id;
    setAttachHoverId(id);
  }, []);

  const handleLineEndpointDrag = useCallback(
    (
      id: string,
      event: React.MouseEvent,
      endpoint: 1 | 2,
    ) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const item = projectRef.current.items.find(
        current =>
          current.id === id &&
          current.type === 'line',
      ) as LineItem | undefined;

      if (!item) {
        return;
      }

      pushHistory();

      const resolved = resolveLineItem(
        item,
        projectRef.current.items,
        measuredSizes,
      );

      const originalX = endpoint === 1 ? resolved.x : resolved.x2;
      const originalY = endpoint === 1 ? resolved.y : resolved.y2;
      const oppositeTargetId = endpoint === 1 ? item.endItemId : item.startItemId;

      onUpdateItem(id, current => {
        if (current.type !== 'line') {
          return current;
        }

        return endpoint === 1
          ? {
              ...current,
              startItemId: undefined,
              x: originalX,
              y: originalY,
            }
          : {
              ...current,
              endItemId: undefined,
              x2: originalX,
              y2: originalY,
            };
      });

      const startX = event.clientX;
      const startY = event.clientY;
      const currentZoom = zoomRef.current;

      const findTarget = (x: number, y: number) => {
        const candidates = projectRef.current.items
          .filter(target => {
            if (target.id === id || target.type === 'line' || target.id === oppositeTargetId) return false;

            const size = measuredSizes.get(target.id) ?? getApproxItemSize(target);

            return (
              x >= target.x &&
              y >= target.y &&
              x <= target.x + size.width &&
              y <= target.y + size.height
            );
          })
          .map(target => {
            const size = measuredSizes.get(target.id) ?? getApproxItemSize(target);

            return {
              target,
              area: size.width * size.height,
            };
          })
          .sort((a, b) => {
            if (a.target.type !== 'frame' && b.target.type === 'frame') return -1;
            if (a.target.type === 'frame' && b.target.type !== 'frame') return 1;

            if (a.area !== b.area) return a.area - b.area;

            return b.target.zIndex - a.target.zIndex;
          });

        return candidates[0]?.target;
      };

      const handleMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startX) / currentZoom;
        const dy = (moveEvent.clientY - startY) / currentZoom;

        const x = originalX + dx;
        const y = originalY + dy;

        onUpdateItem(id, current => {
          if (current.type !== 'line') {
            return current;
          }

          return endpoint === 1
            ? {
                ...current,
                x,
                y,
              }
            : {
                ...current,
                x2: x,
                y2: y,
              };
        });

        setAttachHover(findTarget(x, y)?.id ?? null);
      };

      const handleUp = (mouseEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);

        const targetId = attachHoverIdRef.current;

        if (targetId && targetId !== oppositeTargetId) {
          const target = projectRef.current.items.find(
            current => current.id === targetId,
          );

          if (target) {
            const dx = (mouseEvent.clientX - startX) / currentZoom;
            const dy = (mouseEvent.clientY - startY) / currentZoom;

            const point = getRectBorderPoint(
              getItemRect(target, measuredSizes),
              originalX + dx,
              originalY + dy,
            );

            onUpdateItem(id, current => {
              if (current.type !== 'line') {
                return current;
              }

              return endpoint === 1
                ? {
                    ...current,
                    startItemId: target.id,
                    x: point.x,
                    y: point.y,
                  }
                : {
                    ...current,
                    endItemId: target.id,
                    x2: point.x,
                    y2: point.y,
                  };
            });
          }
        }

        setAttachHover(null);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      projectRef,
      zoomRef,
      measuredSizes,
      pushHistory,
      onUpdateItem,
      setAttachHover,
    ],
  );

  return {
    attachHoverId,
    handleLineEndpointDrag,
  };
}