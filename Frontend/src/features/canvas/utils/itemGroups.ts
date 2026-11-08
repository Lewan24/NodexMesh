import type { BoardItem } from '@/entities/board/types';

/** Groups are scoped to siblings on the same board, never to a global identifier. */
export function expandGroupSelection(items: readonly BoardItem[], ids: readonly string[]): string[] {
  const selected = new Set(ids);
  const groups = new Set(items.filter((item) => selected.has(item.id) && item.groupId).map((item) => item.groupId));
  for (const item of items) if (item.groupId && groups.has(item.groupId)) selected.add(item.id);
  return [...selected];
}

export function isSingleGroup(items: readonly BoardItem[]): boolean {
  return items.length > 0 && !!items[0]?.groupId && items.every((item) => item.groupId === items[0]?.groupId);
}
