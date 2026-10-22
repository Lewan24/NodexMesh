import { ZOOM_MAX, ZOOM_MIN } from '@/features/canvas/constants';

export interface BoardViewport {
  pan: { x: number; y: number };
  zoom: number;
}

export const defaultViewport = (): BoardViewport => ({ pan: { x: 0, y: 0 }, zoom: 1 });

export function viewportKey(userId: string, projectId?: string, boardId?: string): string | null {
  return userId && projectId && boardId
    ? `nodexmesh.viewport.v1.${JSON.stringify([userId, projectId, boardId])}`
    : null;
}

export function readViewport(key: string | null): BoardViewport {
  try {
    const value = key ? JSON.parse(localStorage.getItem(key) ?? 'null') : null;
    if (
      value &&
      Number.isFinite(value.pan?.x) &&
      Number.isFinite(value.pan?.y) &&
      Math.abs(value.pan.x) <= 1e9 &&
      Math.abs(value.pan.y) <= 1e9 &&
      Number.isFinite(value.zoom) &&
      value.zoom >= ZOOM_MIN &&
      value.zoom <= ZOOM_MAX
    )
      return { pan: { x: value.pan.x, y: value.pan.y }, zoom: value.zoom };
  } catch {
    // Storage may be unavailable or contain invalid data.
  }
  return defaultViewport();
}

export function writeViewport(key: string | null, viewport: BoardViewport) {
  try {
    if (key) localStorage.setItem(key, JSON.stringify({ pan: viewport.pan, zoom: viewport.zoom }));
  } catch {
    // A full or disabled storage must not interrupt navigation.
  }
}
