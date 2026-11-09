import type { BoardItem, LineItem, LineConnectionSide } from '@/entities/board/types';

import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';

export interface Point {
  x: number;
  y: number;
}

export interface ItemRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SizeMap = Map<string, { width: number; height: number }>;

export function getItemRect(item: BoardItem, sizes?: SizeMap): ItemRect {
  const measuredSize = sizes?.get(item.id);
  const size = measuredSize ?? getApproxItemSize(item);

  return { x: item.x, y: item.y, width: size.width, height: size.height };
}

export function getItemAnchor(item: BoardItem, sizes?: SizeMap): Point {
  const rect = getItemRect(item, sizes);

  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function getRectBorderPoint(rect: ItemRect, targetX: number, targetY: number): Point {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const dx = targetX - centerX;
  const dy = targetY - centerY;

  if (dx === 0 && dy === 0) {
    return { x: centerX, y: centerY };
  }

  const halfWidth = Math.max(rect.width / 2, 1);
  const halfHeight = Math.max(rect.height / 2, 1);

  const scaleX = dx !== 0 ? halfWidth / Math.abs(dx) : Infinity;

  const scaleY = dy !== 0 ? halfHeight / Math.abs(dy) : Infinity;

  const scale = Math.min(scaleX, scaleY);

  return { x: centerX + dx * scale, y: centerY + dy * scale };
}

/** Choose the edge once when attaching; subsequent movement cannot switch edges. */
export function getConnectionSide(rect: ItemRect, x: number, y: number): LineConnectionSide {
  const dx = x - rect.x - rect.width / 2;
  const dy = y - rect.y - rect.height / 2;
  return Math.abs(dx) / Math.max(rect.width, 1) >= Math.abs(dy) / Math.max(rect.height, 1)
    ? dx >= 0
      ? 'right'
      : 'left'
    : dy >= 0
      ? 'bottom'
      : 'top';
}

export function getSideBorderPoint(rect: ItemRect, side: LineConnectionSide, target: Point): Point {
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  if (side === 'left' || side === 'right') {
    return { x: rect.x + (side === 'right' ? rect.width : 0), y: clamp(target.y, rect.y, rect.y + rect.height) };
  }
  return { x: clamp(target.x, rect.x, rect.x + rect.width), y: rect.y + (side === 'bottom' ? rect.height : 0) };
}

export function getEdgeOffset(rect: ItemRect, side: LineConnectionSide, point: Point): number {
  const horizontal = side === 'top' || side === 'bottom';
  const length = horizontal ? rect.width : rect.height;
  return Math.max(0, Math.min(1, length > 0 ? (horizontal ? point.x - rect.x : point.y - rect.y) / length : 0.5));
}

export function getFixedBorderPoint(rect: ItemRect, side: LineConnectionSide, offset = 0.5): Point {
  return getSideBorderPoint(rect, side, { x: rect.x + rect.width * offset, y: rect.y + rect.height * offset });
}

/** Project to the nearest edge, preserving the pointer's position along it. */
export function getConnectionAttachment(
  rect: ItemRect,
  x: number,
  y: number,
): { side: LineConnectionSide; offset: number; point: Point } {
  const sides: LineConnectionSide[] = ['top', 'right', 'bottom', 'left'];
  const candidates = sides.map((side) => ({ side, point: getSideBorderPoint(rect, side, { x, y }) }));
  candidates.sort((a, b) => Math.hypot(a.point.x - x, a.point.y - y) - Math.hypot(b.point.x - x, b.point.y - y));
  const { side, point } = candidates[0]!;
  return { side, point, offset: getEdgeOffset(rect, side, point) };
}

/** Upgrade existing connections before moving their targets, preserving their current edges. */
export function lockLineConnectionSides(items: BoardItem[]): BoardItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  return items.map((item) => {
    if (item.type !== 'line' || item.divider) return item;
    const start = item.startItemId ? byId.get(item.startItemId) : undefined;
    const end = item.endItemId ? byId.get(item.endItemId) : undefined;
    const startReference = start ? getItemAnchor(start) : { x: item.x, y: item.y };
    const endReference = end ? getItemAnchor(end) : { x: item.x2, y: item.y2 };
    const startSide =
      item.startSide ?? (start ? getConnectionSide(getItemRect(start), endReference.x, endReference.y) : undefined);
    const endSide =
      item.endSide ?? (end ? getConnectionSide(getItemRect(end), startReference.x, startReference.y) : undefined);
    return startSide === item.startSide && endSide === item.endSide ? item : { ...item, startSide, endSide };
  });
}

