import type { BoardItem } from '@/entities/board/types';

export type HeavyPreviewItem = Extract<BoardItem, { type: 'column' }>;

export function isHeavyPreviewItem(item: BoardItem): item is HeavyPreviewItem {
  // Documents and SVG diagram/schema previews retain their layout during camera movement.
  return item.type === 'column';
}

/** Bounded summaries are rendered as React text, never inserted as HTML or fetched. */
export function getHeavyPreviewLines(item: HeavyPreviewItem): string[] {
  return item.items
    .slice(0, 8)
    .map((child) => ('title' in child ? child.title : 'content' in child ? child.content : child.type).slice(0, 160));
}

export function hasPreviewCustomCss(item: BoardItem): boolean {
  const pending = [item];
  const visited = new Set<BoardItem>();
  while (pending.length) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current.customCss?.enabled || current.statusId || current.border) return true;
    if (current.type === 'column') for (const child of current.items) pending.push(child);
  }
  return false;
}
