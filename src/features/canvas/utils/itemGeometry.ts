import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';

export interface ItemSize {
  width: number;
  height: number;
}

export interface ItemRect extends ItemSize {
  x: number;
  y: number;
  right: number;
  bottom: number;
}

export function getApproxItemSize(item: BoardItem): ItemSize {
  switch (item.type) {
    case 'note':
      return {
        width: item.width ?? 220,
        height: item.height ?? 170,
      };

    case 'kanban':
      return {
        width: item.columns.length * 184 + 24,
        height: 340,
      };

    case 'image':
      return {
        width: item.width ?? 260,
        height: (item.imgHeight ?? 178) + 56,
      };

    case 'link':
      return {
        width: item.width ?? 240,
        height: 150,
      };

    case 'text':
      return {
        width: item.width ?? 200,
        height: 60,
      };

    case 'checklist':
      return {
        width: item.width ?? 230,
        height: 200,
      };

    case 'column':
      return {
        width: item.width,
        height: 260,
      };

    case 'frame':
      return {
        width: item.width,
        height: item.height,
      };

    default:
      return {
        width: 200,
        height: 150,
      };
  }
}

export function getItemSize(item: BoardItem, measuredSizes?: SizeMap): ItemSize {
  const measured = measuredSizes?.get(item.id);
  if (measured) return measured;

  return getApproxItemSize(item);
}

export function getItemRect(item: BoardItem, measuredSizes?: SizeMap): ItemRect {
  const size = getItemSize(item, measuredSizes);

  return {
    x: item.x,
    y: item.y,
    width: size.width,
    height: size.height,
    right: item.x + size.width,
    bottom: item.y + size.height,
  };
}

export function isRectInsideRect(inner: ItemRect, outer: ItemRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.right <= outer.right &&
    inner.bottom <= outer.bottom
  );
}

export function getContainedItemIds(
  items: BoardItem[],
  outerRect: ItemRect,
  measuredSizes?: SizeMap,
  excludeId?: string,
): string[] {
  return items
    .filter(item => {
      if (item.id === excludeId || item.type === 'frame') return false;
      return isRectInsideRect(getItemRect(item, measuredSizes), outerRect);
    })
    .map(item => item.id);
}