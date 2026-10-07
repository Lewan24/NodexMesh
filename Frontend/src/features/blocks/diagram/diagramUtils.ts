import { translate } from '@/shared/i18n';
import { createId } from '@/shared/lib/createId';
import type { DiagramEdge, DiagramNode } from '@/entities/board/types';
import { diagramNodeSize } from './diagramGeometry';

export function removeDiagramNodes(nodes: DiagramNode[], edges: DiagramEdge[], ids: Set<string>) {
  return {
    nodes: nodes.filter((node) => !ids.has(node.id)),
    edges: edges.filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)),
  };
}
/** Center each layer and reserve space for the largest shape; break cycles deterministically. */
export function layoutDiagram(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: 'vertical' | 'horizontal' = 'vertical',
): DiagramNode[] {
  const remaining = new Set(nodes.map((node) => node.id));
  const layers: DiagramNode[][] = [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  while (remaining.size) {
    let layer = [...remaining].filter((id) => !edges.some((edge) => edge.target === id && remaining.has(edge.source)));
    if (!layer.length) layer = [[...remaining][0]!];
    layers.push(layer.map((id) => byId.get(id)!));
    layer.forEach((id) => remaining.delete(id));
  }
  const positions = new Map<string, { x: number; y: number }>();
  const crossSize = (node: DiagramNode) =>
    direction === 'vertical' ? diagramNodeSize(node).width : diagramNodeSize(node).height;
  const layerSize = (layer: DiagramNode[]) =>
    layer.reduce((sum, node) => sum + crossSize(node), 0) + (layer.length - 1) * 96;
  const widest = Math.max(0, ...layers.map(layerSize));
  let main = 0;
  for (const layer of layers) {
    let cross = (widest - layerSize(layer)) / 2;
    for (const node of layer) {
      positions.set(node.id, direction === 'vertical' ? { x: cross, y: main } : { x: main, y: cross });
      cross += crossSize(node) + 96;
    }
    main +=
      Math.max(
        ...layer.map((node) => (direction === 'vertical' ? diagramNodeSize(node).height : diagramNodeSize(node).width)),
      ) + 96;
  }
  return nodes.map((node) => ({ ...node, position: positions.get(node.id)! }));
}

export function layoutDiagramConnections(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: 'vertical' | 'horizontal',
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, number>();
  edges.forEach((edge) => outgoing.set(edge.source, (outgoing.get(edge.source) ?? 0) + 1));
  const vertical = direction === 'vertical';
  const forwardSource = vertical ? 'bottom' : 'right';
  const forwardTarget = vertical ? 'top' : 'left';
  return edges.map((edge) => {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) return edge;
    const mainDelta = vertical ? target.position.y - source.position.y : target.position.x - source.position.x;
    const crossDelta = vertical ? target.position.x - source.position.x : target.position.y - source.position.y;
    let sourceHandle = mainDelta >= 0 ? forwardSource : forwardTarget;
    if (source.data.shape === 'decision' && (outgoing.get(source.id) ?? 0) > 1 && crossDelta !== 0) {
      const negativeSide = vertical ? 'left' : 'top';
      const positiveSide = vertical ? 'right' : 'bottom';
      sourceHandle = crossDelta < 0 ? negativeSide : positiveSide;
    }
    return { ...edge, sourceHandle, targetHandle: mainDelta >= 0 ? forwardTarget : forwardSource };
  });
}

export function diagramTemplate(): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const ids = Array.from({ length: 6 }, () => createId());
  const nodes: DiagramNode[] = [
    {
      id: ids[0]!,
      type: 'shape',
      position: { x: 160, y: 0 },
      data: { label: translate('Request received'), shape: 'terminal', color: '#0f766e' },
    },
    {
      id: ids[1]!,
      type: 'shape',
      position: { x: 160, y: 176 },
      data: { label: translate('Valid request?'), shape: 'decision', color: '#b45309' },
    },
    {
      id: ids[2]!,
      type: 'shape',
      position: { x: 0, y: 400 },
      data: { label: translate('Process request'), shape: 'process', color: '#7c3aed' },
    },
    {
      id: ids[3]!,
      type: 'shape',
      position: { x: 320, y: 400 },
      data: { label: translate('Reject request'), shape: 'process', color: '#be123c' },
    },
    {
      id: ids[4]!,
      type: 'shape',
      position: { x: 0, y: 576 },
      data: { label: translate('Save result'), shape: 'database', color: '#0369a1' },
    },
    {
      id: ids[5]!,
      type: 'shape',
      position: { x: 320, y: 576 },
      data: { label: translate('Return error'), shape: 'terminal', color: '#be123c' },
    },
  ];
  const edges = [
    [0, 1, ''],
    [1, 2, translate('Yes')],
    [1, 3, translate('No')],
    [2, 4, ''],
    [3, 5, ''],
  ].map(([source, target, label]) => ({
    id: createId(),
    source: ids[Number(source)]!,
    target: ids[Number(target)]!,
    sourceHandle: Number(source) === 1 ? (Number(target) === 2 ? 'left' : 'right') : 'bottom',
    targetHandle: 'top',
    label: String(label),
    color: Number(source) === 1 ? (Number(target) === 2 ? '#0f766e' : '#be123c') : '#8874bd',
  }));
  return { nodes, edges };
}

export function alignDiagramNodes<T extends DiagramNode>(nodes: T[], ids: Set<string>, axis: 'x' | 'y'): T[] {
  const selected = nodes.filter((node) => ids.has(node.id));
  if (selected.length < 2) return nodes;
  const position = Math.round(Math.min(...selected.map((node) => node.position[axis])) / 16) * 16;
  return nodes.map((node) => (ids.has(node.id) ? { ...node, position: { ...node.position, [axis]: position } } : node));
}

export function canConnectDiagram(
  edges: DiagramEdge[],
  connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null },
  ignoredId?: string,
) {
  return (
    connection.source !== connection.target &&
    !edges.some(
      (edge) =>
        edge.id !== ignoredId &&
        edge.source === connection.source &&
        edge.target === connection.target &&
        edge.sourceHandle === connection.sourceHandle &&
        edge.targetHandle === connection.targetHandle,
    )
  );
}
