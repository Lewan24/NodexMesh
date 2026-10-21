import { useMemo } from 'react';
import type { BoardItem } from '@/entities/board/types';
import type { DragGeometry } from '../types';
import type { SizeMap } from '../utils/lineGeometry';
import { getCanvasLayers, indexCanvasGeometry, resolveCanvasItems } from '../utils/canvasRenderModel';
import { getFrameMovementLockedIds } from '../utils/frameGeometry';

export function useCanvasRenderModel(
  items: BoardItem[],
  dragOverrides: ReadonlyMap<string, DragGeometry>,
  measuredSizes: SizeMap,
) {
  const layers = useMemo(() => getCanvasLayers(items), [items]);
  const byId = useMemo(() => indexCanvasGeometry(items, dragOverrides), [items, dragOverrides]);
  const frames = useMemo(() => layers.frames.map((frame) => byId.get(frame.id) as typeof frame), [layers, byId]);
  const renderedItems = useMemo(
    () => resolveCanvasItems(layers.regularItems, byId, measuredSizes),
    [layers, byId, measuredSizes],
  );
  const lockedFrameIds = useMemo(() => getFrameMovementLockedIds(items), [items]);

  return { frames, regularItems: layers.regularItems, renderedItems, lockedFrameIds };
}
