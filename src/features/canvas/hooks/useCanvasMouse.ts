import { useCallback, useState } from 'react';

import type { RefObject } from 'react';

import type { BoardItem } from '@/entities/board/types';
import type { ToolType } from '@/entities/board/toolTypes';
import type {
  CanvasPoint,
  FrameDraft,
  SelectionBox,
} from '@/features/canvas/types';

import { createCanvasItem } from '@/features/canvas/utils/createCanvasItem';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';
import { getContainedItemIds } from '@/features/canvas/utils/itemGeometry';

interface ProjectLike {
  items: BoardItem[];
}

interface UseCanvasMouseOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  projectRef: RefObject<ProjectLike>;
  selectedIdsRef: RefObject<string[]>;
  panRef: RefObject<CanvasPoint>;

  selectedTool: ToolType;
  pan: CanvasPoint;

  measuredSizes: SizeMap;
  onFramePreviewChange: (ids: string[]) => void;

  screenToCanvas: (
    screenX: number,
    screenY: number,
  ) => CanvasPoint;

  snapValue: (value: number) => number;
  pushHistory: () => void;
  onPanChange: (pan: CanvasPoint) => void;
  onAddItem: (item: BoardItem) => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectItems: (ids: string[]) => void;
  triggerEnterAnimation: (id: string) => void;
}

