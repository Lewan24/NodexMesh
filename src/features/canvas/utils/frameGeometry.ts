import type { BoardItem, FrameItem } from '@/entities/board/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

import { getItemRect } from '@/features/canvas/utils/itemGeometry';

export function isItemInsideFrame(
  item: BoardItem,
  frame: FrameItem,
  sizes?: SizeMap,
): boolean {
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

export function getFrameContents(
  frame: FrameItem,
  items: BoardItem[],
  _sizes?: SizeMap,
): BoardItem[] {
  return items.filter(item => item.type !== 'frame' && item.frameId === frame.id);
}

function containsLockedItem(item: BoardItem): boolean {
  return !!item.locked || (item.type === 'column' && item.items.some(containsLockedItem));
}

/** Derived from current contents; unlocking/removing a child immediately releases the frame. */
export function isFrameMovementLocked(frame: FrameItem, items: BoardItem[], _sizes?: SizeMap): boolean {
  return !!frame.locked || items.some(item => containsLockedItem(item) && item.type !== 'frame' && item.frameId === frame.id);
}

/** Undefined ownership is migrated once. Explicitly detached cards stay detached. */
export function normalizeFrameMembership(items: BoardItem[]): BoardItem[] {
  const frames = items.filter((item): item is FrameItem => item.type === 'frame')
    .sort((a, b) => a.width * a.height - b.width * b.height || a.id.localeCompare(b.id));
  const ids = new Set(frames.map(frame => frame.id));
  return items.map(item => {
    const frameId = item.type === 'frame' ? null
      : item.frameId === undefined ? frames.find(frame => isItemInsideFrame(item, frame))?.id ?? null
      : item.frameId && ids.has(item.frameId) ? item.frameId : null;
    return item.frameId === frameId ? item : { ...item, frameId };
  });
}
