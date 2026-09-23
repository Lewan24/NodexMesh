import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { BoardItem, ColumnItem, FrameItem, LineItem } from '@/entities/board/types';
import type { ToolType } from '@/entities/board/toolTypes';
import { DROPPABLE_ON_COLUMN } from '@/features/canvas/constants';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';
import { getItemSize } from '@/features/canvas/utils/itemGeometry';
import { isFrameMovementLocked } from '../utils/frameGeometry';
import { AlignmentGuide, findAlignmentSnap } from '../utils/alignmentGuides';
import { snapToGrid } from '../utils/gridSnap';

export interface ItemDropPreview {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragGeometry {
  x: number;
  y: number;
  x2?: number;
  y2?: number;
}

interface ProjectLike {
  items: BoardItem[];
}

interface DragCapture extends DragGeometry {
  isLine: boolean;
  divider: boolean;
}

interface UseItemDragOptions {
  projectRef: RefObject<ProjectLike>;
  selectedIdsRef: RefObject<string[]>;
  zoomRef: RefObject<number>;
  measuredSizes: SizeMap;
  collaboratorLockedIds?: ReadonlySet<string>;
  snapEnabled: boolean;
  snapValue: (value: number) => number;
  pushHistory: () => void;
  onSelectItems: (ids: string[]) => void;
  onSelectTool: (tool: ToolType) => void;
  onUpdateItems: (updates: ReadonlyMap<string, (item: BoardItem) => BoardItem>) => void;
  onDropOnColumn: (itemId: string, columnId: string) => void;
  clearColumnSelection: () => void;
}

function geometryAt(capture: DragCapture, dx: number, dy: number): DragGeometry {
  const snap = capture.divider ? snapToGrid : (value: number) => value;
  return {
    x: snap(capture.x + dx),
    y: snap(capture.y + dy),
    ...(capture.isLine ? { x2: snap(capture.x2! + dx), y2: snap(capture.y2! + dy) } : {}),
  };
}

export function useItemDrag({
  projectRef,
  selectedIdsRef,
  zoomRef,
  snapEnabled,
  measuredSizes,
  collaboratorLockedIds,
  snapValue,
  pushHistory,
  onSelectItems,
  onSelectTool,
  onUpdateItems,
  onDropOnColumn,
  clearColumnSelection,
}: UseItemDragOptions) {
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const [dragOverrides, setDragOverrides] = useState<ReadonlyMap<string, DragGeometry>>(new Map());
  const [dropPreview, setDropPreview] = useState<ItemDropPreview | null>(null);
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuide[]>([]);
  const [dragTilt, setDragTilt] = useState(0);
  const dragOverColumnIdRef = useRef<string | null>(null);
  const activeDragCleanup = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      // Pointer release and window blur commit. Removing the canvas cancels an
      // unfinished gesture so stale document listeners cannot mutate a new board.
      activeDragCleanup.current?.();
    },
    [],
  );

  const setColumnHover = useCallback((columnId: string | null) => {
    dragOverColumnIdRef.current = columnId;
    setDragOverColumnId(columnId);
  }, []);

  const handleItemMouseDown = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.button !== 0) return;

      const target = event.target as Element;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      event.preventDefault();
      event.stopPropagation();
      clearColumnSelection();
      onSelectTool('select');

      const currentSelected = selectedIdsRef.current;
      const isSelected = currentSelected.includes(id);
      const newSelected = event.shiftKey
        ? isSelected
          ? currentSelected.filter((currentId) => currentId !== id)
          : [...currentSelected, id]
        : isSelected
          ? currentSelected
          : [id];

      onSelectItems(newSelected);
      const dragIds = newSelected.includes(id) ? newSelected : [id];
      const items = projectRef.current.items;
      const clickedItem = items.find((item) => item.id === id);
      const movementLocked = (item: BoardItem) =>
        !!item.locked ||
        collaboratorLockedIds?.has(item.id) ||
        (item.type === 'frame' && isFrameMovementLocked(item, items, measuredSizes));

      if (clickedItem && movementLocked(clickedItem)) return;

      const captureMap = new Map<string, DragCapture>();
      const capture = (item: BoardItem) => {
        const line = item.type === 'line' ? (item as LineItem) : null;
        captureMap.set(item.id, {
          x: item.x,
          y: item.y,
          isLine: Boolean(line),
          divider: Boolean(line?.divider),
          x2: line?.x2,
          y2: line?.y2,
        });
      };

      for (const dragId of dragIds) {
        const item = items.find((current) => current.id === dragId);
        if (!item || movementLocked(item)) continue;
        capture(item);

        if (item.type === 'frame') {
          const frame = item as FrameItem;
          items
            .filter(
              (child) =>
                !movementLocked(child) &&
                !dragIds.includes(child.id) &&
                !captureMap.has(child.id) &&
                child.type !== 'frame' &&
                child.frameId === frame.id,
            )
            .forEach(capture);
        }
      }

      if (captureMap.size === 0) return;

      const capturedIds = new Set(captureMap.keys());
      const startX = event.clientX;
      const startY = event.clientY;
      const currentZoom = zoomRef.current;
      const singleDragId = dragIds.length === 1 ? dragIds[0] : null;
      const singleDragItem = singleDragId ? items.find((item) => item.id === singleDragId) : undefined;
      const canDropOnColumn = singleDragItem ? DROPPABLE_ON_COLUMN.has(singleDragItem.type) : false;

      let hasMoved = false;
      let lastDx = 0;
      let lastDy = 0;
      let lastPlacement: { x: number; y: number } | null = null;
      let previousClientX = event.clientX;
      let pendingMove: MouseEvent | null = null;
      let frame: number | null = null;
      let finished = false;

      const flushMove = () => {
        frame = null;
        const moveEvent = pendingMove;
        pendingMove = null;
        if (!moveEvent || finished) return;

        if (!hasMoved) {
          pushHistory();
          setDraggingIds(Array.from(captureMap.keys()));
        }
        hasMoved = true;
        lastDx = (moveEvent.clientX - startX) / currentZoom;
        lastDy = (moveEvent.clientY - startY) / currentZoom;

        const movementX = moveEvent.clientX - previousClientX;
        previousClientX = moveEvent.clientX;
        setDragTilt(Math.max(-3, Math.min(3, movementX * 0.35)));

        const primaryCapture = captureMap.get(id);
        const primaryItem = items.find((item) => item.id === id);
        if (primaryCapture && primaryItem && primaryItem.type !== 'line') {
          const rawX = primaryCapture.x + lastDx;
          const rawY = primaryCapture.y + lastDy;
          const size = getItemSize(primaryItem, measuredSizes);
          const alignment = findAlignmentSnap({
            x: rawX,
            y: rawY,
            width: size.width,
            height: size.height,
            items: projectRef.current.items,
            excludedIds: capturedIds,
            measuredSizes,
            threshold: 8 / currentZoom,
          });
          const previewX = alignment.x ?? snapValue(rawX);
          const previewY = alignment.y ?? snapValue(rawY);
          lastPlacement = { x: previewX, y: previewY };
          setAlignmentGuides(alignment.guides);
          setDropPreview({ x: previewX, y: previewY, width: size.width, height: size.height });
        } else {
          lastPlacement = null;
          setAlignmentGuides([]);
          setDropPreview(null);
        }

        setDragOverrides(
          new Map(
            Array.from(captureMap, ([capturedId, captured]) => [capturedId, geometryAt(captured, lastDx, lastDy)]),
          ),
        );

        if (canDropOnColumn && singleDragItem && singleDragId) {
          const primary = captureMap.get(singleDragId);
          const nextX = (primary?.x ?? 0) + lastDx;
          const nextY = (primary?.y ?? 0) + lastDy;
          const hovered = projectRef.current.items.find((item) => {
            if (item.type !== 'column' || dragIds.includes(item.id)) return false;
            const column = item as ColumnItem;
            return (
              nextX >= column.x - 20 &&
              nextY >= column.y - 20 &&
              nextX <= column.x + column.width + 20 &&
              nextY <= column.y + 500
            );
          });
          setColumnHover(hovered?.id ?? null);
        }
      };

      const handleMove = (moveEvent: MouseEvent) => {
        pendingMove = moveEvent;
        if (frame === null) frame = requestAnimationFrame(flushMove);
      };

      const cleanup = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        window.removeEventListener('blur', handleUp);
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        pendingMove = null;
        if (activeDragCleanup.current === cleanup) activeDragCleanup.current = null;
      };

      const handleUp = () => {
        if (finished) return;
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        flushMove();
        finished = true;
        cleanup();

        setDraggingIds([]);
        setDragOverrides(new Map());
        setDropPreview(null);
        setDragTilt(0);
        setAlignmentGuides([]);

        const columnId = dragOverColumnIdRef.current;
        setColumnHover(null);
        if (hasMoved && columnId && singleDragItem && canDropOnColumn) {
          onDropOnColumn(singleDragItem.id, columnId);
          onSelectItems([]);
          return;
        }

        if (hasMoved) {
          const primary = captureMap.get(id);
          const rawX = (primary?.x ?? 0) + lastDx;
          const rawY = (primary?.y ?? 0) + lastDy;
          const finalX = primary?.divider
            ? snapToGrid(rawX)
            : (lastPlacement?.x ?? (snapEnabled ? snapValue(rawX) : rawX));
          const finalY = primary?.divider
            ? snapToGrid(rawY)
            : (lastPlacement?.y ?? (snapEnabled ? snapValue(rawY) : rawY));
          const finalDx = lastDx + finalX - rawX;
          const finalDy = lastDy + finalY - rawY;
          const updates = new Map<string, (item: BoardItem) => BoardItem>();

          captureMap.forEach((captured, capturedId) => {
            const geometry = geometryAt(captured, finalDx, finalDy);
            updates.set(capturedId, (current) => ({ ...current, ...geometry }));
          });
          onUpdateItems(updates);
        } else if (!event.shiftKey && dragIds.length > 1) {
          onSelectItems([id]);
        }
      };

      activeDragCleanup.current?.();
      activeDragCleanup.current = cleanup;
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
      window.addEventListener('blur', handleUp);
    },
    [
      projectRef,
      selectedIdsRef,
      zoomRef,
      snapEnabled,
      measuredSizes,
      collaboratorLockedIds,
      snapValue,
      pushHistory,
      onSelectItems,
      onSelectTool,
      onUpdateItems,
      onDropOnColumn,
      clearColumnSelection,
      setColumnHover,
    ],
  );

  return { dragOverColumnId, draggingIds, dragOverrides, dropPreview, alignmentGuides, dragTilt, handleItemMouseDown };
}
