export const LINE_PADDING = 20;
export const ARROW_SIZE = 10;

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
): ArrowHeadPoints {
  const firstX = x - ARROW_SIZE * Math.cos(angle - Math.PI / 6);
  const firstY = y - ARROW_SIZE * Math.sin(angle - Math.PI / 6);

  const secondX = x - ARROW_SIZE * Math.cos(angle + Math.PI / 6);
  const secondY = y - ARROW_SIZE * Math.sin(angle + Math.PI / 6);

  return {
    firstX,
    firstY,
    tipX: x,
    tipY: y,
    secondX,
    secondY,
  };
}