import { createId } from '@/shared/lib/createId';
import { validateBoard } from '@/entities/board/boardValidation';
import { parseProjectSnapshots } from './responseValidation';
import type { AuditFields, BoardSnapshot, ItemMutation, Revision } from '@/entities/board/records';
import type { ProjectSnapshot } from '@/entities/project/types';
import { validateItem } from '@/entities/board/itemSchema';
import { seedProjectsFor } from '@/entities/project/projectSeeder';
import { fail } from '@/shared/api/errors';
import { flattenItems, renewProjectIds } from './boardAdapter';
import { canonicalJson } from '@/shared/api/canonicalJson';
import type { WorkspaceServices } from './contracts';

interface Database {
  formatVersion: 2;
  projects: ProjectSnapshot[];
  boards: Record<string, BoardSnapshot[]>;
  receipts: Record<string, { request: string; result: unknown }>;
}

export const mockWorkspaceKey = (userId: string) => `nodexmesh_api_mock_v1_${userId}`;
const increment = (revision: Revision) => (BigInt(revision) + 1n).toString();
const audit = (userId: string): AuditFields => {
  const now = new Date().toISOString();
  return { revision: '1', createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId, deletedAt: null };
};
const touch = <T extends AuditFields>(value: T, userId: string): T => ({
  ...value,
  revision: increment(value.revision),
  updatedAt: new Date().toISOString(),
  updatedBy: userId,
});

function applyItem(board: BoardSnapshot, entry: ItemMutation, userId: string): void {
  const allowed = [
    'id',
    'boardId',
    'parentItemId',
    'frameId',
    'sortOrder',
    'type',
    'schemaVersion',
    'x',
    'y',
    'width',
    'height',
    'zIndex',
    'locked',
    'appearance',
    'data',
  ];
  if (Object.keys(entry.item).some((key) => !allowed.includes(key)))
    fail(422, 'read_only_field', 'Server-owned item fields cannot be submitted.');
  validateItem(entry.item);
  const old = board.items.find((item) => item.id === entry.item.id);
  const item = { ...entry.item, ...(old ? touch(old, userId) : audit(userId)), ...entry.item, deletedAt: null };
  board.items = board.items.filter((i) => i.id !== item.id).concat(item);
  board.links = board.links.filter((link) => link.sourceItemId !== item.id).concat(entry.links);
  const commentIds = new Set(entry.comments.map((c) => c.id));
  board.comments = board.comments.map((c) =>
    c.itemId === item.id && !commentIds.has(c.id) && !c.deletedAt
      ? { ...touch(c, userId), deletedAt: new Date().toISOString() }
      : c,
  );
  for (const comment of entry.comments) {
    const previous = board.comments.find((c) => c.id === comment.id);
    if (previous && previous.itemId !== item.id) fail(422, 'invalid_comment', 'Comment belongs to another item.');
    if (comment.text.length > 10_000 || !['open', 'todo', 'in-progress', 'resolved'].includes(comment.status)) {
      fail(422, 'invalid_comment', 'Invalid comment.');
    }
    const metadata = previous
      ? previous.text === comment.text && previous.status === comment.status && !previous.deletedAt
        ? previous
        : touch(previous, userId)
      : audit(userId);
    board.comments = board.comments
      .filter((c) => c.id !== comment.id)
      .concat({
        ...metadata,
        id: comment.id,
        text: comment.text,
        status: comment.status,
        itemId: item.id,
        deletedAt: null,
      });
  }
  board.itemTags = board.itemTags.filter((t) => t.itemId !== item.id);
  if (entry.tags.length > 100) fail(422, 'invalid_tags', 'Too many tags.');
  for (const name of entry.tags) {
    const normalizedName = name.trim().normalize('NFKC').toLowerCase();
    if (!normalizedName || name.trim().length > 64 || normalizedName.length > 64)
      fail(422, 'invalid_tag', 'Invalid tag.');
    let tag = board.tags.find((t) => t.normalizedName === normalizedName);
    if (!tag) {
      tag = { id: createId(), projectId: board.board.projectId, name: name.trim(), normalizedName };
      board.tags.push(tag);
    }
    if (!board.itemTags.some((t) => t.itemId === item.id && t.tagId === tag.id))
      board.itemTags.push({ itemId: item.id, tagId: tag.id });
  }
}

