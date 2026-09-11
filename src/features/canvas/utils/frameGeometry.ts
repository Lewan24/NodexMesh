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
  sizes?: SizeMap,
): BoardItem[] {
  return items.filter(item => isItemInsideFrame(item, frame, sizes));
}

function containsLockedItem(item: BoardItem): boolean {
  return !!item.locked || (item.type === 'column' && item.items.some(containsLockedItem));
}

/** Derived from current contents; unlocking/removing a child immediately releases the frame. */
export function isFrameMovementLocked(frame: FrameItem, items: BoardItem[], sizes?: SizeMap): boolean {
  return !!frame.locked || items.some(item => containsLockedItem(item) && isItemInsideFrame(item, frame, sizes));
}
