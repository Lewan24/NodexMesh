import type {
  BoardItem,
  LineItem,
} from '@/entities/board/types';

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

export type SizeMap = Map<
  string,
  {
    width: number;
    height: number;
  }
>;

export function getItemRect(
  item: BoardItem,
  sizes?: SizeMap,
): ItemRect {
  const measuredSize = sizes?.get(item.id);
  const size = measuredSize ?? getApproxItemSize(item);

  return {
    x: item.x,
    y: item.y,
    width: size.width,
    height: size.height,
  };
}

export function getItemAnchor(
  item: BoardItem,
  sizes?: SizeMap,
): Point {
  const rect = getItemRect(item, sizes);

  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function getRectBorderPoint(
  rect: ItemRect,
  targetX: number,
  targetY: number,
): Point {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  const dx = targetX - centerX;
  const dy = targetY - centerY;

  if (dx === 0 && dy === 0) {
    return {
      x: centerX,
      y: centerY,
    };
  }

  const halfWidth = Math.max(rect.width / 2, 1);
  const halfHeight = Math.max(rect.height / 2, 1);

  const scaleX =
    dx !== 0
      ? halfWidth / Math.abs(dx)
      : Infinity;

  const scaleY =
    dy !== 0
      ? halfHeight / Math.abs(dy)
      : Infinity;

  const scale = Math.min(scaleX, scaleY);

  return {
    x: centerX + dx * scale,
    y: centerY + dy * scale,
  };
}

export function resolveLineItem(
  line: LineItem,
  items: BoardItem[],
  sizes?: SizeMap,
): LineItem {
  const startTarget = line.startItemId
    ? items.find(item => item.id === line.startItemId)
    : undefined;

  const endTarget = line.endItemId
    ? items.find(item => item.id === line.endItemId)
    : undefined;

  const startReference = startTarget
    ? getItemAnchor(startTarget, sizes)
    : {
        x: line.x,
        y: line.y,
      };

  const endReference = endTarget
    ? getItemAnchor(endTarget, sizes)
    : {
        x: line.x2,
        y: line.y2,
      };

  let x = line.x;
  let y = line.y;
  let x2 = line.x2;
  let y2 = line.y2;

  if (startTarget) {
    const point = getRectBorderPoint(
      getItemRect(startTarget, sizes),
      endReference.x,
      endReference.y,
    );

    x = point.x;
    y = point.y;
  }

  if (endTarget) {
    const point = getRectBorderPoint(
      getItemRect(endTarget, sizes),
      startReference.x,
      startReference.y,
    );

    x2 = point.x;
    y2 = point.y;
  }

  const unchanged =
    x === line.x &&
    y === line.y &&
    x2 === line.x2 &&
    y2 === line.y2;

  if (unchanged) {
    return line;
  }

  return {
    ...line,
    x,
    y,
    x2,
    y2,
  };
}