import type { BoardBlockItem, IconItem } from '@/entities/board/types';

/** Legacy emoji/dashboard icons remain editable through the shared picker. */
export function getBoardIcon(item: BoardBlockItem): IconItem | null {
  const icon =
    item.boardIcon ??
    (item.icon
      ? {
          iconMode: item.icon === 'layout-dashboard' ? 'preset' : 'emoji',
          source: item.icon,
          label: item.title,
          color: '#7C3AED',
        }
      : undefined);
  return icon ? ({ ...item, type: 'icon', ...icon } as IconItem) : null;
}
