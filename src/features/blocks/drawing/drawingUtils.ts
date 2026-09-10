import type { DrawingItem } from '@/entities/board/types';

export type DrawingPoint = { x: number; y: number; pressure?: number };

/** Store local coordinates so moving/resizing never rewrites the original stroke. */
export function createDrawing(points: DrawingPoint[], zIndex: number): DrawingItem | null {
  const valid = points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  if (!valid.length) return null;
  const padding = 6;
  let left = valid[0]!.x, right = left, top = valid[0]!.y, bottom = top;
  for (const point of valid) {
    left = Math.min(left, point.x); right = Math.max(right, point.x);
    top = Math.min(top, point.y); bottom = Math.max(bottom, point.y);
  }
  const width = Math.max(12, right - left + padding * 2);
  const height = Math.max(12, bottom - top + padding * 2);
  return {
    id: crypto.randomUUID(), type: 'drawing', x: left - padding, y: top - padding,
    width, height, viewWidth: width, viewHeight: height, zIndex,
    points: valid.map(point => ({ ...point, x: point.x - left + padding, y: point.y - top + padding })),
    color: '#7C3AED', strokeWidth: 3,
  };
}

export function drawingPath(points: DrawingPoint[]): string {
  if (!points.length) return '';
  // A tiny segment renders a single click as a round dot.
  return `M ${points[0]!.x} ${points[0]!.y} ` + (points.length === 1
    ? `l 0.01 0`
    : points.slice(1).map(point => `L ${point.x} ${point.y}`).join(' '));
}


/** Screen-space speed keeps the pen feel consistent at every canvas zoom. */
export function penPressure(distance: number, elapsed: number): number {
  const speed = Math.max(0, distance) / Math.max(1, elapsed);
  return .45 + 1.15 / (1 + speed * 1.8);
}

function midpoint(a: DrawingPoint, b: DrawingPoint): DrawingPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, pressure: ((a.pressure ?? 1) + (b.pressure ?? 1)) / 2 };
}

/** Quadratic midpoint curves remove sharp sample-to-sample corners without overshoot. */
export function smoothDrawing(points: DrawingPoint[]): DrawingPoint[] {
  if (points.length < 3) return points;
  const result = [points[0]!];
  let start = points[0]!;
  for (let index = 1; index < points.length; index++) {
    const control = points[index]!;
    const end = index === points.length - 1 ? control : midpoint(control, points[index + 1]!);
    const length = Math.hypot(control.x - start.x, control.y - start.y) + Math.hypot(end.x - control.x, end.y - control.y);
    const steps = Math.max(2, Math.min(32, Math.ceil(length / 3)));
    for (let step = 1; step <= steps; step++) {
      const t = step / steps, u = 1 - t;
      result.push({ x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
        y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
        pressure: u * u * (start.pressure ?? 1) + 2 * u * t * (control.pressure ?? 1) + t * t * (end.pressure ?? 1) });
    }
    start = end;
  }
  return result;
}

/** One filled ribbon, including round caps, gives continuous variable-width ink. */
export function drawingOutline(points: DrawingPoint[], strokeWidth: number): string {
  const samples = smoothDrawing(points).filter((point, index, all) => index === 0 || Math.hypot(point.x - all[index - 1]!.x, point.y - all[index - 1]!.y) > .001);
  if (!samples.length) return '';
  const radius = (point: DrawingPoint) => Math.max(.1, strokeWidth * (point.pressure ?? 1) / 2);
  const first = samples[0]!;
  if (samples.length === 1) {
    const r = radius(first);
    return `M ${first.x - r} ${first.y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  const left: DrawingPoint[] = [], right: DrawingPoint[] = [];
  samples.forEach((point, index) => {
    const before = samples[Math.max(0, index - 1)]!, after = samples[Math.min(samples.length - 1, index + 1)]!;
    const angle = Math.atan2(after.y - before.y, after.x - before.x);
    const nx = -Math.sin(angle) * radius(point), ny = Math.cos(angle) * radius(point);
    left.push({ x: point.x + nx, y: point.y + ny });
    right.push({ x: point.x - nx, y: point.y - ny });
  });
  const last = samples.length - 1;
  return `M ${left[0]!.x} ${left[0]!.y} ` + left.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` A ${radius(samples[last]!)} ${radius(samples[last]!)} 0 0 0 ${right[last]!.x} ${right[last]!.y} ` +
    right.slice(0, -1).reverse().map(p => `L ${p.x} ${p.y}`).join(' ') +
    ` A ${radius(first)} ${radius(first)} 0 0 0 ${left[0]!.x} ${left[0]!.y} Z`;
}
