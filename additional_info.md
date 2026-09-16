import type { BoardItem } from '@/entities/board/types';
import type { ItemAppearance, ItemDataMap, ItemLink, Revision } from '@/entities/board/records';

/** Matches the API's ProjectRole exactly (see Backend/docs/API.md §5). Owner is never
 * assignable through the invite/role endpoints — it always comes from ProjectRecord.ownerId. */
export type MemberRole = 'Editor' | 'Commenter' | 'Viewer';

export interface ProjectMember {
  userId: string;
  /** Masked to e.g. "a***e@example.com" for everyone except the project owner and the
   * member's own row — see API.md §6.2. Never assume this is the full address. */
  email: string;
  displayName: string | null;
  role: MemberRole;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  projectId: string;
  label: string | null;
  createdAt: string;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  accessCount: number;
  isActive: boolean;
}

/** Returned only once, at creation — the raw token is unrecoverable afterwards. */
export interface CreatedShareLink {
  link: ShareLink;
  token: string;
}

// ---------------- anonymous, read-only ----------------

export interface PublicProject {
  id: string;
  name: string;
  color: string | null;
  updatedAt: string;
}

export interface PublicBoard {
  id: string;
  name: string;
  sortOrder: number;
}

/** Deliberately narrower than ItemRecord: no createdBy/updatedBy/deletedAt (user GUIDs a
 * public viewer has no use for and shouldn't see). */
export type PublicItem = {
  [K in keyof ItemDataMap]: {
    id: string;
    boardId: string;
    parentItemId: string | null;
    frameId: string | null;
    sortOrder: number;
    x: number;
    y: number;
    width: number | null;
    height: number | null;
    zIndex: number;
    locked: boolean;
    type: K;
    schemaVersion: 1;
    appearance: ItemAppearance;
    data: ItemDataMap[K];
    revision: Revision;
    updatedAt: string;
  };
}[keyof ItemDataMap];

export interface PublicAppearance {
  font: string;
  light: Record<string, unknown> | null;
  dark: Record<string, unknown> | null;
}

export interface PublicBoardSnapshot {
  project: PublicProject;
  board: PublicBoard;
  items: PublicItem[];
  links: ItemLink[];
  tags: { id: string; projectId: string; name: string; normalizedName: string }[];
  itemTags: { itemId: string; tagId: string }[];
  appearance: PublicAppearance | null;
}

export interface PublicProjectSnapshot {
  project: PublicProject;
  boards: PublicBoard[];
}

/** Read-only canvas projection for the public viewer — the same shape as the
 * authenticated `Project` type, minus fields a public viewer has no use for. */
export interface PublicProjectView {
  id: string;
  name: string;
  color: string;
  items: BoardItem[];
}




import { createHttpClient } from '@/shared/api/httpClient';
import { fail } from '@/shared/api/errors';
import type { PublicBoardSnapshot, PublicProjectSnapshot } from '@/entities/project/shareTypes';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(422, 'invalid_response', 'Invalid API response.');
  return value as Record<string, unknown>;
}

/**
 * The public share endpoints need no bearer token and no refresh — anonymous viewers have
 * no account. `getAccessToken` always resolves to '' so the underlying client never sends
 * an Authorization header; there's nothing to refresh, so `refresh` is left undefined.
 */
export function createPublicApi(fetcher: typeof fetch = fetch, baseUrl = '/api/v1') {
  const client = createHttpClient(async () => '', fetcher, undefined, baseUrl);

  return {
    async getProject(token: string): Promise<PublicProjectSnapshot> {
      const value = record(await client.request(`/public/shared/${encodeURIComponent(token)}`));
      if (!value.project || !Array.isArray(value.boards)) fail(422, 'invalid_response', 'Invalid share response.');
      return value as unknown as PublicProjectSnapshot;
    },
    async getBoard(token: string, boardId: string): Promise<PublicBoardSnapshot> {
      const value = record(
        await client.request(`/public/shared/${encodeURIComponent(token)}/boards/${encodeURIComponent(boardId)}`),
      );
      if (!value.project || !value.board || !Array.isArray(value.items))
        fail(422, 'invalid_response', 'Invalid share response.');
      return value as unknown as PublicBoardSnapshot;
    },
  };
}

export type PublicApi = ReturnType<typeof createPublicApi>;



import type { BoardSnapshot, ItemRecord } from '@/entities/board/records';
import type { ProjectRecord } from '@/entities/project/types';
import type { PublicBoardSnapshot, PublicProjectView } from '@/entities/project/shareTypes';
import { validateBoard } from '@/entities/board/boardValidation';
import { toProjectView } from '@/features/projects/services/boardAdapter';

