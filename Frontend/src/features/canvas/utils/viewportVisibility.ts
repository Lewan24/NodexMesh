import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from './lineGeometry';
import { getApproxItemSize } from './itemGeometry';
import { CANVAS_VIEWPORT_OVERSCAN } from '../constants';

export interface CanvasViewport {
  pan: { x: number; y: number };
  zoom: number;
  width: number;
  height: number;
}

// Stateful editors/columns and connection curves retain their mounted state.
const cullableTypes = new Set(['note', 'text', 'icon', 'image', 'link', 'drawing']);

export function isCanvasItemVisible(
  item: BoardItem,
  viewport: CanvasViewport,
  sizes: SizeMap,
  measuredItems: ReadonlyMap<string, BoardItem>,
  retainedIds: ReadonlySet<string>,
  overscan = CANVAS_VIEWPORT_OVERSCAN,
): boolean {
  if (!cullableTypes.has(item.type) || retainedIds.has(item.id) || item.customCss?.enabled) return true;
  if (viewport.width <= 0 || viewport.height <= 0 || !Number.isFinite(viewport.zoom) || viewport.zoom <= 0) return true;
  const fixedBounds = item.type === 'drawing' || (item.type === 'note' && item.height !== undefined && item.height > 0);
  // Unknown or remotely changed auto-sized content gets measured before culling.
  if (!fixedBounds && measuredItems.get(item.id) !== item) return true;
  return intersectsCanvasViewport(item, viewport, sizes, overscan);
}

/** Geometry-only query, also used for previews whose stateful editors must stay mounted. */
export function intersectsCanvasViewport(
  item: BoardItem,
  viewport: CanvasViewport,
  sizes: SizeMap,
  overscan = CANVAS_VIEWPORT_OVERSCAN,
): boolean {
  if (viewport.width <= 0 || viewport.height <= 0 || !Number.isFinite(viewport.zoom) || viewport.zoom <= 0) return true;
  const approximate = getApproxItemSize(item);
  const measured = sizes.get(item.id);
  const width = Math.max(approximate.width, measured?.width ?? 0);
  const height = Math.max(approximate.height, measured?.height ?? 0);
  const left = (-viewport.pan.x - overscan) / viewport.zoom;
  const top = (-viewport.pan.y - overscan) / viewport.zoom;
  const right = (viewport.width - viewport.pan.x + overscan) / viewport.zoom;
  const bottom = (viewport.height - viewport.pan.y + overscan) / viewport.zoom;
  return item.x + width >= left && item.x <= right && item.y + height >= top && item.y <= bottom;
}
