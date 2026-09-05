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