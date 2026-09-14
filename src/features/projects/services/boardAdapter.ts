import { createId } from '@/shared/lib/createId';
import type { BoardItem } from '@/entities/board/types';
import type { BoardMutation, BoardSnapshot, ItemMutation, ItemWrite } from '@/entities/board/records';
import type { Project, ProjectSnapshot } from '@/entities/project/types';
import { validateItem } from '@/entities/board/itemSchema';
import { normalizeFrameMembership } from '@/features/canvas/utils/frameGeometry';
import { canonicalJson } from '@/shared/api/canonicalJson';

const appearanceKeys = [
  'color',
  'colorRole',
  'gradient',
  'topColor',
  'typography',
  'textAlign',
  'fontSize',
  'bold',
  'italic',
];
const sharedKeys = [
  'id',
  'type',
  'x',
  'y',
  'width',
  'height',
  'zIndex',
  'frameId',
  'locked',
  'tags',
  'comments',
  'items',
  'dispenserId',
  'startItemId',
  'endItemId',
];

export function flattenItems(items: BoardItem[], boardId: string): ItemMutation[] {
  const result: ItemMutation[] = [];
  function visit(children: BoardItem[], parentItemId: string | null) {
    children.forEach((item, index) => {
      const values = Object.entries(item);
      const data = Object.fromEntries(
        values.filter(([key]) => !sharedKeys.includes(key) && !appearanceKeys.includes(key)),
      );
      const write = {
        // HTML is explicitly versioned until the editor JSON migration is implemented.
        id: item.id,
        boardId,
        parentItemId,
        frameId: item.frameId ?? null,
        sortOrder: index * 1024,
        type: item.type,
        schemaVersion: 1,
        x: item.x,
        y: item.y,
        width: item.width ?? null,
        height: item.height ?? null,
        zIndex: item.zIndex,
        locked: item.locked ?? false,
        appearance: Object.fromEntries(values.filter(([key]) => appearanceKeys.includes(key))),
        data: item.type === 'document' ? { ...data, contentFormat: 'tiptap-html', contentVersion: 1 } : data,
      } as ItemWrite;
      validateItem(write);
      const links: ItemMutation['links'] = [];
      if (item.type === 'line') {
        if (item.startItemId) links.push({ sourceItemId: item.id, targetItemId: item.startItemId, kind: 'line_start' });
        if (item.endItemId) links.push({ sourceItemId: item.id, targetItemId: item.endItemId, kind: 'line_end' });
      }
      if (item.type === 'note' && item.dispenserId) {
        links.push({ sourceItemId: item.id, targetItemId: item.dispenserId, kind: 'created_from' });
      }
      result.push({
        item: write,
        expectedRevision: null,
        links,
        comments: (item.comments ?? []).map((c) => ({ id: c.id, text: c.text, status: c.status ?? 'open' })),
        tags: [...new Set((item.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
      });
      if (item.type === 'column') visit(item.items, item.id);
    });
  }
  visit(normalizeFrameMembership(items), null);
  return result;
}

export function toProjectView(snapshot: ProjectSnapshot): Project {
  const { project, board } = snapshot;
  const items = new Map<string, BoardItem>();
  for (const record of board.items.filter((item) => !item.deletedAt)) {
    validateItem(record);
    const item = {
      ...record.data,
      ...record.appearance,
      id: record.id,
      type: record.type,
      x: record.x,
      y: record.y,
      zIndex: record.zIndex,
      width: record.width ?? undefined,
      height: record.height ?? undefined,
      frameId: record.frameId,
      locked: record.locked,
      comments: board.comments
        .filter((c) => c.itemId === record.id && !c.deletedAt)
        .map((c) => ({ id: c.id, text: c.text, status: c.status, createdAt: c.createdAt })),
      tags: board.itemTags
        .filter((t) => t.itemId === record.id)
        .map((t) => board.tags.find((tag) => tag.id === t.tagId)!.name),
      ...(record.type === 'column' ? { items: [] } : {}),
    } as BoardItem;
    items.set(item.id, item);
  }
  for (const link of board.links) {
    const item = items.get(link.sourceItemId);
    if (item?.type === 'line' && link.kind === 'line_start') item.startItemId = link.targetItemId;
    if (item?.type === 'line' && link.kind === 'line_end') item.endItemId = link.targetItemId;
    if (item?.type === 'note' && link.kind === 'created_from') item.dispenserId = link.targetItemId;
  }
  const roots: BoardItem[] = [];
  for (const record of [...board.items].filter((i) => !i.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder)) {
    const item = items.get(record.id)!;
    const parent = record.parentItemId ? items.get(record.parentItemId) : null;
    if (parent?.type === 'column') parent.items.push(item);
    else roots.push(item);
  }
  return {
    id: project.id,
    ownerId: project.ownerId,
    name: project.name,
    color: project.color,
    deletedAt: project.deletedAt ?? undefined,
    items: roots,
  };
}

export function diffBoard(previous: BoardSnapshot, items: BoardItem[]): BoardMutation | null {
  const before = new Map(
    flattenItems(
      toProjectView({
        project: { ...previous.board, id: previous.board.projectId, ownerId: '', color: '' },
        board: previous,
      }).items,
      previous.board.id,
    ).map((entry) => [entry.item.id, entry]),
  );
  const after = flattenItems(items, previous.board.id);
  const revisions = new Map(previous.items.filter((i) => !i.deletedAt).map((i) => [i.id, i.revision]));
  const comparable = (entry: ItemMutation | undefined) =>
    entry && { ...entry, tags: [...new Set(entry.tags.map((tag) => tag.normalize('NFKC').toLowerCase()))].sort() };
  const upserts = after
    .filter((entry) => canonicalJson(comparable(entry)) !== canonicalJson(comparable(before.get(entry.item.id))))
    .map((entry) => ({ ...entry, expectedRevision: revisions.get(entry.item.id) ?? null }));
  const ids = new Set(after.map((entry) => entry.item.id));
  const deletes = [...revisions]
    .filter(([id]) => !ids.has(id))
    .map(([id, expectedRevision]) => ({ id, expectedRevision }));
  return upserts.length || deletes.length
    ? { clientMutationId: createId(), expectedBoardRevision: previous.board.revision, upserts, deletes }
    : null;
}

/** Fresh demo identities; reference remapping is scoped to this project. */
export function renewProjectIds(project: Project): Project {
  const ids = new Map<string, string>();
  function collect(value: unknown): void {
    if (!value || typeof value !== 'object') return;
    if ('id' in value && typeof value.id === 'string') ids.set(value.id, createId());
    Object.values(value).forEach(collect);
  }
  collect(project);
  function rewrite(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(rewrite);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        typeof entry === 'string' &&
        [
          'id',
          'frameId',
          'dispenserId',
          'startItemId',
          'endItemId',
          'source',
          'target',
          'sourceField',
          'targetField',
          'parentId',
        ].includes(key)
          ? (ids.get(entry) ?? entry)
          : rewrite(entry),
      ]),
    );
  }
  return rewrite(project) as Project;
}
