import type { BoardItem, FrameItem } from '@/entities/board/types';
import type { DragGeometry } from '../types';
import { resolveLineItem, type SizeMap } from './lineGeometry';

export function getCanvasLayers(items: BoardItem[]) {
  const frames: FrameItem[] = [];
  const regularItems: BoardItem[] = [];
  for (const item of items) {
    if (item.type === 'frame') frames.push(item);
    else regularItems.push(item);
  }
  regularItems.sort((a, b) => a.zIndex - b.zIndex);
  return { frames, regularItems };
}

export function indexCanvasGeometry(items: BoardItem[], overrides: ReadonlyMap<string, DragGeometry>) {
  const byId = new Map<string, BoardItem>();
  for (const item of items) {
    const geometry = overrides.get(item.id);
    byId.set(item.id, geometry ? ({ ...item, ...geometry } as BoardItem) : item);
  }
  return byId;
}

export function resolveCanvasItems(items: BoardItem[], byId: ReadonlyMap<string, BoardItem>, sizes: SizeMap) {
  const rendered = new Map<string, BoardItem>();
  for (const item of items) {
    const effective = byId.get(item.id) ?? item;
    rendered.set(item.id, effective.type === 'line' ? resolveLineItem(effective, byId, sizes) : effective);
  }
  return rendered;
}
