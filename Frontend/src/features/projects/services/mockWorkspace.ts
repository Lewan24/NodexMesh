import { translate } from '@/shared/i18n';
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

function linkedBoardId(item: { type: string; data: unknown }): string | undefined {
  if (item.type !== 'board' || !item.data || typeof item.data !== 'object') return undefined;
  const value = (item.data as { boardId?: unknown }).boardId;
  return typeof value === 'string' ? value : undefined;
}

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
    fail(422, 'read_only_field', translate('Server-owned item fields cannot be submitted.'));
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
    if (previous && previous.itemId !== item.id)
      fail(422, 'invalid_comment', translate('Comment belongs to another item.'));
    if (comment.text.length > 10_000 || !['open', 'todo', 'in-progress', 'resolved'].includes(comment.status)) {
      fail(422, 'invalid_comment', translate('Invalid comment.'));
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
  if (entry.tags.length > 100) fail(422, 'invalid_tags', translate('Too many tags.'));
  for (const name of entry.tags) {
    const normalizedName = name.trim().normalize('NFKC').toLowerCase();
    if (!normalizedName || name.trim().length > 64 || normalizedName.length > 64)
      fail(422, 'invalid_tag', translate('Invalid tag.'));
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
    if (currentUserId() !== userId) fail(401, 'session_expired', translate('Please sign in again.'));
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
        translate('Stored mock data is invalid or uses a newer schema. It was not overwritten.'),
      );
    }
  }
  function find(db: Database, id: string): ProjectSnapshot {
    return (
      db.projects.find((p) => p.project.id === id && p.project.ownerId === userId && !p.project.userDeletedAt) ??
      fail(404, 'not_found', translate('Project not found.'))
    );
  }
  function findBoard(db: Database, projectId: string, boardId: string): BoardSnapshot {
    find(db, projectId);
    return (
      db.boards[projectId]?.find((board) => board.board.id === boardId && !board.board.deletedAt) ??
      fail(404, 'not_found', translate('Board not found.'))
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
          translate(
            'Browser storage is full. Your changes are still open. Download a local draft before closing this page.',
          ),
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
          fail(409, 'mutation_reused', translate('Mutation ID was reused with different content.'));
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
              const sourceBoards = demo.boards?.length
                ? demo.boards
                : [{ id: createId(), name: translate('Board'), items: demo.items }];
              const boards = sourceBoards.map((sourceBoard, sortOrder): BoardSnapshot => {
                const board: BoardSnapshot = {
                  board: { id: sourceBoard.id, projectId: demo.id, name: sourceBoard.name, sortOrder, ...metadata },
                  items: [],
                  links: [],
                  comments: [],
                  tags: [],
                  itemTags: [],
                };
                for (const entry of flattenItems(sourceBoard.items, board.board.id)) applyItem(board, entry, userId);
                validateBoard(board);
                return board;
              });
              db.projects.push({
                project: { id: demo.id, ownerId: userId, name: demo.name, color: demo.color, ...metadata },
                board: boards[0]!,
              });
              db.boards[demo.id] = boards;
            }
            persist(db);
          }
          return structuredClone(db.projects.filter((entry) => !entry.project.userDeletedAt));
        });
      },
      create(input) {
        return transaction(input.clientMutationId, { action: 'create', input }, (db) => {
          if (db.projects.some((p) => p.project.id === input.id))
            fail(409, 'duplicate_id', translate('Project already exists.'));
          if (!input.name.trim() || input.name.length > 200)
            fail(422, 'invalid_name', translate('Project name must contain 1–200 characters.'));
          const metadata = audit(userId);
          const snapshot: ProjectSnapshot = {
            project: { id: input.id, ownerId: userId, name: input.name.trim(), color: input.color, ...metadata },
            board: {
              board: { id: createId(), projectId: input.id, name: translate('Board'), sortOrder: 0, ...metadata },
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
            fail(409, 'revision_conflict', translate('Project changed in another session.'));
          if (!input.name.trim() || input.name.length > 200)
            fail(422, 'invalid_name', translate('Project name must contain 1–200 characters.'));
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
            fail(409, 'revision_conflict', translate('Only an unchanged trashed project can be removed.'));
          snapshot.project = { ...touch(snapshot.project, userId), userDeletedAt: new Date().toISOString() };
        });
      },
    },
    boards: {
      saveComments(projectId, boardId, itemId, changes) {
        return transaction(createId(), { action: 'comments', projectId, boardId, itemId, changes }, (db) => {
          const project = find(db, projectId).project;
          if (project.deletedAt || project.role === 'Viewer')
            fail(403, 'forbidden', translate('Commenting is unavailable.'));
          const board = findBoard(db, projectId, boardId);
          const item = board.items.find((entry) => entry.id === itemId && !entry.deletedAt);
          if (!item) fail(404, 'not_found', translate('Item not found.'));
          if (board.board.revision !== changes.expectedBoardRevision)
            fail(409, 'revision_mismatch', translate('Comments changed. Refresh and try again.'));
          for (const id of [...changes.upserts.map((comment) => comment.id), ...changes.deletes]) {
            const previous = board.comments.find((comment) => comment.id === id);
            if (previous && (previous.itemId !== itemId || previous.deletedAt))
              fail(404, 'not_found', translate('Comment not found.'));
            if (previous && project.role === 'Commenter' && previous.createdBy !== userId)
              fail(403, 'forbidden', translate('You can only change your own comments.'));
          }
          for (const value of changes.upserts) {
            if (
              !value.text.trim() ||
              value.text.length > 10000 ||
              !['open', 'todo', 'in-progress', 'resolved'].includes(value.status)
            )
              fail(422, 'invalid_comment', translate('Invalid comment.'));
            const previous = board.comments.find((comment) => comment.id === value.id);
            board.comments = board.comments.filter((comment) => comment.id !== value.id);
            board.comments.push({
              ...(previous ? touch(previous, userId) : audit(userId)),
              ...value,
              status: value.status as import('@/entities/board/types').CommentStatus,
              itemId,
            });
          }
          const deletedAt = new Date().toISOString();
          board.comments = board.comments.map((comment) =>
            changes.deletes.includes(comment.id) ? { ...touch(comment, userId), deletedAt } : comment,
          );
          board.board = touch(board.board, userId);
          board.items = board.items.map((entry) => (entry.id === itemId ? touch(entry, userId) : entry));
          return board;
        });
      },
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
            fail(422, 'invalid_name', translate('Board name must contain 1–200 characters.'));
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
            fail(422, 'invalid_name', translate('Board name must contain 1–200 characters.'));
          board.board = { ...touch(board.board, userId), name: normalizedName };
          return board.board;
        });
      },
      async delete(projectId, boardId) {
        return transaction(createId(), { action: 'delete-board', projectId, boardId }, (db) => {
          const boards = db.boards[projectId] ?? [];
          const board = findBoard(db, projectId, boardId);
          if (board.board.id === boards[0]?.board.id)
            fail(409, 'default_board', translate('The main board cannot be deleted.'));
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
          if (snapshot.project.deletedAt)
            fail(409, 'project_trashed', translate('Restore the project before editing it.'));
          if (board.board.revision !== mutation.expectedBoardRevision)
            fail(409, 'revision_conflict', translate('Board changed in another session. Local changes are preserved.'));
          const touched = new Set<string>();
          for (const entry of [
            ...mutation.upserts.map((u) => ({ id: u.item.id, expectedRevision: u.expectedRevision })),
            ...mutation.deletes,
          ]) {
            if (touched.has(entry.id)) fail(422, 'duplicate_operation', translate('Duplicate operation.'));
            touched.add(entry.id);
            const existing = board.items.find((i) => i.id === entry.id && !i.deletedAt);
            if ((existing?.revision ?? null) !== entry.expectedRevision)
              fail(409, 'revision_conflict', translate('Item changed in another session.'));
          }
          for (const entry of mutation.upserts) applyItem(board, entry, userId);
          const removed = new Set(mutation.deletes.map((entry) => entry.id));
          board.items = board.items.map((item) =>
            removed.has(item.id) ? { ...touch(item, userId), deletedAt: new Date().toISOString() } : item,
          );
          for (const item of board.items.filter((item) => removed.has(item.id))) {
            const linkedId = linkedBoardId(item);
            const linked = db.boards[projectId]?.find((entry) => entry.board.id === linkedId);
            if (linked && linked !== board && !linked.board.deletedAt)
              linked.board = { ...touch(linked.board, userId), deletedAt: new Date().toISOString() };
          }
          // Relations stay with a soft-deleted item and become visible again when
          // it is restored. They are removed only by permanent trash deletion.
          validateBoard(board);
          board.board = touch(board.board, userId);
          return board;
        });
      },
      async listTrash(projectId) {
        const db = read();
        find(db, projectId);
        return structuredClone(
          (db.boards[projectId] ?? []).flatMap((board) => {
            const deleted = board.items.filter((item) => item.deletedAt);
            const deletedIds = new Set(deleted.map((item) => item.id));
            return deleted
              .filter((item) => !item.parentItemId || !deletedIds.has(item.parentItemId))
              .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
              .map((item) => ({ item, boardName: board.board.name }));
          }),
        );
      },
      restoreTrashItem(projectId, itemId, targetBoardId, position) {
        return transaction(
          createId(),
          { action: 'restore-trash-item', projectId, itemId, targetBoardId, position },
          (db) => {
            find(db, projectId);
            const boards = db.boards[projectId] ?? [];
            const source = boards.find((board) => board.items.some((item) => item.id === itemId && item.deletedAt));
            if (!source) fail(404, 'not_found', translate('Trashed item not found.'));
            const target = findBoard(db, projectId, targetBoardId);
            const restoredIds = new Set([itemId]);
            let changed = true;
            while (changed) {
              changed = false;
              for (const item of source.items)
                if (
                  item.deletedAt &&
                  item.parentItemId &&
                  restoredIds.has(item.parentItemId) &&
                  !restoredIds.has(item.id)
                ) {
                  restoredIds.add(item.id);
                  changed = true;
                }
            }
            const nextZ = Math.max(0, ...target.items.filter((item) => !item.deletedAt).map((item) => item.zIndex)) + 1;
            const restored = source.items
              .filter((item) => restoredIds.has(item.id))
              .map((item) => ({
                ...touch(item, userId),
                boardId: targetBoardId,
                deletedAt: null,
                ...(item.id === itemId
                  ? {
                      parentItemId: null,
                      frameId: null,
                      x: position?.x ?? item.x,
                      y: position?.y ?? item.y,
                      zIndex: item.type === 'frame' ? 0 : nextZ,
                    }
                  : {}),
              }));
            const restoredLinkedId = linkedBoardId(restored.find((item) => item.id === itemId)!);
            const restoredLinked = boards.find((entry) => entry.board.id === restoredLinkedId);
            if (restoredLinked?.board.deletedAt)
              restoredLinked.board = { ...touch(restoredLinked.board, userId), deletedAt: null };
            source.items = source.items.filter((item) => !restoredIds.has(item.id));
            target.items = target.items.filter((item) => !restoredIds.has(item.id)).concat(restored);
            if (source !== target) {
              const validTargets = new Set(target.items.filter((item) => !item.deletedAt).map((item) => item.id));
              const movedLinks = source.links.filter(
                (link) => restoredIds.has(link.sourceItemId) && validTargets.has(link.targetItemId),
              );
              source.links = source.links.filter((link) => !restoredIds.has(link.sourceItemId));
              target.links = target.links.concat(movedLinks);
              const movedComments = source.comments.filter((comment) => restoredIds.has(comment.itemId));
              source.comments = source.comments.filter((comment) => !restoredIds.has(comment.itemId));
              target.comments = target.comments.concat(movedComments);
              const movedTags = source.itemTags.filter((tag) => restoredIds.has(tag.itemId));
              source.itemTags = source.itemTags.filter((tag) => !restoredIds.has(tag.itemId));
              target.itemTags = target.itemTags.concat(movedTags);
              target.tags = [...new Map([...target.tags, ...source.tags].map((tag) => [tag.id, tag])).values()];
              source.board = touch(source.board, userId);
            }
            target.board = touch(target.board, userId);
            return target;
          },
        );
      },
      purgeTrashItem(projectId, itemId) {
        return transaction(createId(), { action: 'purge-trash-item', projectId, itemId }, (db) => {
          find(db, projectId);
          const board = (db.boards[projectId] ?? []).find((entry) =>
            entry.items.some((item) => item.id === itemId && item.deletedAt),
          );
          if (!board) fail(404, 'not_found', translate('Trashed item not found.'));
          const linkedId = linkedBoardId(board.items.find((item) => item.id === itemId)!);
          const removed = new Set([itemId]);
          let changed = true;
          while (changed) {
            changed = false;
            for (const item of board.items)
              if (item.deletedAt && item.parentItemId && removed.has(item.parentItemId) && !removed.has(item.id)) {
                removed.add(item.id);
                changed = true;
              }
          }
          board.items = board.items.filter((item) => !removed.has(item.id));
          board.links = board.links.filter(
            (link) => !removed.has(link.sourceItemId) && !removed.has(link.targetItemId),
          );
          board.comments = board.comments.filter((comment) => !removed.has(comment.itemId));
          board.itemTags = board.itemTags.filter((tag) => !removed.has(tag.itemId));
          board.board = touch(board.board, userId);
          if (linkedId)
            db.boards[projectId] = (db.boards[projectId] ?? []).filter((entry) => entry.board.id !== linkedId);
        });
      },
      emptyTrash(projectId) {
        return transaction(createId(), { action: 'empty-item-trash', projectId }, (db) => {
          find(db, projectId);
          const deletedLinkedBoards = new Set(
            (db.boards[projectId] ?? []).flatMap((board) =>
              board.items
                .filter((item) => item.deletedAt)
                .map(linkedBoardId)
                .filter((id): id is string => Boolean(id)),
            ),
          );
          for (const board of db.boards[projectId] ?? []) {
            const removed = new Set(board.items.filter((item) => item.deletedAt).map((item) => item.id));
            if (!removed.size) continue;
            board.items = board.items.filter((item) => !removed.has(item.id));
            board.links = board.links.filter(
              (link) => !removed.has(link.sourceItemId) && !removed.has(link.targetItemId),
            );
            board.comments = board.comments.filter((comment) => !removed.has(comment.itemId));
            board.itemTags = board.itemTags.filter((tag) => !removed.has(tag.itemId));
            board.board = touch(board.board, userId);
          }
          db.boards[projectId] = (db.boards[projectId] ?? []).filter(
            (board) => !deletedLinkedBoards.has(board.board.id),
          );
        });
      },
    },
  };
  return services;
}
