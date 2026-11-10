import { createId } from '@/shared/lib/createId';
import { useCallback, useState } from 'react';

import type { RefObject } from 'react';

import type { BoardItem, LineItem, LineConnectionSide } from '@/entities/board/types';

import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

import {
  getItemRect,
  getRectBorderPoint,
  getConnectionAttachment,
  resolveLineItem,
} from '@/features/canvas/utils/lineGeometry';

import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';
import { ConnectionSide } from '../components/ConnectionHandles';
import { createEmptySibling } from '../utils/quickCreate';
import { snapToGrid } from '../utils/gridSnap';

interface AttachHover {
  id: string;
  side: LineConnectionSide;
  offset: number;
}

interface ProjectLike {
  items: BoardItem[];
}

interface UseLineDragOptions {
  projectRef: RefObject<ProjectLike>;
  zoomRef: RefObject<number>;

  measuredSizes: SizeMap;
  pushHistory: () => void;

  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;

  onAddItem: (item: BoardItem) => void;

  onDeleteItem: (id: string) => void;

  onSelectItems: (ids: string[]) => void;

  onOpenQuickCreate: (menu: {
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
    lineId: string;
    endpoint: 1 | 2;
  }) => void;
}

function hasConnection(items: BoardItem[], firstId: string, secondId: string, excludedLineId?: string): boolean {
  return items.some(
    (item) =>
      item.type === 'line' &&
      item.id !== excludedLineId &&
      item.startItemId &&
      item.endItemId &&
      ((item.startItemId === firstId && item.endItemId === secondId) ||
        (item.startItemId === secondId && item.endItemId === firstId)),
  );
}

