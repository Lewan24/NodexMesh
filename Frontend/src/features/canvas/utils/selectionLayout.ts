import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from './lineGeometry';
import { resolveLineItem } from './lineGeometry';
import { getApproxItemSize } from './itemGeometry';
import { CANVAS_GRID_SIZE, noteModuleWidth } from '../constants';
import { snapToGrid } from './gridSnap';

export interface LayoutRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface LayoutUnit {
  id: string;
  items: BoardItem[];
  rect: LayoutRect;
}
export interface ArrangementOptions {
  mode: 'count' | 'width';
  gap: number;
  perRow: number;
  widthModules: number;
}
export const DEFAULT_ARRANGEMENT: ArrangementOptions = { mode: 'width', gap: 1, perRow: 3, widthModules: 3 };
const MAX_COORDINATE = 10_000_000;

function rectFor(item: BoardItem, byId: ReadonlyMap<string, BoardItem>, sizes: SizeMap): LayoutRect {
  if (item.type === 'line') {
    const line = resolveLineItem(item, byId, sizes);
    return {
      x: Math.min(line.x, line.x2),
      y: Math.min(line.y, line.y2),
      width: Math.abs(line.x2 - line.x),
      height: Math.abs(line.y2 - line.y),
    };
  }
  const measured = sizes.get(item.id);
  const size = measured && measured.width > 0 && measured.height > 0 ? measured : getApproxItemSize(item);
  return { x: item.x, y: item.y, ...size };
}

/** Frames and logical groups remain rigid units, including indirectly selected descendants. */
export function getLayoutSelection(
  items: BoardItem[],
  ids: readonly string[],
  sizes: SizeMap = new Map(),
  remoteLocks: ReadonlySet<string> = new Set(),
): { units: LayoutUnit[]; reason?: string } {
  if (ids.length < 2) return { units: [], reason: 'Select at least two independent items or groups.' };
  const byId = new Map(items.map((item) => [item.id, item]));
  if (ids.some((id) => !byId.has(id))) return { units: [], reason: 'The selection changed. Select the items again.' };
  const groups = new Map<string, BoardItem[]>();
  const children = new Map<string, BoardItem[]>();
  for (const item of items) {
    if (item.groupId) {
      const bucket = groups.get(item.groupId) ?? [];
      bucket.push(item);
      groups.set(item.groupId, bucket);
    }
    if (item.frameId) {
      const bucket = children.get(item.frameId) ?? [];
      bucket.push(item);
      children.set(item.frameId, bucket);
    }
  }
  const captured = new Set<string>();
  const checkedGroups = new Set<string>();
  const pending = [...ids];
  while (pending.length) {
    const id = pending.pop()!;
    if (captured.has(id)) continue;
    const item = byId.get(id);
    if (!item) continue;
    captured.add(id);
    if (item.groupId && !checkedGroups.has(item.groupId)) {
      checkedGroups.add(item.groupId);
      for (const peer of groups.get(item.groupId) ?? []) pending.push(peer.id);
    }
    if (item.type === 'frame') for (const child of children.get(id) ?? []) pending.push(child.id);
  }
  const parents = new Map([...captured].map((id) => [id, id]));
  const find = (id: string): string => {
    let root = id;
    while (parents.get(root) !== root) root = parents.get(root)!;
    while (parents.get(id) !== id) {
      const next = parents.get(id)!;
      parents.set(id, root);
      id = next;
    }
    return root;
  };
  const unite = (a: string, b: string) => parents.set(find(b), find(a));
  const firstByGroup = new Map<string, string>();
  for (const id of captured) {
    const item = byId.get(id)!;
    if (item.frameId && captured.has(item.frameId)) unite(id, item.frameId);
    if (item.groupId) {
      const first = firstByGroup.get(item.groupId);
      if (first) unite(first, id);
      else firstByGroup.set(item.groupId, id);
    }
  }
  const buckets = new Map<string, BoardItem[]>();
  for (const id of captured) {
    const root = find(id);
    const bucket = buckets.get(root) ?? [];
    bucket.push(byId.get(id)!);
    buckets.set(root, bucket);
  }
  const units = [...buckets.values()]
    .map((members): LayoutUnit => {
      const rects = members.map((item) => rectFor(item, byId, sizes));
      const x = Math.min(...rects.map((rect) => rect.x));
      const y = Math.min(...rects.map((rect) => rect.y));
      return {
        id: members[0]!.id,
        items: members,
        rect: {
          x,
          y,
          width: Math.max(...rects.map((rect) => rect.x + rect.width)) - x,
          height: Math.max(...rects.map((rect) => rect.y + rect.height)) - y,
        },
      };
    })
    .sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x || a.id.localeCompare(b.id));
  const checkLocks = [...captured].map((id) => byId.get(id)!);
  const checkedLocks = new Set<string>();
  while (checkLocks.length) {
    const item = checkLocks.pop()!;
    if (checkedLocks.has(item.id)) continue;
    checkedLocks.add(item.id);
    if (item.frameId && byId.has(item.frameId)) checkLocks.push(byId.get(item.frameId)!);
    if (item.locked || remoteLocks.has(item.id))
      return {
        units,
        reason: 'Unlock the selection and wait for collaborators to finish editing before arranging it.',
      };
    if (item.type === 'column') checkLocks.push(...item.items);
  }
  for (const unit of units)
    for (const item of unit.items) {
      if (
        item.type === 'line' &&
        !item.divider &&
        [item.startItemId, item.endItemId].some(
          (id) => id && byId.has(id) && (!captured.has(id) || find(id) !== find(item.id)),
        )
      )
        return {
          units,
          reason:
            'Attached lines follow their endpoints. Group them with their endpoints or disconnect them before arranging.',
        };
    }
  return {
    units,
    ...(units.length < 2
      ? {
          reason: 'Select at least two independent items or groups. Ungroup items to arrange their members separately.',
        }
      : {}),
  };
}

