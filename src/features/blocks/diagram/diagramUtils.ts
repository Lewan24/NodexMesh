import type { DiagramEdge, DiagramNode } from '@/entities/board/types';

export function removeDiagramNodes(nodes: DiagramNode[], edges: DiagramEdge[], ids: Set<string>) {
  return { nodes: nodes.filter(node => !ids.has(node.id)), edges: edges.filter(edge => !ids.has(edge.source) && !ids.has(edge.target)) };
}
/** Layer directed acyclic paths, then place cycles in a final row without losing nodes. */
export function layoutDiagram(nodes: DiagramNode[], edges: DiagramEdge[], direction: 'vertical' | 'horizontal' = 'vertical'): DiagramNode[] {
  const remaining = new Set(nodes.map(node => node.id));
  const positions = new Map<string, { x: number; y: number }>();
  let row = 0;
  while (remaining.size) {
    let layer = [...remaining].filter(id => !edges.some(edge => edge.target === id && remaining.has(edge.source)));
    if (!layer.length) layer = [...remaining];
    layer.forEach((id, index) => { positions.set(id, { x: index * 224, y: row * 176 }); remaining.delete(id); });
    row++;
  }
  return nodes.map(node => ({ ...node, position: direction === 'horizontal' ? { x: positions.get(node.id)!.y * 2, y: positions.get(node.id)!.x } : positions.get(node.id)! }));
}
export function diagramTemplate(): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  const ids = Array.from({ length: 5 }, () => crypto.randomUUID());
  const nodes: DiagramNode[] = [
    { id: ids[0]!, type: 'shape', position: { x: 220, y: 0 }, data: { label: 'Request received', shape: 'terminal', color: '#0f766e' } },
    { id: ids[1]!, type: 'shape', position: { x: 220, y: 150 }, data: { label: 'Valid request?', shape: 'decision', color: '#b45309' } },
    { id: ids[2]!, type: 'shape', position: { x: 0, y: 340 }, data: { label: 'Process request', shape: 'process', color: '#7c3aed' } },
    { id: ids[3]!, type: 'shape', position: { x: 440, y: 340 }, data: { label: 'Return error', shape: 'terminal', color: '#be123c' } },
    { id: ids[4]!, type: 'shape', position: { x: 0, y: 490 }, data: { label: 'Save result', shape: 'database', color: '#0369a1' } },
  ];
  const edges = [[0, 1, ''], [1, 2, 'Yes'], [1, 3, 'No'], [2, 4, '']].map(([source, target, label]) => ({ id: crypto.randomUUID(), source: ids[Number(source)]!, target: ids[Number(target)]!, sourceHandle: 'bottom', targetHandle: 'top', label: String(label) }));
  return { nodes, edges };
}



export function alignDiagramNodes<T extends DiagramNode>(nodes: T[], ids: Set<string>, axis: 'x' | 'y'): T[] {
  const selected = nodes.filter(node => ids.has(node.id));
  if (selected.length < 2) return nodes;
  const position = Math.round(Math.min(...selected.map(node => node.position[axis])) / 16) * 16;
  return nodes.map(node => ids.has(node.id) ? { ...node, position: { ...node.position, [axis]: position } } : node);
}

export function canConnectDiagram(edges: DiagramEdge[], connection: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }, ignoredId?: string) {
  return connection.source !== connection.target && !edges.some(edge => edge.id !== ignoredId &&
    edge.source === connection.source && edge.target === connection.target &&
    edge.sourceHandle === connection.sourceHandle && edge.targetHandle === connection.targetHandle);
}