export function useLineDrag({
  projectRef,
  zoomRef,
  measuredSizes,
  pushHistory,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onSelectItems,
  onOpenQuickCreate,
}: UseLineDragOptions) {
  const [attachHover, setAttachHoverState] = useState<AttachHover | null>(null);
  const attachHoverId = attachHover?.id ?? null;

  const setAttachHover = useCallback((hover: AttachHover | null) => {
    setAttachHoverState(hover);
  }, []);

  const findAttachTarget = useCallback(
    (x: number, y: number, excludedIds: Set<string>) => {
      const candidates = projectRef.current.items
        .filter((target) => {
          if (excludedIds.has(target.id) || target.type === 'line' || target.type === 'frame') {
            return false;
          }

          const size = measuredSizes.get(target.id) ?? getApproxItemSize(target);

          const tolerance = 12 / zoomRef.current;
          return (
            x >= target.x - tolerance &&
            y >= target.y - tolerance &&
            x <= target.x + size.width + tolerance &&
            y <= target.y + size.height + tolerance
          );
        })
        .map((target) => {
          const size = measuredSizes.get(target.id) ?? getApproxItemSize(target);

          return { target, area: size.width * size.height };
        })
        .sort((a, b) => {
          /*
           * Prefer concrete items
           * inside frames.
           */
          if (a.target.type !== 'frame' && b.target.type === 'frame') {
            return -1;
          }

          if (a.target.type === 'frame' && b.target.type !== 'frame') {
            return 1;
          }

          if (a.area !== b.area) {
            return a.area - b.area;
          }

          return b.target.zIndex - a.target.zIndex;
        });

      return candidates[0]?.target;
    },
    [projectRef, measuredSizes, zoomRef],
  );

  const getAttachHover = useCallback(
    (x: number, y: number, excludedIds: Set<string>): AttachHover | null => {
      const target = findAttachTarget(x, y, excludedIds);
      if (!target) return null;
      const attachment = getConnectionAttachment(getItemRect(target, measuredSizes), x, y);
      return { id: target.id, side: attachment.side, offset: attachment.offset };
    },
    [findAttachTarget, measuredSizes],
  );

  const handleLineEndpointDrag = useCallback(
    (id: string, event: React.MouseEvent, endpoint: 1 | 2) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const item = projectRef.current.items.find((current) => current.id === id && current.type === 'line') as
        | LineItem
        | undefined;

      if (!item || item.locked) {
        return;
      }

      pushHistory();

      const resolved = resolveLineItem(item, projectRef.current.items, measuredSizes);

      const originalX = endpoint === 1 ? resolved.x : resolved.x2;
      const originalY = endpoint === 1 ? resolved.y : resolved.y2;
      const oppositeTargetId = endpoint === 1 ? item.endItemId : item.startItemId;

      onUpdateItem(id, (current) => {
        if (current.type !== 'line') {
          return current;
        }

        return endpoint === 1
          ? {
              ...current,
              startItemId: undefined,
              startSide: undefined,
              startOffset: undefined,
              x: originalX,
              y: originalY,
            }
          : {
              ...current,
              endItemId: undefined,
              endSide: undefined,
              endOffset: undefined,
              x2: originalX,
              y2: originalY,
            };
      });

      const startX = event.clientX;
      const startY = event.clientY;
      const currentZoom = zoomRef.current;

      const handleMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startX) / currentZoom;
        const dy = (moveEvent.clientY - startY) / currentZoom;

        const x = item.divider ? snapToGrid(originalX + dx) : originalX + dx;
        const y = item.divider ? snapToGrid(originalY + dy) : originalY + dy;

        onUpdateItem(id, (current) => {
          if (current.type !== 'line') {
            return current;
          }

          return endpoint === 1 ? { ...current, x, y } : { ...current, x2: x, y2: y };
        });

        const excludedIds = new Set<string>([id]);

        if (oppositeTargetId) {
          excludedIds.add(oppositeTargetId);
        }

        setAttachHover(item.divider ? null : getAttachHover(x, y, excludedIds));
      };

      const handleUp = (mouseEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);

        const targetId = item.divider
          ? undefined
          : getAttachHover(
              originalX + (mouseEvent.clientX - startX) / currentZoom,
              originalY + (mouseEvent.clientY - startY) / currentZoom,
              new Set([id, ...(oppositeTargetId ? [oppositeTargetId] : [])]),
            )?.id;

        let attached = false;
        if (
          !item.divider &&
          targetId &&
          targetId !== oppositeTargetId &&
          (!oppositeTargetId || !hasConnection(projectRef.current.items, oppositeTargetId, targetId, id))
        ) {
          const target = projectRef.current.items.find((current) => current.id === targetId);

          if (target) {
            const dx = (mouseEvent.clientX - startX) / currentZoom;
            const dy = (mouseEvent.clientY - startY) / currentZoom;

            const { point, side, offset } = getConnectionAttachment(
              getItemRect(target, measuredSizes),
              originalX + dx,
              originalY + dy,
            );

            onUpdateItem(id, (current) => {
              if (current.type !== 'line') {
                return current;
              }

              return endpoint === 1
                ? { ...current, startItemId: target.id, startSide: side, startOffset: offset, x: point.x, y: point.y }
                : { ...current, endItemId: target.id, endSide: side, endOffset: offset, x2: point.x, y2: point.y };
            });
            attached = true;
          }
        }

        if (!item.divider && !attached) {
          const dx = (mouseEvent.clientX - startX) / currentZoom;
          const dy = (mouseEvent.clientY - startY) / currentZoom;
          onOpenQuickCreate({
            x: mouseEvent.clientX,
            y: mouseEvent.clientY,
            canvasX: originalX + dx,
            canvasY: originalY + dy,
            lineId: id,
            endpoint,
          });
        }

        setAttachHover(null);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [projectRef, zoomRef, measuredSizes, pushHistory, onUpdateItem, onOpenQuickCreate, setAttachHover, getAttachHover],
  );

  const handleQuickConnectStart = useCallback(
    (sourceId: string, event: React.MouseEvent, side: ConnectionSide) => {
      if (event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const source = projectRef.current.items.find((item) => item.id === sourceId);

      if (!source || source.type === 'line' || source.type === 'frame' || source.locked) {
        return;
      }

      const rect = getItemRect(source, measuredSizes);

      const centerX = rect.x + rect.width / 2;

      const centerY = rect.y + rect.height / 2;

      const initialOffset = 70;

      const initialEnd = {
        top: { x: centerX, y: rect.y - initialOffset },

        right: { x: rect.x + rect.width + initialOffset, y: centerY },

        bottom: { x: centerX, y: rect.y + rect.height + initialOffset },

        left: { x: rect.x - initialOffset, y: centerY },
      }[side];

      const startPoint = getRectBorderPoint(rect, initialEnd.x, initialEnd.y);

      const lineId = createId();

      const line: LineItem = {
        id: lineId,
        type: 'line',

        x: startPoint.x,
        y: startPoint.y,

        x2: initialEnd.x,
        y2: initialEnd.y,

        zIndex: 1,

        arrowStart: false,
        arrowEnd: true,
        staticAnchors: true,

        color: '#7C3AED',
        strokeWidth: 2,

        startItemId: sourceId,
        startSide: side,
        startOffset: 0.5,

        label: '',
        labelMode: 'horizontal',
        labelOffset: 14,
      };

      pushHistory();
      onAddItem(line);

      const startClientX = event.clientX;

      const startClientY = event.clientY;

      const zoom = zoomRef.current;

      let moved = false;

      const handleMove = (moveEvent: MouseEvent) => {
        if (!moved && Math.hypot(moveEvent.clientX - startClientX, moveEvent.clientY - startClientY) < 6) return;
        moved = true;

        const dx = (moveEvent.clientX - startClientX) / zoom;

        const dy = (moveEvent.clientY - startClientY) / zoom;

        const x = startPoint.x + dx;

        const y = startPoint.y + dy;

        onUpdateItem(lineId, (current) => {
          if (current.type !== 'line') {
            return current;
          }

          return { ...current, x2: x, y2: y };
        });

        setAttachHover(getAttachHover(x, y, new Set([sourceId, lineId])));
      };

      const handleUp = (mouseEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMove);

        document.removeEventListener('mouseup', handleUp);

        const targetId = getAttachHover(
          startPoint.x + (mouseEvent.clientX - startClientX) / zoom,
          startPoint.y + (mouseEvent.clientY - startClientY) / zoom,
          new Set([sourceId, lineId]),
        )?.id;

        // A short click creates a connected blank sibling.
        if (!moved) {
          const sibling = createEmptySibling(source);
          if (!sibling) {
            onDeleteItem(lineId);
            setAttachHover(null);
            return;
          }
          const size = getApproxItemSize(sibling);
          const width = sibling.width ?? rect.width;
          const height = sibling.height ?? Math.max(size.height, rect.height);
          sibling.width = width;
          sibling.height = height;
          const offset = {
            top: { x: rect.x, y: rect.y - height - 64 },
            right: { x: rect.x + rect.width + 64, y: rect.y },
            bottom: { x: rect.x, y: rect.y + rect.height + 64 },
            left: { x: rect.x - width - 64, y: rect.y },
          }[side];
          sibling.x = offset.x;
          sibling.y = offset.y;
          // Repeated clicks advance in the chosen direction instead of stacking cards.
          const overlaps = () =>
            projectRef.current.items.some((other) => {
              if (other.type === 'line' || other.type === 'frame') return false;
              const bounds = getItemRect(other, measuredSizes);
              return (
                sibling.x < bounds.x + bounds.width &&
                sibling.x + width > bounds.x &&
                sibling.y < bounds.y + bounds.height &&
                sibling.y + height > bounds.y
              );
            });
          while (overlaps()) {
            if (side === 'left') sibling.x -= width + 64;
            if (side === 'right') sibling.x += width + 64;
            if (side === 'top') sibling.y -= height + 64;
            if (side === 'bottom') sibling.y += height + 64;
          }
          onAddItem(sibling);
          onUpdateItem(lineId, (current) =>
            current.type === 'line'
              ? {
                  ...current,
                  endItemId: sibling.id,
                  endSide: ({ top: 'bottom', right: 'left', bottom: 'top', left: 'right' } as const)[side],
                  endOffset: 0.5,
                  x2: sibling.x + width / 2,
                  y2: sibling.y + height / 2,
                }
              : current,
          );
          onSelectItems([sibling.id]);
          setAttachHover(null);
          return;
        }

        let attached = false;
        if (targetId) {
          const target = projectRef.current.items.find((item) => item.id === targetId);

          if (target && !hasConnection(projectRef.current.items, sourceId, target.id, lineId)) {
            const dx = (mouseEvent.clientX - startClientX) / zoom;

            const dy = (mouseEvent.clientY - startClientY) / zoom;

            const x = startPoint.x + dx;

            const y = startPoint.y + dy;

            const {
              point,
              side: targetSide,
              offset,
            } = getConnectionAttachment(getItemRect(target, measuredSizes), x, y);

            onUpdateItem(lineId, (current) => {
              if (current.type !== 'line') {
                return current;
              }

              return {
                ...current,

                endItemId: target.id,
                endSide: targetSide,
                endOffset: offset,

                x2: point.x,
                y2: point.y,
              };
            });
            attached = true;
          } else if (target) {
            onDeleteItem(lineId);
            setAttachHover(null);
            return;
          }
        }

        setAttachHover(null);

        onSelectItems([lineId]);

        if (!attached) {
          const dx = (mouseEvent.clientX - startClientX) / zoom;
          const dy = (mouseEvent.clientY - startClientY) / zoom;
          onOpenQuickCreate({
            x: mouseEvent.clientX,
            y: mouseEvent.clientY,
            canvasX: startPoint.x + dx,
            canvasY: startPoint.y + dy,
            lineId,
            endpoint: 2,
          });
        }
      };

      document.addEventListener('mousemove', handleMove);

      document.addEventListener('mouseup', handleUp);
    },
    [
      projectRef,
      measuredSizes,
      zoomRef,
      pushHistory,
      onAddItem,
      onDeleteItem,
      onUpdateItem,
      onSelectItems,
      onOpenQuickCreate,
      getAttachHover,
      setAttachHover,
    ],
  );

  return { attachHoverId, attachHover, handleLineEndpointDrag, handleQuickConnectStart };
}
