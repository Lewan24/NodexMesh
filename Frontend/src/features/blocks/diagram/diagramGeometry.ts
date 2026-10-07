import { getBezierPath, getSmoothStepPath, getStraightPath, MarkerType, Position } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import type { DiagramEdge, DiagramNode } from '@/entities/board/types';

export type FlowEdge = Edge & Pick<DiagramEdge, 'color' | 'strokeWidth' | 'lineStyle' | 'arrow'>;

/** Strip transient editor fields while retaining every persisted connection setting. */
export function toDiagramEdges(edges: FlowEdge[]): DiagramEdge[] {
  return edges.map(
    ({ id, source, target, sourceHandle, targetHandle, label, type, color, strokeWidth, lineStyle, arrow }) => ({
      id,
      source,
      target,
      sourceHandle,
      targetHandle,
      type: type === 'default' || type === 'straight' ? type : 'smoothstep',
      label: typeof label === 'string' ? label : '',
      ...(color !== undefined ? { color } : {}),
      ...(strokeWidth !== undefined ? { strokeWidth } : {}),
      ...(lineStyle !== undefined ? { lineStyle } : {}),
      ...(arrow !== undefined ? { arrow } : {}),
    }),
  );
}

export const DIAGRAM_NODE_WIDTH = 192;
export const DIAGRAM_NODE_HEIGHT = 80;
export const DIAGRAM_DECISION_HEIGHT = 128;
export const DIAGRAM_EDGE_COLOR = '#8874bd';
export const DIAGRAM_PATH_OPTIONS = { borderRadius: 16, offset: 32 };
type Side = 'top' | 'right' | 'bottom' | 'left';
const positions = { top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left };

export function diagramNodeSize(node: Pick<DiagramNode, 'data'>) {
  return {
    width: DIAGRAM_NODE_WIDTH,
    height: node.data.shape === 'decision' ? DIAGRAM_DECISION_HEIGHT : DIAGRAM_NODE_HEIGHT,
  };
}

function inferredSide(node: DiagramNode, other: DiagramNode): Side {
  const dx = other.position.x - node.position.x;
  const dy = other.position.y + diagramNodeSize(other).height / 2 - node.position.y - diagramNodeSize(node).height / 2;
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

export function diagramHandles(edge: DiagramEdge, source: DiagramNode, target: DiagramNode) {
  const side = (value: string | null | undefined, fallback: Side): Side =>
    value && Object.hasOwn(positions, value) ? (value as Side) : fallback;
  return {
    sourceHandle: side(edge.sourceHandle, inferredSide(source, target)),
    targetHandle: side(edge.targetHandle, inferredSide(target, source)),
  };
}

function anchor(node: DiagramNode, side: Side) {
  const { width, height } = diagramNodeSize(node);
  const inset = node.data.shape === 'input' ? width * 0.06 : 0;
  const bottom = node.data.shape === 'document' ? height * 0.85 : height;
  return {
    x: node.position.x + (side === 'left' ? inset : side === 'right' ? width - inset : width / 2),
    y: node.position.y + (side === 'top' ? 0 : side === 'bottom' ? bottom : height / 2),
  };
}

export function getDiagramPreviewEdgeGeometry(edge: DiagramEdge, source: DiagramNode, target: DiagramNode) {
  const handles = diagramHandles(edge, source, target);
  const start = anchor(source, handles.sourceHandle);
  const end = anchor(target, handles.targetHandle);
  const params = {
    sourceX: start.x,
    sourceY: start.y,
    targetX: end.x,
    targetY: end.y,
    sourcePosition: positions[handles.sourceHandle],
    targetPosition: positions[handles.targetHandle],
  };
  const [path, x, y] =
    edge.type === 'straight'
      ? getStraightPath(params)
      : edge.type === 'default'
        ? getBezierPath(params)
        : getSmoothStepPath({ ...params, ...DIAGRAM_PATH_OPTIONS });
  // All three generators use absolute M/L/Q/C coordinates, including curve control points.
  const coordinates = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)?.map(Number) ?? [];
  const points = Array.from({ length: coordinates.length / 2 }, (_, index) => ({
    x: coordinates[index * 2]!,
    y: coordinates[index * 2 + 1]!,
  }));
  return { path, label: { x, y }, points };
}

export function diagramEdgeAppearance(edge: Pick<DiagramEdge, 'color' | 'strokeWidth' | 'lineStyle' | 'arrow'>) {
  const color = edge.color ?? DIAGRAM_EDGE_COLOR;
  const strokeWidth = edge.strokeWidth ?? 3;
  return {
    color,
    strokeWidth,
    strokeDasharray: edge.lineStyle === 'dashed' ? '10 6' : edge.lineStyle === 'dotted' ? '1 6' : undefined,
    arrow: edge.arrow !== false,
  };
}

export function diagramFlowEdge(
  edge: DiagramEdge,
  nodes: DiagramNode[],
): Edge & { pathOptions: typeof DIAGRAM_PATH_OPTIONS } {
  const source = nodes.find((node) => node.id === edge.source);
  const target = nodes.find((node) => node.id === edge.target);
  const appearance = diagramEdgeAppearance(edge);
  return {
    ...edge,
    ...(source && target ? diagramHandles(edge, source, target) : {}),
    type: edge.type ?? 'smoothstep',
    interactionWidth: 24,
    pathOptions: DIAGRAM_PATH_OPTIONS,
    style: {
      stroke: appearance.color,
      strokeWidth: appearance.strokeWidth,
      strokeDasharray: appearance.strokeDasharray,
      strokeLinecap: 'round',
    },
    markerEnd: appearance.arrow
      ? { type: MarkerType.ArrowClosed, color: appearance.color, width: 16, height: 16 }
      : undefined,
    labelBgStyle: { fill: 'var(--color-surface)', fillOpacity: 0.95 },
    labelBgPadding: [8, 4],
    labelBgBorderRadius: 4,
  };
}