export function useCanvasMouse({
  containerRef,
  projectRef,
  selectedIdsRef,
  panRef,
  selectedTool,
  pan,
  measuredSizes,
  onFramePreviewChange,
  screenToCanvas,
  snapValue,
  pushHistory,
  onPanChange,
  onAddItem,
  onSelectTool,
  onSelectItems,
  triggerEnterAnimation,
}: UseCanvasMouseOptions) {
  const [frameDraft, setFrameDraft] = useState<FrameDraft | null>(
    null,
  );

  const [lasso, setLasso] = useState<SelectionBox | null>(null);

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (event.button === 1) {
        event.preventDefault();

        const startX = event.clientX;
        const startY = event.clientY;
        const startPan = { ...panRef.current };

        const handleMove = (moveEvent: MouseEvent) => {
          onPanChange({
            x: startPan.x + moveEvent.clientX - startX,
            y: startPan.y + moveEvent.clientY - startY,
          });
        };

        const handleUp = () => {
          document.removeEventListener('mousemove', handleMove);
          document.removeEventListener('mouseup', handleUp);
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);

        return;
      }

      if (event.button !== 0) {
        return;
      }

      const target = event.target as Element;

      if (target.closest('[data-board-item]')) {
        return;
      }

      const container = containerRef.current;

      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();

      event.preventDefault();

      const startScreenX = event.clientX - rect.left;
      const startScreenY = event.clientY - rect.top;

      const startCanvas = screenToCanvas(
        startScreenX,
        startScreenY,
      );

      const panAtDown = { ...pan };

      if (selectedTool === 'frame') {
        const handleMove = (moveEvent: MouseEvent) => {
          const current = screenToCanvas(
            moveEvent.clientX - rect.left,
            moveEvent.clientY - rect.top,
          );

          const left = snapValue(Math.min(startCanvas.x, current.x));
          const top = snapValue(Math.min(startCanvas.y, current.y));
          const right = snapValue(Math.max(startCanvas.x, current.x));
          const bottom = snapValue(Math.max(startCanvas.y, current.y));

          setFrameDraft({
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
          });

          const previewIds = getContainedItemIds(
            projectRef.current.items,
            {
              x: left,
              y: top,
              width: right - left,
              height: bottom - top,
              right,
              bottom,
            },
            measuredSizes,
          );

          onFramePreviewChange(previewIds);
        };

        const handleUp = (upEvent: MouseEvent) => {
          document.removeEventListener('mousemove', handleMove);
          document.removeEventListener('mouseup', handleUp);

          setFrameDraft(null);

          const current = screenToCanvas(
            upEvent.clientX - rect.left,
            upEvent.clientY - rect.top,
          );

          const left = snapValue(Math.min(startCanvas.x, current.x));
          const top = snapValue(Math.min(startCanvas.y, current.y));
          const right = snapValue(Math.max(startCanvas.x, current.x));
          const bottom = snapValue(Math.max(startCanvas.y, current.y));

          const width = right - left;
          const height = bottom - top;

          const item =
            width > 40 && height > 40
              ? createCanvasItem('frame', left, top, { width, height })
              : createCanvasItem(
                  'frame',
                  snapValue(startCanvas.x - 80),
                  snapValue(startCanvas.y - 40),
                );

          if (!item || item.type !== 'frame') {
            onFramePreviewChange([]);
            return;
          }

          const containedIds = getContainedItemIds(
            projectRef.current.items,
            {
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
              right: item.x + item.width,
              bottom: item.y + item.height,
            },
            measuredSizes,
          );

          pushHistory();
          onAddItem(item);
          triggerEnterAnimation(item.id);

          onFramePreviewChange([]);
          onSelectItems([item.id, ...containedIds]);
          onSelectTool('select');
        };

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleUp);

        return;
      }

      if (selectedTool !== 'select') {
        const handleUp = (upEvent: MouseEvent) => {
          document.removeEventListener('mouseup', handleUp);

          const point = screenToCanvas(
            upEvent.clientX - rect.left,
            upEvent.clientY - rect.top,
          );

          const item = createCanvasItem(
            selectedTool,
            snapValue(point.x),
            snapValue(point.y),
          );

          if (!item) {
            return;
          }

          pushHistory();
          onAddItem(item);
          triggerEnterAnimation(item.id);
          onSelectTool('select');
        };

        document.addEventListener('mouseup', handleUp);

        return;
      }

      if (!event.shiftKey) {
        onSelectItems([]);
      }

      let endCanvas = { ...startCanvas };
      let hasMoved = false;

      const handleMove = (moveEvent: MouseEvent) => {
        hasMoved = true;

        endCanvas = screenToCanvas(
          moveEvent.clientX - rect.left,
          moveEvent.clientY - rect.top,
        );

        setLasso({
          x1: Math.min(startCanvas.x, endCanvas.x),
          y1: Math.min(startCanvas.y, endCanvas.y),
          x2: Math.max(startCanvas.x, endCanvas.x),
          y2: Math.max(startCanvas.y, endCanvas.y),
        });

        void panAtDown;
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);

        setLasso(null);

        if (!hasMoved) {
          return;
        }

        const box = {
          x1: Math.min(startCanvas.x, endCanvas.x),
          y1: Math.min(startCanvas.y, endCanvas.y),
          x2: Math.max(startCanvas.x, endCanvas.x),
          y2: Math.max(startCanvas.y, endCanvas.y),
        };

        const idsInBox = projectRef.current.items
          .filter(
            item =>
              item.type !== 'frame' &&
              item.x >= box.x1 &&
              item.y >= box.y1 &&
              item.x <= box.x2 &&
              item.y <= box.y2,
          )
          .map(item => item.id);

        if (event.shiftKey) {
          const current = selectedIdsRef.current;

          const merged = [
            ...current,
            ...idsInBox.filter(id => !current.includes(id)),
          ];

          onSelectItems(merged);

          return;
        }

        onSelectItems(idsInBox);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      containerRef,
      projectRef,
      selectedIdsRef,
      panRef,
      selectedTool,
      pan,
      screenToCanvas,
      snapValue,
      pushHistory,
      onPanChange,
      onAddItem,
      onSelectTool,
      onSelectItems,
      triggerEnterAnimation,
    ],
  );

  return {
    frameDraft,
    lasso,
    handleCanvasMouseDown,
    measuredSizes,
    onFramePreviewChange,
  };
}