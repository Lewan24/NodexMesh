import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';
import type { ToolType } from '@/entities/board/toolTypes';
import { ITEM_WIDTH } from '@/features/canvas/constants';

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
    case 'drawing': return { width: item.width, height: item.height };
    case 'line': return { width: Math.abs(item.x2 - item.x), height: Math.abs(item.y2 - item.y) };
    case 'timeline': return { width: item.width ?? ITEM_WIDTH.timeline, height: item.height ?? 520 };
    case 'database': return { width: item.width ?? ITEM_WIDTH.database, height: item.height ?? 600 };
    case 'diagram': return { width: item.width ?? ITEM_WIDTH.diagram, height: item.height ?? 560 };
    case 'document': return { width: item.width ?? ITEM_WIDTH.document, height: item.height ?? 600 };
    case 'embed': return { width: item.width ?? ITEM_WIDTH.embed, height: item.height ?? 320 };
    case 'code': return { width: item.width ?? ITEM_WIDTH.code, height: item.height ?? 280 };
    case 'dispenser': return { width: item.width ?? ITEM_WIDTH.dispenser, height: item.height ?? 200 };
    case 'note':
      return {
        width: item.width ?? ITEM_WIDTH.note,
        height: item.height ?? 170,
      };

    case 'kanban':
      return {
        width: item.width ?? ITEM_WIDTH.kanban,
        height: item.height ?? 340,
      };

    case 'image':
      return {
        width: item.width ?? ITEM_WIDTH.image,
        height: (item.imgHeight ?? 178) + 56,
      };

    case 'link':
      return {
        width: item.width ?? ITEM_WIDTH.link,
        height: 150,
      };

    case 'text':
      return {
        width: item.width ?? ITEM_WIDTH.text,
        height: 60,
      };

    case 'checklist':
      return {
        width: item.width ?? ITEM_WIDTH.checklist,
        height: item.height ?? 200,
      };

    case 'column':
      return {
        width: item.width,
        height: item.height ?? 260,
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

export function getToolDefaultSize(type: ToolType): ItemSize {
  switch (type) {
    case 'timeline': return { width: ITEM_WIDTH.timeline, height: 520 };
    case 'database': return { width: ITEM_WIDTH.database, height: 600 };
    case 'diagram': return { width: ITEM_WIDTH.diagram, height: 560 };
    case 'document': return { width: ITEM_WIDTH.document, height: 600 };
    case 'embed': return { width: ITEM_WIDTH.embed, height: 320 };
    case 'code': return { width: ITEM_WIDTH.code, height: 280 };
    case 'dispenser': return { width: ITEM_WIDTH.dispenser, height: 200 };
    case 'divider': return { width: ITEM_WIDTH.line, height: 24 };
    case 'note':
      return {
        width: ITEM_WIDTH.note,
        height: 160,
      };

    case 'kanban':
      return {
        width: ITEM_WIDTH.kanban,
        height: 336,
      };

    case 'image':
      return {
        width: ITEM_WIDTH.image,
        height: 248,
      };

    case 'link':
      return {
        width: ITEM_WIDTH.link,
        height: 144,
      };

    case 'text':
      return {
        width: ITEM_WIDTH.text,
        height: 64,
      };

    case 'checklist':
      return {
        width: ITEM_WIDTH.checklist,
        height: 192,
      };

    case 'column':
      return {
        width: ITEM_WIDTH.column,
        height: 256,
      };

    case 'frame':
      return {
        width: ITEM_WIDTH.frame,
        height: 256,
      };

    case 'line':
      return {
        width: ITEM_WIDTH.line,
        height: 24,
      };

    default:
      return {
        width: 160,
        height: 96,
      };
  }
}
