import { createId } from '@/shared/lib/createId';
import type { MindmapNode, MindmapItem } from '@/entities/board/types';

export function nextBranchColor(nodes: MindmapNode[]): string {
  const palette = ['#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#f59e0b', '#22c55e'];
  const used = new Set(nodes.map((node) => node.branchColor));
  const available = palette.find((color) => !used.has(color));
  if (available) return available;
  let seed = nodes.length;
  let color: string;
  do {
    color = '#' + ((++seed * 2654435761) >>> 8).toString(16).padStart(6, '0');
  } while (used.has(color));
  return color;
}

export function mindmapTemplate(withBranches = true): MindmapNode[] {
  const root: MindmapNode = {
    id: createId(),
    parentId: null,
    label: 'Main idea',
    side: 'positive',
    branchColor: '#8b5cf6',
    background: '#292b30',
    textColor: '#ffffff',
  };
  return [
    root,
    ...(withBranches
      ? ['Explore', 'Develop', 'Plan'].map(
          (label, index): MindmapNode => ({
            id: createId(),
            parentId: root.id,
            label,
            side: index === 2 ? 'negative' : 'positive',
            branchColor: ['#8b5cf6', '#ec4899', '#3b82f6'][index]!,
            background: 'transparent',
            textColor: '#374151',
          }),
        )
      : []),
  ];
}

export function subtreeIds(nodes: MindmapNode[], id: string): Set<string> {
  const result = new Set([id]);
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId !== null) {
      const siblings = children.get(node.parentId) ?? [];
      siblings.push(node.id);
      children.set(node.parentId, siblings);
    }
  }
  const pending = [id];
  while (pending.length) {
    for (const child of children.get(pending.pop()!) ?? []) {
      if (!result.has(child)) {
        result.add(child);
        pending.push(child);
      }
    }
  }
  return result;
}

/** Root branches on opposite sides have independent visual ordering. */
export function mindmapSiblings(nodes: MindmapNode[], node: MindmapNode): MindmapNode[] {
  const isBranch = nodes.find((entry) => entry.id === node.parentId)?.parentId === null;
  return nodes.filter((entry) => entry.parentId === node.parentId && (!isBranch || entry.side === node.side));
}

export function addMindmapNode(nodes: MindmapNode[], selectedId: string, sibling = false): MindmapNode[] {
  const selected = nodes.find((node) => node.id === selectedId);
  if (!selected || (sibling && selected.parentId === null)) return nodes;
  const parentId = sibling ? selected.parentId! : selected.id;
  const parent = nodes.find((node) => node.id === parentId)!;
  const branches = nodes.filter((node) => node.parentId === parentId);
  const negativeCount = branches.filter((node) => node.side === 'negative').length;
  const side =
    parent.parentId === null && !sibling
      ? negativeCount < branches.length - negativeCount
        ? 'negative'
        : 'positive'
      : selected.side;
  const node: MindmapNode = {
    id: createId(),
    parentId,
    label: 'New idea',
    side,
    branchColor: parent.parentId === null ? nextBranchColor(branches) : selected.branchColor,
    background: 'transparent',
    textColor: '#374151',
  };
  const next = [...nodes, node];
  if (!sibling) return next;
  const siblings = mindmapSiblings(nodes, selected);
  return moveMindmapNode(next, node.id, parentId, siblings[siblings.indexOf(selected) + 1]?.id);
}

export function moveMindmapNode(nodes: MindmapNode[], id: string, parentId: string, beforeId?: string): MindmapNode[] {
  const node = nodes.find((entry) => entry.id === id);
  if (
    !node?.parentId ||
    beforeId === id ||
    !nodes.some((entry) => entry.id === parentId) ||
    subtreeIds(nodes, id).has(parentId)
  )
    return nodes;
  const next = nodes.filter((entry) => entry.id !== id);
  const index = beforeId ? next.findIndex((entry) => entry.id === beforeId && entry.parentId === parentId) : -1;
  const promoted = nodes.find((entry) => entry.id === parentId)?.parentId === null && node.parentId !== parentId;
  const branchColor = promoted
    ? nextBranchColor(nodes.filter((entry) => entry.parentId === parentId))
    : node.branchColor;
  let branch = node;
  if (promoted) {
    const byId = new Map(nodes.map((entry) => [entry.id, entry]));
    const visited = new Set([branch.id]);
    let parent = byId.get(branch.parentId!);
    while (parent?.parentId !== null && parent && !visited.has(parent.id)) {
      branch = parent;
      visited.add(branch.id);
      parent = byId.get(branch.parentId!);
    }
  }
  next.splice(index < 0 ? next.length : index, 0, { ...node, parentId, branchColor, side: branch.side });
  return next;
}

