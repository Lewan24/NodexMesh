import { getFontFamilyCss } from '../typography/typographyUtils';
import { useState } from 'react';

import type { LineItem } from '@/entities/board/types';

import LineEndpointHandle from '@/features/blocks/line/LineEndpointHandle';

import {
  getArrowHeadPoints,
  getLineCurve,
  getLineRenderGeometry,
} from '@/features/blocks/line/utils/lineRenderGeometry';

interface LineBlockProps {
  item: LineItem;
  isSelected: boolean;
  onDelete: () => void;
  onLineEndpointDrag: (
    event: React.MouseEvent,
    endpoint: 1 | 2,
  ) => void;
}

interface ArrowHeadProps {
  x: number;
  y: number;
  angle: number;
  color: string;
  strokeWidth: number;
}

function ArrowHead({ x, y, angle, color, strokeWidth }: ArrowHeadProps) {
  const {
    firstX,
    firstY,
    tipX,
    tipY,
    secondX,
    secondY,
  } = getArrowHeadPoints(x, y, angle, strokeWidth);

  return (
    <polygon
      points={`${firstX},${firstY} ${tipX},${tipY} ${secondX},${secondY}`}
      stroke={color}
      strokeWidth={strokeWidth / 2}
      fill={color}
      style={{ pointerEvents: 'all', cursor: 'grab' }}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

export default function LineBlock({
  item,
  isSelected,
  onDelete,
  onLineEndpointDrag,
}: LineBlockProps) {
  const [hovered, setHovered] = useState(false);

  const {
    angle,
    svgWidth,
    svgHeight,
    originX,
    originY,
    endX,
    endY,
    svgLeft,
    svgTop,

  } = getLineRenderGeometry(item.x, item.y, item.x2, item.y2);

  const curve = getLineCurve(originX, originY, endX, endY, item.curve);
  const { centerX, centerY } = curve;
  const showHandles = hovered || isSelected;
  const lineColor = isSelected ? '#7C3AED' : item.color;

  const labelOffset =
    item.labelOffset ?? 14;

  const labelMode =
    item.labelMode ?? 'horizontal';

  const angleDegrees =
    angle * (180 / Math.PI);

  const normalizedAngle =
    angleDegrees > 90 ||
    angleDegrees < -90
      ? angleDegrees + 180
      : angleDegrees;

  /*
  * Perpendicular direction from the line.
  * Negative Y means visually "above" the line.
  */
  const labelX =
    centerX +
    Math.sin(angle) *
      labelOffset;

  const labelY =
    centerY -
    Math.cos(angle) *
      labelOffset;

  const labelRotation =
    labelMode === 'follow-line'
      ? normalizedAngle
      : 0;

  return (
    <div
      className="absolute"
      style={{
        left: svgLeft,
        top: svgTop,
        pointerEvents: 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        width={svgWidth}
        height={svgHeight}
        style={{
          overflow: 'visible',
          display: 'block',
        }}
      >
        {/* Larger invisible hit area */}

        <path
          d={curve.path}
          fill="none"
          stroke="transparent"
          strokeWidth={16}
          style={{
            pointerEvents: 'stroke',
            cursor: 'grab',
          }}
        />

        {/* Stop the shaft inside filled heads so its round cap cannot protrude. */}

        <path
          d={`M ${originX + (item.arrowStart ? Math.cos(curve.startAngle) * item.strokeWidth : 0)} ${originY + (item.arrowStart ? Math.sin(curve.startAngle) * item.strokeWidth : 0)} Q ${curve.controlX} ${curve.controlY} ${endX - (item.arrowEnd ? Math.cos(curve.endAngle) * item.strokeWidth : 0)} ${endY - (item.arrowEnd ? Math.sin(curve.endAngle) * item.strokeWidth : 0)}`}
          fill="none"
          stroke={lineColor}
          strokeWidth={item.strokeWidth}
          strokeLinecap={item.lineCap ?? 'round'}
          style={{ pointerEvents: 'none' }}
        />

        {/* Arrow end */}

        {item.arrowEnd && (
          <ArrowHead
            x={endX}
            y={endY}
            angle={curve.endAngle}
            color={lineColor}
            strokeWidth={item.strokeWidth}
          />
        )}

        {/* Arrow start */}

        {item.arrowStart && (
          <ArrowHead
            x={originX}
            y={originY}
            angle={curve.startAngle + Math.PI}
            color={lineColor}
            strokeWidth={item.strokeWidth}
          />
        )}

        {/* Endpoint handles */}

        {showHandles && (
          <>
            <LineEndpointHandle
              x={originX}
              y={originY}
              attached={Boolean(item.startItemId)}
              color={item.color}
              onMouseDown={event => onLineEndpointDrag(event, 1)}
            />

            <LineEndpointHandle
              x={endX}
              y={endY}
              attached={Boolean(item.endItemId)}
              color={item.color}
              onMouseDown={event => onLineEndpointDrag(event, 2)}
            />
          </>
        )}

        {/* Delete button */}

        {showHandles && (
          <g
            style={{
              cursor: 'pointer',
              pointerEvents: 'all',
            }}
            onClick={onDelete}
            onMouseDown={event => event.stopPropagation()}
          >
            <circle
              cx={centerX}
              cy={centerY}
              r={7}
              fill="#08171d"
              stroke={item.color}
              strokeWidth={1.5}
            />

            <line
              x1={centerX - 3}
              y1={centerY - 3}
              x2={centerX + 3}
              y2={centerY + 3}
              stroke="#FF6B8A"
              strokeWidth={1.5}
              strokeLinecap="round"
            />

            <line
              x1={centerX + 3}
              y1={centerY - 3}
              x2={centerX - 3}
              y2={centerY + 3}
              stroke="#FF6B8A"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      {item.label?.trim() && (
        <div
          className="absolute pointer-events-none whitespace-nowrap"
          style={{
            left: labelX,
            top: labelY,

            transform: `
              translate(-50%, -50%)
              rotate(${labelRotation}deg)
            `,

            transformOrigin:
              'center center',

            fontSize:
              `${item.typography?.fontSize ?? item.labelFontSize ?? 11}px`,

            fontFamily:
              getFontFamilyCss(item.typography?.fontFamily),

            fontWeight:
              item.typography?.bold
                ? 700
                : 600,

            fontStyle:
              item.typography?.italic
                ? 'italic'
                : undefined,

            color: lineColor,

            backgroundColor:
              'var(--color-surface-translucent)',

            border:
              '1px solid var(--color-border-soft)',

            borderRadius: 2,

            padding: '2px 6px',

            backdropFilter: 'blur(5px)',

            boxShadow:
              '0 2px 6px rgba(0,0,0,0.08)',

            zIndex: 10,
          }}
        >
          {item.label}
        </div>
      )}
    </div>
  );
}