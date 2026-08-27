import {
  useState,
} from 'react';

import type {
  BoardItem,
  LineItem,
} from '@/entities/board/types';

import LineEndpointHandle from '@/features/blocks/line/LineEndpointHandle';

import {
  getArrowHeadPoints,
  getLineRenderGeometry,
} from '@/features/blocks/line/utils/lineRenderGeometry';

interface LineBlockProps {
  item: LineItem;

  zoom: number;

  isSelected: boolean;

  onUpdate: (
    updater: (
      item:
        BoardItem,
    ) => BoardItem,
  ) => void;

  onDelete:
    () => void;

  onLineEndpointDrag: (
    event:
      React.MouseEvent,

    endpoint:
      1 | 2,
  ) => void;
}

interface ArrowHeadProps {
  x: number;
  y: number;

  angle: number;

  color: string;
}

function ArrowHead({
  x,
  y,

  angle,

  color,
}: ArrowHeadProps) {
  const {
    firstX,
    firstY,

    tipX,
    tipY,

    secondX,
    secondY,
  } =
    getArrowHeadPoints(
      x,
      y,
      angle,
    );

  return (
    <polyline
      points={`
        ${firstX},${firstY}
        ${tipX},${tipY}
        ${secondX},${secondY}
      `}
      stroke={color}
      strokeWidth="2"
      fill="none"
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
  const [
    hovered,
    setHovered,
  ] = useState(false);

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

    centerX,
    centerY,
  } =
    getLineRenderGeometry(
      item.x,
      item.y,
      item.x2,
      item.y2,
    );

  const showHandles =
    hovered ||
    isSelected;

  const lineColor =
    isSelected
      ? '#7C3AED'
      : item.color;

  return (
    <div
      className="absolute"
      style={{
        left:
          svgLeft,

        top:
          svgTop,

        pointerEvents:
          'none',
      }}
      onMouseEnter={() =>
        setHovered(true)
      }
      onMouseLeave={() =>
        setHovered(false)
      }
    >
      <svg
        width={
          svgWidth
        }
        height={
          svgHeight
        }
        style={{
          overflow:
            'visible',

          display:
            'block',
        }}
      >
        {/* Larger invisible hit area */}

        <line
          x1={
            originX
          }
          y1={
            originY
          }
          x2={
            endX
          }
          y2={
            endY
          }
          stroke="transparent"
          strokeWidth={16}
          style={{
            pointerEvents:
              'stroke',

            cursor:
              'grab',
          }}
        />

        {/* Visible line */}

        <line
          x1={
            originX
          }
          y1={
            originY
          }
          x2={
            endX
          }
          y2={
            endY
          }
          stroke={
            lineColor
          }
          strokeWidth={
            item.strokeWidth
          }
          strokeLinecap="round"
          style={{
            pointerEvents:
              'none',
          }}
        />

        {/* Arrow end */}

        {item.arrowEnd && (
          <ArrowHead
            x={
              endX
            }
            y={
              endY
            }
            angle={
              angle
            }
            color={
              lineColor
            }
          />
        )}

        {/* Arrow start */}

        {item.arrowStart && (
          <ArrowHead
            x={
              originX
            }
            y={
              originY
            }
            angle={
              angle +
              Math.PI
            }
            color={
              lineColor
            }
          />
        )}

        {/* Endpoint handles */}

        {showHandles && (
          <>
            <LineEndpointHandle
              x={
                originX
              }
              y={
                originY
              }
              attached={
                Boolean(
                  item.startItemId,
                )
              }
              color={
                item.color
              }
              onMouseDown={
                event =>
                  onLineEndpointDrag(
                    event,
                    1,
                  )
              }
            />

            <LineEndpointHandle
              x={
                endX
              }
              y={
                endY
              }
              attached={
                Boolean(
                  item.endItemId,
                )
              }
              color={
                item.color
              }
              onMouseDown={
                event =>
                  onLineEndpointDrag(
                    event,
                    2,
                  )
              }
            />
          </>
        )}

        {/* Delete button */}

        {showHandles && (
          <g
            style={{
              cursor:
                'pointer',

              pointerEvents:
                'all',
            }}
            onClick={
              onDelete
            }
            onMouseDown={
              event =>
                event.stopPropagation()
            }
          >
            <circle
              cx={
                centerX
              }
              cy={
                centerY
              }
              r={7}
              fill="#08171d"
              stroke={
                item.color
              }
              strokeWidth={
                1.5
              }
            />

            <line
              x1={
                centerX -
                3
              }
              y1={
                centerY -
                3
              }
              x2={
                centerX +
                3
              }
              y2={
                centerY +
                3
              }
              stroke="#FF6B8A"
              strokeWidth={
                1.5
              }
              strokeLinecap="round"
            />

            <line
              x1={
                centerX +
                3
              }
              y1={
                centerY -
                3
              }
              x2={
                centerX -
                3
              }
              y2={
                centerY +
                3
              }
              stroke="#FF6B8A"
              strokeWidth={
                1.5
              }
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
}