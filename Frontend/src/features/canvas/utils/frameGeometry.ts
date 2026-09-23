import type { BoardItem, FrameItem } from '@/entities/board/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

import { getItemRect } from '@/features/canvas/utils/itemGeometry';

export function isItemInsideFrame(item: BoardItem, frame: FrameItem, sizes?: SizeMap): boolean {
  if (item.id === frame.id) return false;

  const itemRect = getItemRect(item, sizes);
  const frameRect = getItemRect(frame, sizes);

  return (
    itemRect.x >= frameRect.x &&
    itemRect.y >= frameRect.y &&
    itemRect.right <= frameRect.right &&
    itemRect.bottom <= frameRect.bottom
  );
}

export function getFrameContents(frame: FrameItem, items: BoardItem[], _sizes?: SizeMap): BoardItem[] {
  return items.filter((item) => item.frameId === frame.id);
}

function containsLockedItem(item: BoardItem): boolean {
  return !!item.locked || (item.type === 'column' && item.items.some(containsLockedItem));
}

/** Derived from current contents; unlocking/removing a child immediately releases the frame. */
export function isFrameMovementLocked(frame: FrameItem, items: BoardItem[], _sizes?: SizeMap): boolean {
  const children = items.filter((item) => item.frameId === frame.id);
  return (
    !!frame.locked ||
    children.some((item) => containsLockedItem(item) || (item.type === 'frame' && isFrameMovementLocked(item, items)))
  );
}

export function wouldCreateFrameCycle(itemId: string, frameId: string, items: BoardItem[]): boolean {
  let current: string | null | undefined = frameId;
  const visited = new Set<string>();
  while (current) {
    if (current === itemId) return true;
    if (visited.has(current)) return true;
    visited.add(current);
    current = items.find((item) => item.id === current)?.frameId;
  }
  return false;
}

/** Undefined ownership is migrated once. Explicitly detached cards stay detached. */
export function normalizeFrameMembership(items: BoardItem[]): BoardItem[] {
  const frames = items
    .filter((item): item is FrameItem => item.type === 'frame')
    .sort((a, b) => a.width * a.height - b.width * b.height || a.id.localeCompare(b.id));
  const ids = new Set(frames.map((frame) => frame.id));
  return items.map((item) => {
    const frameId =
      item.frameId === undefined
        ? (frames.find((frame) => !wouldCreateFrameCycle(item.id, frame.id, items) && isItemInsideFrame(item, frame))
            ?.id ?? null)
        : item.frameId && ids.has(item.frameId) && !wouldCreateFrameCycle(item.id, item.frameId, items)
          ? item.frameId
          : null;
    return item.frameId === frameId ? item : { ...item, frameId };
  });
}
