import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from './lineGeometry';
import { getItemRect } from './itemGeometry';
import { CANVAS_GRID_SIZE, FRAME_AUTO_EXPAND_PADDING } from '../constants';

export function growsAutomatically(item: BoardItem): boolean {
  if (item.type === 'frame' || item.type === 'line' || item.type === 'drawing') return false;
  if (item.type === 'document' || item.type === 'code') return item.autoHeight ?? !item.height;
  return item.height === undefined;
}

/** Push only cards that were below the old bounds, preserving intentional overlaps. */
export function autoGrowthLayout(items: BoardItem[], sourceId: string, before: SizeMap, after: SizeMap): Map<string, Partial<BoardItem>> {
  const patches = new Map<string, Partial<BoardItem>>();
  const source = items.find(item => item.id === sourceId);
  if (!source || !growsAutomatically(source)) return patches;
  const oldSize = before.get(sourceId), newSize = after.get(sourceId);
  if (!oldSize || !newSize || newSize.height <= oldSize.height + .5) return patches;
  const queue = [source];
  const bounds = (item: BoardItem, sizes: SizeMap) => {
    const rect = getItemRect(item, sizes);
    return item.type === 'line' ? { ...rect, x: Math.min(item.x, item.x2), y: Math.min(item.y, item.y2), right: Math.max(item.x, item.x2), bottom: Math.max(item.y, item.y2) } : rect;
  };
  const original = new Map(items.map(item => [item.id, bounds(item, before)]));
  const rect = (item: BoardItem) => bounds({ ...item, ...patches.get(item.id) } as BoardItem, after);
  while (queue.length) {
    const growing = queue.shift()!;
    const old = original.get(growing.id)!;
    const current = rect(growing);
    for (const item of items) {
      if ((item.frameId ?? null) !== (growing.frameId ?? null) || item.id === growing.id || item.type === 'frame' || item.locked || (item.type === 'line' && (item.startItemId || item.endItemId))) continue;
      const targetBefore = original.get(item.id)!;
      const target = rect(item);
      if (targetBefore.y <= old.y + .5 || targetBefore.y < old.bottom - .5 || target.x >= current.x + current.width || target.x + target.width <= current.x) continue;
      const nextY = current.y + current.height + CANVAS_GRID_SIZE;
      if (target.y >= nextY - .5) continue;
      const patch: Partial<BoardItem> = { y: item.y + nextY - targetBefore.y };
      if (item.type === 'line') Object.assign(patch, { y2: item.y2 + nextY - targetBefore.y });
      patches.set(item.id, patch);
      queue.push(item);
    }
  }
  // Expand only the owning frames, without moving their other contents.
  const affected = new Set([sourceId, ...patches.keys()]);
  for (const frame of items) {
    if (frame.type !== 'frame' || frame.locked) continue;
    let height = frame.height;
    for (const item of items) {
      if (!affected.has(item.id) || item.frameId !== frame.id) continue;
      const next = rect(item);
      height = Math.max(height, next.y + next.height - frame.y + FRAME_AUTO_EXPAND_PADDING);
    }
    if (height > frame.height) patches.set(frame.id, { height });
  }
  return patches;
}
