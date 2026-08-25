import { useState } from 'react';
import type { LineItem, BoardItem } from '../types';

interface Props {
  item: LineItem;
  zoom: number;
  isSelected: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onLineEndpointDrag: (e: React.MouseEvent, endpoint: 1 | 2) => void;
}

const ARROW_SIZE = 10;

function arrowHead(x: number, y: number, angle: number, color: string) {
  const a1x = x - ARROW_SIZE * Math.cos(angle - Math.PI / 6);
  const a1y = y - ARROW_SIZE * Math.sin(angle - Math.PI / 6);
  const a2x = x - ARROW_SIZE * Math.cos(angle + Math.PI / 6);
  const a2y = y - ARROW_SIZE * Math.sin(angle + Math.PI / 6);
  return <polyline points={`${a1x},${a1y} ${x},${y} ${a2x},${a2y}`} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
}

export default function LineBlock({ item, isSelected, onDelete, onLineEndpointDrag }: Props) {
  const [hovered, setHovered] = useState(false);

  const dx = item.x2 - item.x;
  const dy = item.y2 - item.y;
  const angle = Math.atan2(dy, dx);

  const PAD = 20;
  const svgW = Math.abs(dx) + PAD * 2;
  const svgH = Math.abs(dy) + PAD * 2;

  const ox = dx >= 0 ? PAD : PAD + Math.abs(dx);
  const oy = dy >= 0 ? PAD : PAD + Math.abs(dy);
  const ex = ox + dx;
  const ey = oy + dy;

  const svgLeft = dx >= 0 ? -PAD : -(PAD + Math.abs(dx));
  const svgTop = dy >= 0 ? -PAD : -(PAD + Math.abs(dy));

  const showHandles = hovered || isSelected;
  const lineColor = isSelected ? '#7C3AED' : item.color;

  return (
    <div
      className="absolute"
      style={{ left: svgLeft, top: svgTop, pointerEvents: 'none' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width={svgW} height={svgH} style={{ overflow: 'visible', display: 'block' }}>
        {/* Invisible hit area */}
        <line
          x1={ox} y1={oy} x2={ex} y2={ey}
          stroke="transparent"
          strokeWidth={16}
          style={{ pointerEvents: 'stroke', cursor: 'grab' }}
        />

        {/* Visible line */}
        <line
          x1={ox} y1={oy} x2={ex} y2={ey}
          stroke={lineColor}
          strokeWidth={item.strokeWidth}
          strokeLinecap="round"
          style={{ pointerEvents: 'none' }}
        />

        {item.arrowEnd && arrowHead(ex, ey, angle, lineColor)}
        {item.arrowStart && arrowHead(ox, oy, angle + Math.PI, lineColor)}

        {/* Endpoint handles on hover/select — a square marks an endpoint attached to an item */}
        {showHandles && (
          <>
            {item.startItemId ? (
              <rect
                x={ox - 4.5} y={oy - 4.5} width={9} height={9} rx={2}
                fill={item.color} stroke="#08171d" strokeWidth={2}
                style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                onMouseDown={e => { e.stopPropagation(); onLineEndpointDrag(e, 1); }}
              />
            ) : (
              <circle
                cx={ox} cy={oy} r={5}
                fill={item.color} stroke="#08171d" strokeWidth={2}
                style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                onMouseDown={e => { e.stopPropagation(); onLineEndpointDrag(e, 1); }}
              />
            )}
            {item.endItemId ? (
              <rect
                x={ex - 4.5} y={ey - 4.5} width={9} height={9} rx={2}
                fill={item.color} stroke="#08171d" strokeWidth={2}
                style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                onMouseDown={e => { e.stopPropagation(); onLineEndpointDrag(e, 2); }}
              />
            ) : (
              <circle
                cx={ex} cy={ey} r={5}
                fill={item.color} stroke="#08171d" strokeWidth={2}
                style={{ cursor: 'crosshair', pointerEvents: 'all' }}
                onMouseDown={e => { e.stopPropagation(); onLineEndpointDrag(e, 2); }}
              />
            )}
          </>
        )}

        {/* Delete on hover */}
        {showHandles && (
          <g
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onClick={() => onDelete()}
            onMouseDown={e => e.stopPropagation()}
          >
            <circle cx={(ox + ex) / 2} cy={(oy + ey) / 2} r={7} fill="#08171d" stroke={item.color} strokeWidth={1.5} />
            <line
              x1={(ox + ex) / 2 - 3} y1={(oy + ey) / 2 - 3}
              x2={(ox + ex) / 2 + 3} y2={(oy + ey) / 2 + 3}
              stroke="#FF6B8A" strokeWidth={1.5} strokeLinecap="round"
            />
            <line
              x1={(ox + ex) / 2 + 3} y1={(oy + ey) / 2 - 3}
              x2={(ox + ex) / 2 - 3} y2={(oy + ey) / 2 + 3}
              stroke="#FF6B8A" strokeWidth={1.5} strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
