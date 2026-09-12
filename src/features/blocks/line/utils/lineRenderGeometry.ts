export const LINE_PADDING = 20;
export const ARROW_SIZE = 16;

export interface LineRenderGeometry {
  dx: number;
  dy: number;
  angle: number;
  svgWidth: number;
  svgHeight: number;
  originX: number;
  originY: number;
  endX: number;
  endY: number;
  svgLeft: number;
  svgTop: number;
  centerX: number;
  centerY: number;
}

export interface ArrowHeadPoints {
  firstX: number;
  firstY: number;
  tipX: number;
  tipY: number;
  secondX: number;
  secondY: number;
}

export function getLineRenderGeometry(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): LineRenderGeometry {
  const dx = endX - startX;
  const dy = endY - startY;

  const angle = Math.atan2(dy, dx);

  const svgWidth = Math.abs(dx) + LINE_PADDING * 2;
  const svgHeight = Math.abs(dy) + LINE_PADDING * 2;

  const originX = dx >= 0 ? LINE_PADDING : LINE_PADDING + Math.abs(dx);
  const originY = dy >= 0 ? LINE_PADDING : LINE_PADDING + Math.abs(dy);

  const renderedEndX = originX + dx;
  const renderedEndY = originY + dy;

  const svgLeft =
    dx >= 0 ? -LINE_PADDING : -(LINE_PADDING + Math.abs(dx));

  const svgTop =
    dy >= 0 ? -LINE_PADDING : -(LINE_PADDING + Math.abs(dy));

  return {
    dx,
    dy,
    angle,
    svgWidth,
    svgHeight,
    originX,
    originY,
    endX: renderedEndX,
    endY: renderedEndY,
    svgLeft,
    svgTop,
    centerX: (originX + renderedEndX) / 2,
    centerY: (originY + renderedEndY) / 2,
  };
}

export function getArrowHeadPoints(
  x: number,
  y: number,
  angle: number,
  strokeWidth = 2,
): ArrowHeadPoints {
  const size = ARROW_SIZE / 2 + Math.max(1, strokeWidth) * 3;
  const firstX = x - size * Math.cos(angle - Math.PI / 6);
  const firstY = y - size * Math.sin(angle - Math.PI / 6);

  const secondX = x - size * Math.cos(angle + Math.PI / 6);
  const secondY = y - size * Math.sin(angle + Math.PI / 6);

  return {
    firstX,
    firstY,
    tipX: x,
    tipY: y,
    secondX,
    secondY,
  };
}

/** Quadratic curve: signed bend is relative to endpoint distance, so resizing preserves its shape. */
export function getLineCurve(x: number, y: number, x2: number, y2: number, bend = 0) {
  const dx = x2 - x, dy = y2 - y;
  const amount = Math.max(-1, Math.min(1, Number.isFinite(bend) ? bend : 0));
  const cx = (x + x2) / 2 - dy * amount;
  const cy = (y + y2) / 2 + dx * amount;
  return {
    path: `M ${x} ${y} Q ${cx} ${cy} ${x2} ${y2}`,
    controlX: cx, controlY: cy,
    startAngle: Math.atan2(cy - y, cx - x),
    endAngle: Math.atan2(y2 - cy, x2 - cx),
    centerX: (x + 2 * cx + x2) / 4,
    centerY: (y + 2 * cy + y2) / 4,
  };
}