export function validMindmapTree(nodes: MindmapNode[]): boolean {
  if (
    !nodes.length ||
    nodes.some((node) => !node.id.trim()) ||
    new Set(nodes.map((node) => node.id)).size !== nodes.length
  )
    return false;
  const roots = nodes.filter((node) => node.parentId === null);
  return roots.length === 1 && subtreeIds(nodes, roots[0]!.id).size === nodes.length;
}

export interface PositionedMindmapNode extends MindmapNode {
  x: number;
  y: number;
  color: string;
  direction: number;
}

/** Reserve a full cross-axis lane for each subtree, keeping sibling branches clear. */
export function layoutMindmap(nodes: MindmapNode[], layout: MindmapItem['layout']) {
  const root = nodes.find((node) => node.parentId === null);
  if (!root) return { nodes: [] as PositionedMindmapNode[], width: 400, height: 240 };
  const children = new Map<string, MindmapNode[]>();
  for (const node of nodes) {
    if (node.parentId !== null) {
      const siblings = children.get(node.parentId) ?? [];
      siblings.push(node);
      children.set(node.parentId, siblings);
    }
  }
  const horizontal = layout === 'horizontal';
  const lane = horizontal ? 96 : 210;
  const spans = new Map<string, number>();
  // Iterative postorder supports deeply expanded maps without recursive stack limits.
  const order = [root];
  const seen = new Set([root.id]);
  for (let index = 0; index < order.length; index++) {
    for (const child of children.get(order[index]!.id) ?? []) {
      if (!seen.has(child.id)) {
        seen.add(child.id);
        order.push(child);
      }
    }
  }
  for (const node of [...order].reverse()) {
    spans.set(
      node.id,
      Math.max(
        lane,
        (children.get(node.id) ?? []).reduce((sum, child) => sum + (spans.get(child.id) ?? 0), 0),
      ),
    );
  }
  const positioned: PositionedMindmapNode[] = [{ ...root, x: 0, y: 0, color: root.branchColor, direction: 1 }];
  const pending: { node: MindmapNode; depth: number; cross: number; direction: number; color: string }[] = [];
  for (const direction of [-1, 1]) {
    const branches = (children.get(root.id) ?? []).filter((node) => (node.side === 'negative' ? -1 : 1) === direction);
    let cursor = -branches.reduce((sum, node) => sum + spans.get(node.id)!, 0) / 2;
    for (const node of branches) {
      const span = spans.get(node.id)!;
      pending.push({ node, depth: 1, cross: cursor + span / 2, direction, color: node.branchColor });
      cursor += span;
    }
  }
  while (pending.length) {
    const { node, depth, cross, direction, color } = pending.pop()!;
    const along = depth * (horizontal ? 260 : 150) * direction;
    positioned.push({ ...node, x: horizontal ? along : cross, y: horizontal ? cross : along, color, direction });
    let cursor = cross - spans.get(node.id)! / 2;
    for (const child of children.get(node.id) ?? []) {
      const span = spans.get(child.id)!;
      pending.push({ node: child, depth: depth + 1, cross: cursor + span / 2, direction, color });
      cursor += span;
    }
  }
  const minX = positioned.reduce((min, node) => Math.min(min, node.x), Infinity) - 130;
  const minY = positioned.reduce((min, node) => Math.min(min, node.y), Infinity) - 80;
  return {
    nodes: positioned.map((node) => ({ ...node, x: node.x - minX, y: node.y - minY })),
    width: positioned.reduce((max, node) => Math.max(max, node.x), -Infinity) - minX + 130,
    height: positioned.reduce((max, node) => Math.max(max, node.y), -Infinity) - minY + 80,
  };
}