/**
 * Reuses `toProjectView` (and its `validateItem`/`validateBoard` calls) rather than
 * re-implementing the flat-list → nested-column tree conversion for a second time. The
 * public payload is missing fields the authenticated types require (ownerId, comments,
 * createdBy/updatedBy/deletedAt on items) because the API deliberately never sends them to
 * anonymous viewers — see PublicItemDto in Backend/docs/API.md §6.3c. Those fields are
 * filled with inert placeholders below; `toProjectView` never reads them (it only checks
 * `!item.deletedAt`, which a placeholder `null` satisfies correctly), so this doesn't
 * change what gets rendered, it only satisfies the shared type.
 */
export function toPublicProjectView(payload: PublicBoardSnapshot): PublicProjectView {
  const { project, board, items, links, tags, itemTags } = payload;

  const syntheticProject: ProjectRecord = {
    id: project.id,
    ownerId: '',
    name: project.name,
    color: project.color ?? '#7C3AED',
    revision: '0',
    createdAt: project.updatedAt,
    updatedAt: project.updatedAt,
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
  };

  const syntheticItems: ItemRecord[] = items.map((item) => ({
    ...item,
    createdAt: item.updatedAt,
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
  }));

  const syntheticBoard: BoardSnapshot = {
    board: {
      id: board.id,
      projectId: project.id,
      name: board.name,
      sortOrder: board.sortOrder,
      revision: '0',
      createdAt: project.updatedAt,
      updatedAt: project.updatedAt,
      createdBy: null,
      updatedBy: null,
      deletedAt: null,
    },
    items: syntheticItems,
    links,
    comments: [], // The public API never sends comments — see PublicBoardSnapshotDto.
    tags,
    itemTags,
  };

  validateBoard(syntheticBoard);
  const view = toProjectView({ project: syntheticProject, board: syntheticBoard });

  return { id: view.id, name: view.name, color: view.color, items: view.items };
}





import { createMockAuthService } from '@/features/auth/services/authService';
import { createMockWorkspace } from '@/features/projects/services/mockWorkspace';
import { createHttpAuthService } from '@/features/auth/services/httpAuthService';
import { createHttpWorkspace } from '@/features/projects/services/httpWorkspace';
import { createSharingApi } from '@/features/projects/services/sharingApi';
import { createPublicApi } from '@/features/projects/services/publicApi';

/** Select matching authentication and workspace adapters. HTTP is the default. */
const source = import.meta.env.VITE_DATA_SOURCE ?? 'http';
if (!['mock', 'http'].includes(source)) throw new Error('VITE_DATA_SOURCE must be mock or http.');
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const mockAuth = createMockAuthService();
const http = source === 'http' ? createHttpAuthService(fetch, apiBaseUrl) : null;
export const isMockDataSource = source === 'mock';
export const authService = http?.auth ?? mockAuth;
export const createWorkspaceServices = (userId: string) =>
  http ? createHttpWorkspace(http.client) : createMockWorkspace(userId, localStorage, mockAuth.currentUserId);

export const httpClient = http?.client;

/** Project sharing (collaborators, anonymous links) has no mock/offline equivalent —
 * these are null in mock mode, same pattern as `httpClient`. */
export const sharingApi = httpClient ? createSharingApi(httpClient) : null;

/** Anonymous read-only viewing needs no session, so this is independent of `http`/
 * `isMockDataSource` — it only actually resolves anything once a token is requested. */
export const publicApi = createPublicApi(fetch, apiBaseUrl);






import type { BoardItem } from '@/entities/board/types';
import type { AuditFields, BoardSnapshot } from '@/entities/board/records';

export interface ProjectRecord extends AuditFields {
  role?: 'Owner' | 'Editor' | 'Commenter' | 'Viewer';
  id: string;
  ownerId: string;
  name: string;
  color: string;
}

export interface ProjectSnapshot {
  project: ProjectRecord;
  board: BoardSnapshot;
}

export type ProjectMemberRole = 'editor' | 'commenter' | 'viewer';

/** Canvas projection. Persistence uses ProjectRecord + BoardSnapshot, never this tree. */
export interface Project {
  deletedAt?: string;
  id: string;
  name: string;
  color: string;
  items: BoardItem[];
  ownerId: string;
  /** The calling user's role, carried over from ProjectRecord.role. Undefined in mock mode
   * (no server-side roles) — treat as 'Owner' there, matching single-user local usage. */
  role?: ProjectRecord['role'];
}







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
    role: project.role,
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