/** This emulates API semantics; browser storage and mock identity are not a security boundary. */
export function createMockWorkspace(
  userId: string,
  storage: Storage,
  currentUserId: () => string | null,
): WorkspaceServices {
  const key = mockWorkspaceKey(userId);
  const authorize = () => {
    if (currentUserId() !== userId) fail(401, 'session_expired', 'Please sign in again.');
  };
  function read(): Database {
    authorize();
    const raw = storage.getItem(key);
    if (raw === null) return { formatVersion: 2, projects: [], boards: {}, receipts: {} };
    try {
      const parsed = JSON.parse(raw) as {
        formatVersion: number;
        projects: ProjectSnapshot[];
        boards?: Record<string, BoardSnapshot[]>;
        receipts: Database['receipts'];
      };
      const value: Database =
        parsed.formatVersion === 1
          ? {
              formatVersion: 2,
              projects: parsed.projects,
              boards: Object.fromEntries(parsed.projects.map((project) => [project.project.id, [project.board]])),
              receipts: parsed.receipts,
            }
          : { formatVersion: 2, projects: parsed.projects, boards: parsed.boards ?? {}, receipts: parsed.receipts };
      if (value.formatVersion !== 2 || !Array.isArray(value.projects) || !value.boards || !value.receipts)
        throw new Error();
      value.projects = parseProjectSnapshots(value.projects);
      for (const snapshot of value.projects) {
        if (snapshot.project.ownerId !== userId || snapshot.board.board.projectId !== snapshot.project.id)
          throw new Error();
        validateBoard(snapshot.board);

        const boards = value.boards[snapshot.project.id] ?? [];
        const currentBoard = boards.find((board) => board.board.id === snapshot.board.board.id);
        if (currentBoard) snapshot.board = currentBoard;
        else value.boards[snapshot.project.id] = [snapshot.board, ...boards];
      }
      for (const [projectId, boards] of Object.entries(value.boards)) {
        if (!Array.isArray(boards)) throw new Error();
        for (const board of boards) {
          if (board.board.projectId !== projectId) throw new Error();
          validateBoard(board);
        }
      }
      return value;
    } catch {
      return fail(
        422,
        'invalid_storage',
        'Stored mock data is invalid or uses a newer schema. It was not overwritten.',
      );
    }
  }
  function find(db: Database, id: string): ProjectSnapshot {
    return (
      db.projects.find((p) => p.project.id === id && p.project.ownerId === userId) ??
      fail(404, 'not_found', 'Project not found.')
    );
  }
  function findBoard(db: Database, projectId: string, boardId: string): BoardSnapshot {
    find(db, projectId);
    return (
      db.boards[projectId]?.find((board) => board.board.id === boardId) ?? fail(404, 'not_found', 'Board not found.')
    );
  }
  async function locked<T>(operation: () => T): Promise<T> {
    // Web Locks serialize read/check/write across tabs on the same origin.
    if (typeof window !== 'undefined' && navigator.locks) return navigator.locks.request(key, async () => operation());
    return operation();
  }
  function persist(db: Database, currentReceiptId?: string): void {
    const expiredReceipts = Object.keys(db.receipts).filter((id) => id !== currentReceiptId);
    while (true) {
      try {
        storage.setItem(key, JSON.stringify(db));
        return;
      } catch (error) {
        const quotaExceeded = error instanceof Error && error.name === 'QuotaExceededError';
        if (!quotaExceeded) throw error;

        // Receipt results contain full board snapshots. Evict only retry history,
        // never project data or the current receipt needed after a lost response.
        const oldest = expiredReceipts.shift();
        if (oldest !== undefined) {
          delete db.receipts[oldest];
          continue;
        }
        fail(
          507,
          'storage_full',
          'Browser storage is full. Your changes are still open. Download a local draft before closing this page.',
        );
      }
    }
  }
  async function transaction<T>(id: string, request: unknown, operation: (db: Database) => T): Promise<T> {
    return locked(() => {
      const db = read();
      const serialized = canonicalJson(request);
      const previous = db.receipts[id];
      if (previous) {
        if (previous.request !== serialized)
          fail(409, 'mutation_reused', 'Mutation ID was reused with different content.');
        return structuredClone(previous.result) as T;
      }
      const result = operation(db);
      db.receipts[id] = { request: serialized, result: result ?? null };
      // A bounded mock receipt window; the backend defines time-based retention.
      const receipts = Object.keys(db.receipts);
      for (const old of receipts.slice(0, Math.max(0, receipts.length - 100))) delete db.receipts[old];
      persist(db, id);
      return result === undefined ? result : (JSON.parse(JSON.stringify(result)) as T);
    });
  }
  const services: WorkspaceServices = {
    projects: {
      async list(signal) {
        return locked(() => {
          signal?.throwIfAborted();
          const db = read();
          if (storage.getItem(key) === null) {
            for (const source of seedProjectsFor(userId)) {
              const demo = renewProjectIds(source);
              const metadata = audit(userId);
              const board: BoardSnapshot = {
                board: { id: createId(), projectId: demo.id, name: 'Board', sortOrder: 0, ...metadata },
                items: [],
                links: [],
                comments: [],
                tags: [],
                itemTags: [],
              };
              for (const entry of flattenItems(demo.items, board.board.id)) applyItem(board, entry, userId);
              validateBoard(board);
              db.projects.push({
                project: { id: demo.id, ownerId: userId, name: demo.name, color: demo.color, ...metadata },
                board,
              });
              db.boards[demo.id] = [board];
            }
            persist(db);
          }
          return structuredClone(db.projects);
        });
      },
      create(input) {
        return transaction(input.clientMutationId, { action: 'create', input }, (db) => {
          if (db.projects.some((p) => p.project.id === input.id)) fail(409, 'duplicate_id', 'Project already exists.');
          if (!input.name.trim() || input.name.length > 200)
            fail(422, 'invalid_name', 'Project name must contain 1–200 characters.');
          const metadata = audit(userId);
          const snapshot: ProjectSnapshot = {
            project: { id: input.id, ownerId: userId, name: input.name.trim(), color: input.color, ...metadata },
            board: {
              board: { id: createId(), projectId: input.id, name: 'Board', sortOrder: 0, ...metadata },
              items: [],
              links: [],
              comments: [],
              tags: [],
              itemTags: [],
            },
          };
          db.projects.push(snapshot);
          db.boards[input.id] = [snapshot.board];
          return snapshot;
        });
      },
      update(id, input) {
        return transaction(input.clientMutationId, { action: 'update', id, input }, (db) => {
          const snapshot = find(db, id);
          if (snapshot.project.revision !== input.expectedRevision)
            fail(409, 'revision_conflict', 'Project changed in another session.');
          if (!input.name.trim() || input.name.length > 200)
            fail(422, 'invalid_name', 'Project name must contain 1–200 characters.');
          snapshot.project = {
            ...touch(snapshot.project, userId),
            name: input.name.trim(),
            color: input.color,
            deletedAt: input.deletedAt,
          };
          return snapshot.project;
        });
      },
      purge(id, expectedRevision, clientMutationId) {
        return transaction(clientMutationId, { action: 'purge', id, expectedRevision }, (db) => {
          const snapshot = find(db, id);
          if (!snapshot.project.deletedAt || snapshot.project.revision !== expectedRevision)
            fail(409, 'revision_conflict', 'Only an unchanged trashed project can be removed.');
          db.projects = db.projects.filter((p) => p.project.id !== id);
          delete db.boards[id];
        });
      },
    },
    boards: {
      async list(projectId, signal) {
        signal?.throwIfAborted();
        const db = read();
        const snapshot = find(db, projectId);
        return structuredClone(db.boards[projectId]?.map((board) => board.board) ?? [snapshot.board.board]);
      },
      async create(projectId, name) {
        return transaction(createId(), { action: 'create-board', projectId, name }, (db) => {
          find(db, projectId);
          const normalizedName = name.trim();
          if (!normalizedName || normalizedName.length > 200)
            fail(422, 'invalid_name', 'Board name must contain 1–200 characters.');
          const metadata = audit(userId);
          const boards = db.boards[projectId] ?? [];
          const board: BoardSnapshot = {
            board: { id: createId(), projectId, name: normalizedName, sortOrder: boards.length, ...metadata },
            items: [],
            links: [],
            comments: [],
            tags: [],
            itemTags: [],
          };
          db.boards[projectId] = [...boards, board];
          return board;
        });
      },
      async rename(projectId, boardId, name) {
        return transaction(createId(), { action: 'rename-board', projectId, boardId, name }, (db) => {
          const board = findBoard(db, projectId, boardId);
          const normalizedName = name.trim();
          if (!normalizedName || normalizedName.length > 200)
            fail(422, 'invalid_name', 'Board name must contain 1–200 characters.');
          board.board = { ...touch(board.board, userId), name: normalizedName };
          return board.board;
        });
      },
      async delete(projectId, boardId) {
        return transaction(createId(), { action: 'delete-board', projectId, boardId }, (db) => {
          const boards = db.boards[projectId] ?? [];
          const board = findBoard(db, projectId, boardId);
          if (board.board.id === boards[0]?.board.id) fail(409, 'default_board', 'The main board cannot be deleted.');
          db.boards[projectId] = boards.filter((entry) => entry.board.id !== boardId);
        });
      },
      async get(projectId, boardId, signal) {
        signal?.throwIfAborted();
        return structuredClone(findBoard(read(), projectId, boardId));
      },
      mutate(projectId, boardId, mutation) {
        return transaction(mutation.clientMutationId, { action: 'mutate', projectId, boardId, mutation }, (db) => {
          const snapshot = find(db, projectId);
          const board = findBoard(db, projectId, boardId);
          if (snapshot.project.deletedAt) fail(409, 'project_trashed', 'Restore the project before editing it.');
          if (board.board.revision !== mutation.expectedBoardRevision)
            fail(409, 'revision_conflict', 'Board changed in another session. Local changes are preserved.');
          const touched = new Set<string>();
          for (const entry of [
            ...mutation.upserts.map((u) => ({ id: u.item.id, expectedRevision: u.expectedRevision })),
            ...mutation.deletes,
          ]) {
            if (touched.has(entry.id)) fail(422, 'duplicate_operation', 'Duplicate operation.');
            touched.add(entry.id);
            const existing = board.items.find((i) => i.id === entry.id && !i.deletedAt);
            if ((existing?.revision ?? null) !== entry.expectedRevision)
              fail(409, 'revision_conflict', 'Item changed in another session.');
          }
          for (const entry of mutation.upserts) applyItem(board, entry, userId);
          const removed = new Set(mutation.deletes.map((entry) => entry.id));
          board.items = board.items.map((item) =>
            removed.has(item.id) ? { ...touch(item, userId), deletedAt: new Date().toISOString() } : item,
          );
          board.links = board.links.filter((link) => !removed.has(link.sourceItemId));
          board.itemTags = board.itemTags.filter((tag) => !removed.has(tag.itemId));
          board.comments = board.comments.map((c) =>
            removed.has(c.itemId) ? { ...touch(c, userId), deletedAt: new Date().toISOString() } : c,
          );
          validateBoard(board);
          board.board = touch(board.board, userId);
          return board;
        });
      },
    },
  };
  return services;
}
