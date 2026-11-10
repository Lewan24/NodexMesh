import type { BoardItem } from '@/entities/board/types';
import { getApproxItemSize } from './itemGeometry';

/** Layout sizes are unscaled, unlike getBoundingClientRect while zooming the canvas. */
export function measureItemHeight(item: BoardItem): number | undefined {
  if (typeof document === 'undefined') return undefined;
  const element = [...document.querySelectorAll<HTMLElement>('[data-board-item-id], [data-nested-item-id]')].find(
    (element) => element.dataset.boardItemId === item.id || element.dataset.nestedItemId === item.id,
  );
  return element && element.offsetHeight > 0 ? element.offsetHeight : undefined;
}

/** Snapshot height on lock and reject auto-fit changes while the lock remains active. */
export function applyItemLocks(
  previous: readonly BoardItem[],
  next: BoardItem[],
  measure: (item: BoardItem) => number | undefined = measureItemHeight,
): BoardItem[] {
  const byId = new Map<string, BoardItem>();
  const collect = (items: readonly BoardItem[]) => {
    for (const item of items) {
      byId.set(item.id, item);
      if (item.type === 'column') collect(item.items);
    }
  };
  collect(previous);
  const visit = (item: BoardItem): BoardItem => {
    const old = byId.get(item.id);
    let result = item;
    if (item.locked && item.type !== 'line') {
      const captured =
        old?.locked && old.height
          ? old.height
          : (measure(old ?? item) ?? old?.height ?? item.height ?? getApproxItemSize(old ?? item).height);
      const height = Number.isFinite(captured) && captured > 0 ? Math.ceil(captured) : 1;
      if (item.height !== height || ((item.type === 'document' || item.type === 'code') && item.autoHeight)) {
        result = {
          ...item,
          height,
          ...(item.type === 'document' || item.type === 'code' ? { autoHeight: false } : {}),
        } as BoardItem;
      }
    }
    if (result.type === 'column') {
      const originals = result.items;
      const children = originals.map(visit);
      if (children.some((item, index) => item !== originals[index])) result = { ...result, items: children };
    }
    return result;
  };
  return next.map(visit);
}
