import type { CanvasPoint } from '../types';
import { CANVAS_VIEWPORT_OVERSCAN, CANVAS_MAJOR_GRID_SIZE } from '../constants';

export interface CanvasCamera {
  pan: CanvasPoint;
  zoom: number;
}

// Half the culling overscan: content is refreshed before an unmounted edge reaches the screen.
const refreshMargin = CANVAS_VIEWPORT_OVERSCAN / 2;
const detailThresholds = [0.2, 0.25];
const labelThresholds = [0.3, 0.65];

export function cameraNeedsContentRefresh(
  previous: CanvasCamera,
  next: CanvasCamera,
  viewport: { width: number; height: number },
): boolean {
  if (viewport.width <= 0 || viewport.height <= 0) return true;
  if (detailThresholds.some((threshold) => previous.zoom <= threshold !== next.zoom <= threshold)) return true;
  if (labelThresholds.some((threshold) => previous.zoom < threshold !== next.zoom < threshold)) return true;
  if (next.zoom / previous.zoom < 0.88 || next.zoom / previous.zoom > 1.12) return true;
  const previousLeft = (-previous.pan.x - refreshMargin) / previous.zoom;
  const previousTop = (-previous.pan.y - refreshMargin) / previous.zoom;
  const previousRight = (viewport.width - previous.pan.x + refreshMargin) / previous.zoom;
  const previousBottom = (viewport.height - previous.pan.y + refreshMargin) / previous.zoom;
  return (
    -next.pan.x / next.zoom < previousLeft ||
    -next.pan.y / next.zoom < previousTop ||
    (viewport.width - next.pan.x) / next.zoom > previousRight ||
    (viewport.height - next.pan.y) / next.zoom > previousBottom
  );
}

/** Keep the repeating grid texture unchanged during pan; wrap its translation within one tile. */
export function getGridTransform(camera: CanvasCamera, baseZoom: number, viewport: { width: number; height: number }) {
  const scale = camera.zoom / baseZoom;
  const period = CANVAS_MAJOR_GRID_SIZE * camera.zoom;
  const wrap = (value: number) => ((((value + period / 2) % period) + period) % period) - period / 2;
  return {
    x: wrap(camera.pan.x - ((1 - scale) * viewport.width) / 2),
    y: wrap(camera.pan.y - ((1 - scale) * viewport.height) / 2),
    scale,
  };
}