export function resolveLineItem(
  line: LineItem,
  items: BoardItem[] | ReadonlyMap<string, BoardItem>,
  sizes?: SizeMap,
): LineItem {
  if (line.divider)
    return { ...line, startItemId: undefined, endItemId: undefined, arrowStart: false, arrowEnd: false };
  const getItem = (id: string) => (Array.isArray(items) ? items.find((item) => item.id === id) : items.get(id));
  const startTarget = line.startItemId ? getItem(line.startItemId) : undefined;

  const endTarget = line.endItemId ? getItem(line.endItemId) : undefined;

  const startReference = startTarget ? getItemAnchor(startTarget, sizes) : { x: line.x, y: line.y };

  const endReference = endTarget ? getItemAnchor(endTarget, sizes) : { x: line.x2, y: line.y2 };

  const startRect = startTarget ? getItemRect(startTarget, sizes) : undefined;
  const endRect = endTarget ? getItemRect(endTarget, sizes) : undefined;
  const startSide =
    line.startSide ?? (startRect ? getConnectionSide(startRect, endReference.x, endReference.y) : undefined);
  const endSide =
    line.endSide ?? (endRect ? getConnectionSide(endRect, startReference.x, startReference.y) : undefined);
  let start = { x: line.x, y: line.y };
  let end = { x: line.x2, y: line.y2 };

  if (startRect && startSide) {
    start = line.staticAnchors
      ? getFixedBorderPoint(startRect, startSide, line.startOffset)
      : getSideBorderPoint(startRect, startSide, endReference);
  }
  if (endRect && endSide) {
    end = line.staticAnchors
      ? getFixedBorderPoint(endRect, endSide, line.endOffset)
      : getSideBorderPoint(endRect, endSide, startReference);
  }

  if (!line.staticAnchors && startRect && endRect && startSide && endSide) {
    const horizontalEdges =
      (startSide === 'top' || startSide === 'bottom') && (endSide === 'top' || endSide === 'bottom');
    const verticalEdges =
      (startSide === 'left' || startSide === 'right') && (endSide === 'left' || endSide === 'right');
    // Use one shared coordinate on parallel edges, rather than crossing two
    // independent projections to the opposite centers.
    if (horizontalEdges) {
      const left = Math.max(startRect.x, endRect.x);
      const right = Math.min(startRect.x + startRect.width, endRect.x + endRect.width);
      if (left <= right) start.x = end.x = (left + right) / 2;
    }
    if (verticalEdges) {
      const top = Math.max(startRect.y, endRect.y);
      const bottom = Math.min(startRect.y + startRect.height, endRect.y + endRect.height);
      if (top <= bottom) start.y = end.y = (top + bottom) / 2;
    }
  }

  const startOffset =
    startRect && startSide
      ? line.staticAnchors
        ? (line.startOffset ?? 0.5)
        : getEdgeOffset(startRect, startSide, start)
      : line.startOffset;
  const endOffset =
    endRect && endSide
      ? line.staticAnchors
        ? (line.endOffset ?? 0.5)
        : getEdgeOffset(endRect, endSide, end)
      : line.endOffset;
  if (
    start.x === line.x &&
    start.y === line.y &&
    end.x === line.x2 &&
    end.y === line.y2 &&
    startOffset === line.startOffset &&
    endOffset === line.endOffset
  )
    return line;

  return { ...line, x: start.x, y: start.y, x2: end.x, y2: end.y, startOffset, endOffset };
}
