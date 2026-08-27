import type { BoardItem } from '@/entities/board/types';

export interface ItemSize {
  width: number;
  height: number;
}

export function getApproxItemSize(
  item: BoardItem,
): ItemSize {
  switch (item.type) {
    case 'note':
      return {
        width: item.width ?? 220,
        height: item.height ?? 170,
      };

    case 'kanban':
      return {
        width:
          item.columns.length * 184 + 24,
        height: 340,
      };

    case 'image':
      return {
        width: item.width ?? 260,
        height:
          (item.imgHeight ?? 178) + 56,
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