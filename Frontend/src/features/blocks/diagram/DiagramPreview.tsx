import { useId } from 'react';
import type { DiagramEdge, DiagramNode } from '@/entities/board/types';
import { readableText } from '../typography/textContrast';
import { useSectionStyle } from '../typography/TypographyContext';

type Side = 'top' | 'right' | 'bottom' | 'left';
type Point = { x: number; y: number };

const NODE_WIDTH = 160;
const DEFAULT_HEIGHT = 72;
const DECISION_HEIGHT = 110;

function nodeHeight(node: DiagramNode) {
  return node.data.shape === 'decision' ? DECISION_HEIGHT : DEFAULT_HEIGHT;
}

function inferredSide(node: DiagramNode, other: DiagramNode): Side {
  const dx = other.position.x - node.position.x;
  const dy = other.position.y - node.position.y;
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

function anchor(node: DiagramNode, side: Side): Point {
  const height = nodeHeight(node);
  switch (side) {
    case 'top':
      return { x: node.position.x + NODE_WIDTH / 2, y: node.position.y };
    case 'right':
      return { x: node.position.x + NODE_WIDTH, y: node.position.y + height / 2 };
    case 'bottom':
      return { x: node.position.x + NODE_WIDTH / 2, y: node.position.y + height };
    case 'left':
      return { x: node.position.x, y: node.position.y + height / 2 };
  }
}

function offset(point: Point, side: Side, distance: number): Point {
  if (side === 'top') return { x: point.x, y: point.y - distance };
  if (side === 'right') return { x: point.x + distance, y: point.y };
  if (side === 'bottom') return { x: point.x, y: point.y + distance };
  return { x: point.x - distance, y: point.y };
}

export function getDiagramPreviewEdgeGeometry(edge: DiagramEdge, source: DiagramNode, target: DiagramNode) {
  const sourceSide = (edge.sourceHandle as Side | null | undefined) ?? inferredSide(source, target);
  const targetSide = (edge.targetHandle as Side | null | undefined) ?? inferredSide(target, source);
  const start = anchor(source, sourceSide);
  const end = anchor(target, targetSide);
  const label = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 8 };

  if (edge.type === 'straight') return { path: `M${start.x} ${start.y}L${end.x} ${end.y}`, label };

  if (edge.type === 'default') {
    const distance = Math.max(44, Math.hypot(end.x - start.x, end.y - start.y) * 0.35);
    const a = offset(start, sourceSide, distance);
    const b = offset(end, targetSide, distance);
    return { path: `M${start.x} ${start.y}C${a.x} ${a.y} ${b.x} ${b.y} ${end.x} ${end.y}`, label };
  }

  const a = offset(start, sourceSide, 24);
  const b = offset(end, targetSide, 24);
  const sourceVertical = sourceSide === 'top' || sourceSide === 'bottom';
  const targetVertical = targetSide === 'top' || targetSide === 'bottom';
  if (sourceVertical && targetVertical) {
    const middle = (a.y + b.y) / 2;
    return {
      path: `M${start.x} ${start.y}L${a.x} ${a.y}L${a.x} ${middle}L${b.x} ${middle}L${b.x} ${b.y}L${end.x} ${end.y}`,
      label,
    };
  }
  if (!sourceVertical && !targetVertical) {
    const middle = (a.x + b.x) / 2;
    return {
      path: `M${start.x} ${start.y}L${a.x} ${a.y}L${middle} ${a.y}L${middle} ${b.y}L${b.x} ${b.y}L${end.x} ${end.y}`,
      label,
    };
  }
  return { path: `M${start.x} ${start.y}L${a.x} ${a.y}L${b.x} ${b.y}L${end.x} ${end.y}`, label };
}

/** Fixed SVG geometry keeps connections attached while the outer canvas is zoomed. */
export default function DiagramPreview({ nodes, edges }: { nodes: DiagramNode[]; edges: DiagramEdge[] }) {
  const labelStyle = useSectionStyle('labels');
  const marker = useId().replace(/:/g, '');
  if (!nodes.length) return null;

  const left = Math.min(...nodes.map((node) => node.position.x)) - 56;
  const top = Math.min(...nodes.map((node) => node.position.y)) - 56;
  const right = Math.max(...nodes.map((node) => node.position.x + NODE_WIDTH)) + 56;
  const bottom = Math.max(...nodes.map((node) => node.position.y + nodeHeight(node))) + 56;

  return (
    <svg
      role="img"
      aria-label="Diagram preview"
      width="100%"
      height="100%"
      viewBox={`${left} ${top} ${right - left} ${bottom - top}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0 0L8 4L0 8Z" fill="#8b7daa" />
        </marker>
      </defs>
      {edges.map((edge) => {
        const source = nodes.find((node) => node.id === edge.source);
        const target = nodes.find((node) => node.id === edge.target);
        if (!source || !target) return null;
        const geometry = getDiagramPreviewEdgeGeometry(edge, source, target);
        return (
          <g key={edge.id}>
            <path
              d={geometry.path}
              fill="none"
              stroke="#8b7daa"
              strokeWidth="2"
              strokeLinejoin="round"
              markerEnd={`url(#${marker})`}
            />
            {edge.label && (
              <text
                x={geometry.label.x}
                y={geometry.label.y}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-text-primary)"
                stroke="var(--color-surface)"
                strokeWidth="4"
                paintOrder="stroke"
                style={labelStyle}
              >
                {edge.label}
              </text>
            )}
          </g>
        );
      })}
      {nodes.map((node) => {
        const height = nodeHeight(node);
        return (
          <foreignObject key={node.id} x={node.position.x} y={node.position.y} width={NODE_WIDTH} height={height}>
            <div
              className="diagram-shape"
              data-shape={node.data.shape}
              style={{
                width: NODE_WIDTH,
                height,
                minHeight: height,
                background: node.data.color,
                color: readableText(node.data.color),
                ...labelStyle,
              }}
            >
              {node.data.label || 'Untitled'}
            </div>
          </foreignObject>
        );
      })}
    </svg>
  );
}