const cellSize = (size: number) =>
  Math.max(CANVAS_GRID_SIZE, Math.ceil((size - 0.00001) / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE);

export function planArrangement(
  units: readonly LayoutUnit[],
  options: ArrangementOptions,
): Map<string, { x: number; y: number }> {
  if (
    !['count', 'width'].includes(options.mode) ||
    ![options.gap, options.perRow, options.widthModules].every(
      (value) => Number.isInteger(value) && value >= 1 && value <= 1000,
    )
  )
    throw new Error('Use whole numbers from 1 to 1000.');
  if (units.length < 2) throw new Error('Select at least two independent items or groups.');
  const startX = snapToGrid(Math.min(...units.map((unit) => unit.rect.x))) || 0;
  const startY = snapToGrid(Math.min(...units.map((unit) => unit.rect.y))) || 0;
  const gap = options.gap * CANVAS_GRID_SIZE;
  const widthLimit = noteModuleWidth(options.widthModules);
  let x = startX,
    y = startY,
    rowHeight = 0,
    count = 0;
  const positions = new Map<string, { x: number; y: number }>();
  for (const unit of units) {
    const width = cellSize(unit.rect.width),
      height = cellSize(unit.rect.height);
    const wrap = count > 0 && (options.mode === 'count' ? count >= options.perRow : x + width > startX + widthLimit);
    if (wrap) {
      x = startX;
      y += rowHeight + gap;
      rowHeight = 0;
      count = 0;
    }
    if (![x, y, x + width, y + height].every((value) => Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE))
      throw new Error('The layout is too large. Reduce spacing or the number of items.');
    positions.set(unit.id, { x, y });
    x += width + gap;
    rowHeight = Math.max(rowHeight, height);
    count++;
  }
  return positions;
}

/** Translate whole units once. Keep ownership with moved frames, otherwise re-evaluate containment. */
export function layoutUpdates(
  items: BoardItem[],
  units: readonly LayoutUnit[],
  positions: ReadonlyMap<string, { x: number; y: number }>,
  sizes: SizeMap,
): Map<string, (item: BoardItem) => BoardItem> {
  const deltas = new Map<string, { x: number; y: number }>();
  for (const unit of units) {
    const target = positions.get(unit.id);
    if (!target) continue;
    for (const item of unit.items) deltas.set(item.id, { x: target.x - unit.rect.x, y: target.y - unit.rect.y });
  }
  const moved = items.map((item): BoardItem => {
    const delta = deltas.get(item.id);
    if (!delta) return item;
    const geometry = {
      x: item.x + delta.x,
      y: item.y + delta.y,
      ...(item.type === 'line' ? { x2: item.x2 + delta.x, y2: item.y2 + delta.y } : {}),
    };
    if (!Object.values(geometry).every((value) => Number.isFinite(value) && Math.abs(value) <= MAX_COORDINATE))
      throw new Error('The layout is too large. Reduce spacing or the number of items.');
    return { ...item, ...geometry };
  });
  const byId = new Map(moved.map((item) => [item.id, item]));
  const frames = moved.filter((item) => item.type === 'frame').sort((a, b) => a.width * a.height - b.width * b.height);
  const contains = (item: BoardItem, frame: BoardItem) => {
    const a = rectFor(item, byId, sizes),
      b = rectFor(frame, byId, sizes);
    return a.x >= b.x && a.y >= b.y && a.x + a.width <= b.x + b.width && a.y + a.height <= b.y + b.height;
  };
  const updates = new Map<string, (item: BoardItem) => BoardItem>();
  moved.forEach((item, index) => {
    const delta = deltas.get(item.id);
    if (!delta || (!delta.x && !delta.y)) return;
    const ownerDelta = item.frameId ? deltas.get(item.frameId) : undefined;
    const owner = item.frameId ? byId.get(item.frameId) : undefined;
    const keepOwner = owner && ((ownerDelta?.x === delta.x && ownerDelta.y === delta.y) || contains(item, owner));
    const frameId = keepOwner
      ? item.frameId
      : item.type === 'frame'
        ? null
        : (frames.find((frame) => contains(item, frame))?.id ?? null);
    const original = items[index]!;
    const x = item.x,
      y = item.y;
    updates.set(item.id, (current) => ({
      ...current,
      x,
      y,
      frameId,
      ...(current.type === 'line' && original.type === 'line'
        ? { x2: original.x2 + delta.x, y2: original.y2 + delta.y }
        : {}),
    }));
  });
  return updates;
}
