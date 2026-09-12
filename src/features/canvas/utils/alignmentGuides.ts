import type { BoardItem } from '@/entities/board/types';
import type { SizeMap } from '@/features/canvas/utils/lineGeometry';
import { getItemRect } from '@/features/canvas/utils/itemGeometry';

export type AlignmentGuideKind = 'edge' | 'center';

export interface AlignmentGuide {
  axis: 'x' | 'y';
  position: number;
  start: number;
  end: number;
  kind: AlignmentGuideKind;
}

interface FindAlignmentOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  items: BoardItem[];
  excludedIds: Set<string>;
  measuredSizes: SizeMap;
  threshold: number;
}

interface AlignmentResult {
  x?: number;
  y?: number;
  guides: AlignmentGuide[];
}

interface Anchor {
  value: number;
  offset: number;
  kind: AlignmentGuideKind;
}

interface Match {
  distance: number;
  position: number;
  offset: number;
  kind: AlignmentGuideKind;
  targetRect: ReturnType<typeof getItemRect>;
  targetArea: number;
  targetIsFrame: boolean;
}

function shouldReplaceMatch(current: Match | null, next: Match): boolean {
  if (!current) return true;

  if (next.distance < current.distance) {
    return true;
  }

  if (next.distance > current.distance) {
    return false;
  }

  if (next.kind === 'center' && current.kind !== 'center') {
    return true;
  }

  if (next.kind !== 'center' && current.kind === 'center') {
    return false;
  }

  if (!next.targetIsFrame && current.targetIsFrame) {
    return true;
  }

  if (next.targetIsFrame && !current.targetIsFrame) {
    return false;
  }

  return next.targetArea < current.targetArea;
}

export function findAlignmentSnap({
  x,
  y,
  width,
  height,
  items,
  excludedIds,
  measuredSizes,
  threshold,
}: FindAlignmentOptions): AlignmentResult {
  const draggedXAnchors: Anchor[] = [
    { value: x, offset: 0, kind: 'edge' },
    { value: x + width / 2, offset: width / 2, kind: 'center' },
    { value: x + width, offset: width, kind: 'edge' },
  ];

  const draggedYAnchors: Anchor[] = [
    { value: y, offset: 0, kind: 'edge' },
    { value: y + height / 2, offset: height / 2, kind: 'center' },
    { value: y + height, offset: height, kind: 'edge' },
  ];

  let bestX: Match | null = null;
  let bestY: Match | null = null;

  for (const item of items) {
    if (excludedIds.has(item.id) || item.type === 'line') {
      continue;
    }

    const rect = getItemRect(item, measuredSizes);

    const targetArea = rect.width * rect.height;

    const targetIsFrame = item.type === 'frame';

    const targetXAnchors: Anchor[] = [
      { value: rect.x, offset: 0, kind: 'edge' },
      { value: rect.x + rect.width / 2, offset: rect.width / 2, kind: 'center' },
      { value: rect.right, offset: rect.width, kind: 'edge' },
    ];

    const targetYAnchors: Anchor[] = [
      { value: rect.y, offset: 0, kind: 'edge' },
      { value: rect.y + rect.height / 2, offset: rect.height / 2, kind: 'center' },
      { value: rect.bottom, offset: rect.height, kind: 'edge' },
    ];

    for (const draggedAnchor of draggedXAnchors) {
      for (const targetAnchor of targetXAnchors) {
        const distance = Math.abs(draggedAnchor.value - targetAnchor.value);

        if (distance > threshold) {
          continue;
        }

        const isCenterMatch = draggedAnchor.kind === 'center' && targetAnchor.kind === 'center';

        const candidate: Match = {
          distance,
          position: targetAnchor.value,
          offset: draggedAnchor.offset,
          kind: isCenterMatch ? 'center' : 'edge',
          targetRect: rect,
          targetArea,
          targetIsFrame,
        };

        if (shouldReplaceMatch(bestX, candidate)) {
          bestX = candidate;
        }
      }
    }

    for (const draggedAnchor of draggedYAnchors) {
      for (const targetAnchor of targetYAnchors) {
        const distance = Math.abs(draggedAnchor.value - targetAnchor.value);

        if (distance > threshold) {
          continue;
        }

        const isCenterMatch = draggedAnchor.kind === 'center' && targetAnchor.kind === 'center';

        const candidate: Match = {
          distance,
          position: targetAnchor.value,
          offset: draggedAnchor.offset,
          kind: isCenterMatch ? 'center' : 'edge',
          targetRect: rect,
          targetArea,
          targetIsFrame,
        };

        if (shouldReplaceMatch(bestY, candidate)) {
          bestY = candidate;
        }
      }
    }
  }

  const snappedX = bestX ? bestX.position - bestX.offset : undefined;

  const snappedY = bestY ? bestY.position - bestY.offset : undefined;

  const finalX = snappedX ?? x;
  const finalY = snappedY ?? y;

  const guides: AlignmentGuide[] = [];

  if (bestX) {
    guides.push({
      axis: 'x',
      position: bestX.position,
      start: Math.min(finalY, bestX.targetRect.y) - 48,
      end: Math.max(finalY + height, bestX.targetRect.bottom) + 48,
      kind: bestX.kind,
    });
  }

  if (bestY) {
    guides.push({
      axis: 'y',
      position: bestY.position,
      start: Math.min(finalX, bestY.targetRect.x) - 48,
      end: Math.max(finalX + width, bestY.targetRect.right) + 48,
      kind: bestY.kind,
    });
  }

  return { x: snappedX, y: snappedY, guides };
}
