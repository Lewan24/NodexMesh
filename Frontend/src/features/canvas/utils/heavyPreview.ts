import type { BoardItem } from '@/entities/board/types';

export type HeavyPreviewItem = Extract<BoardItem, { type: 'column' | 'diagram' | 'database' }>;

export function isHeavyPreviewItem(item: BoardItem): item is HeavyPreviewItem {
  // Documents keep their real rich-text layout at every camera position and zoom.
  return item.type === 'column' || item.type === 'diagram' || item.type === 'database';
}

/** Bounded summaries are rendered as React text, never inserted as HTML or fetched. */
export function getHeavyPreviewLines(item: HeavyPreviewItem): string[] {
  switch (item.type) {
    case 'column':
      return item.items
        .slice(0, 8)
        .map((child) =>
          ('title' in child ? child.title : 'content' in child ? child.content : child.type).slice(0, 160),
        );
    case 'diagram':
      return item.nodes.slice(0, 12).map((node) => node.data.label.slice(0, 160));
    case 'database':
      return item.tables.slice(0, 8).map(
        (table) =>
          `${table.name.slice(0, 80)}: ${table.fields
            .slice(0, 6)
            .map((field) => field.name.slice(0, 40))
            .join(', ')}`,
      );
  }
}

export function hasPreviewCustomCss(item: BoardItem): boolean {
  const pending = [item];
  const visited = new Set<BoardItem>();
  while (pending.length) {
    const current = pending.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    if (current.customCss?.enabled) return true;
    if (current.type === 'column') for (const child of current.items) pending.push(child);
  }
  return false;
}
