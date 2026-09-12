import type { BoardItem } from '@/entities/board/types';

/** Clone all nested identities first, then reconnect references within the copied graph. */
export function cloneItems(items: BoardItem[], dx: number, dy: number, firstZIndex: number): BoardItem[] {
  const ids = new Map<string, string>();
  const collect = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(collect); return; }
    if (!value || typeof value !== 'object') return;
    const record = value as Record<string, unknown>;
    if (typeof record.id === 'string') ids.set(record.id, crypto.randomUUID());
    Object.values(record).forEach(collect);
  };
  collect(items);
  const copy = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(copy);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
      if (key === 'frameId') return [key, typeof entry === 'string' ? ids.get(entry) ?? null : null];
      if (key === 'id' && typeof entry === 'string') return [key, ids.get(entry)];
      if (['startItemId', 'endItemId', 'dispenserId', 'source', 'target', 'sourceField', 'targetField'].includes(key) && typeof entry === 'string') return [key, ids.get(entry)];
      return [key, copy(entry)];
    }));
  };
  return [...items].sort((a, b) => a.zIndex - b.zIndex).map((item, index) => {
    const cloned = copy(item) as BoardItem;
    const positioned = { ...cloned, x: cloned.x + dx, y: cloned.y + dy, zIndex: cloned.type === 'frame' ? 0 : firstZIndex + index, locked: false };
    return positioned.type === 'line' ? { ...positioned, x2: positioned.x2 + dx, y2: positioned.y2 + dy } : positioned;
  });
}

export function copyOrigin(items: BoardItem[]) {
  return {
    x: Math.min(...items.flatMap(item => item.type === 'line' ? [item.x, item.x2] : [item.x])),
    y: Math.min(...items.flatMap(item => item.type === 'line' ? [item.y, item.y2] : [item.y])),
  };
}
