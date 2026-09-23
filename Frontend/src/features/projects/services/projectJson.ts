import { translate } from '@/shared/i18n';
import { createId } from '@/shared/lib/createId';
import type { Project, ProjectBoard, ProjectSnapshot } from '@/entities/project/types';
import type { BoardSnapshot, ItemMutation } from '@/entities/board/records';
import { canonicalJson } from '@/shared/api/canonicalJson';
import type { BoardItem } from '@/entities/board/types';
import { createMockWorkspace } from './mockWorkspace';
import { flattenItems, renewProjectIds, toProjectView } from './boardAdapter';
import type { WorkspaceServices } from './contracts';

export interface ImportedProject extends Project {
  boards: ProjectBoard[];
}

export function exportProjectJson(project: Project): string {
  if (!project.boards?.length) {
    return JSON.stringify({ format: 'nodexmesh-project', version: 1, project }, null, 2);
  }
  const boards = orderedBoards(project.boards, project.boardId);
  return JSON.stringify(
    {
      format: 'nodexmesh-project',
      version: 2,
      project: { ...project, boardId: boards[0]!.id, items: boards[0]!.items, boards },
    },
    null,
    2,
  );
}

export async function exportWorkspaceProject(api: WorkspaceServices, projectId: string): Promise<string> {
  const project = (await api.projects.list()).find((entry) => entry.project.id === projectId);
  if (!project || project.project.deletedAt || project.project.userDeletedAt)
    throw new Error(translate('Project is unavailable.'));
  const records = (await api.boards.list(projectId))
    .filter((board) => !board.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!records.length) throw new Error(translate('Project has no active boards.'));
  const activeIds = new Map(records.map((board) => [board.id, board.id]));
  const boards = await Promise.all(
    records.map(async (record) => {
      const board = await api.boards.get(projectId, record.id);
      return {
        id: record.id,
        name: record.name,
        // Trashed boards are excluded. Keep their surviving cards as unlinked placeholders.
        items: remapBoardLinks(toProjectView({ project: project.project, board }).items, activeIds, true),
      };
    }),
  );
  return exportProjectJson({ ...toProjectView(project), boards });
}

function remapBoardLinks(items: BoardItem[], ids: Map<string, string>, detachMissing = false): BoardItem[] {
  return items.map((item) => {
    if (item.type === 'column') return { ...item, items: remapBoardLinks(item.items, ids, detachMissing) };
    if (item.type === 'board') {
      if (item.boardId && !ids.has(item.boardId) && !detachMissing)
        throw new Error(translate('A board card references a missing board.'));
      return { ...item, boardId: item.boardId ? (ids.get(item.boardId) ?? null) : null };
    }
    return item;
  });
}

/** Allocate every board before writing cards, including links between additional boards. */
export async function persistImportedProject(
  api: WorkspaceServices,
  project: ImportedProject,
): Promise<ProjectSnapshot> {
  const snapshot = await api.projects.create({
    id: project.id,
    name: project.name,
    color: project.color,
    clientMutationId: createId(),
  });
  try {
    const snapshots = [snapshot.board];
    await api.boards.rename(snapshot.project.id, snapshot.board.board.id, project.boards[0]!.name);
    for (const board of project.boards.slice(1))
      snapshots.push(await api.boards.create(snapshot.project.id, board.name));
    const ids = new Map(project.boards.map((board, index) => [board.id, snapshots[index]!.board.id]));
    for (const [index, board] of project.boards.entries()) {
      const target = await api.boards.get(snapshot.project.id, snapshots[index]!.board.id);
      snapshots[index] = await writeImportedBoard(
        api,
        snapshot.project.id,
        target,
        flattenItems(remapBoardLinks(board.items, ids), target.board.id),
      );
    }
    return { project: snapshot.project, board: snapshots[0]! };
  } catch (error) {
    // Keep incomplete imports out of the workspace, while retaining recoverable data in trash.
    try {
      await api.projects.update(snapshot.project.id, {
        name: snapshot.project.name,
        color: snapshot.project.color,
        deletedAt: new Date().toISOString(),
        expectedRevision: snapshot.project.revision,
        clientMutationId: createId(),
      });
    } catch {
      throw new Error(
        translate('Import failed and its partial project could not be moved to trash. Refresh before retrying.'),
      );
    }
    throw error;
  }
}

/** Validate the entire file using persistence rules before creating a real project. */
export async function importProjectJson(text: string, userId: string): Promise<ImportedProject> {
  if (new TextEncoder().encode(text).length > 20 * 1024 * 1024)
    throw new Error(translate('Project file exceeds 20 MB.'));
  const value = JSON.parse(text);
  if (value?.format !== 'nodexmesh-project' || ![1, 2].includes(value.version)) {
    throw new Error(translate('Unsupported project file. Expected NodexMesh project JSON version 1 or 2.'));
  }
  const source = value.project;
  if (
    !source ||
    typeof source.id !== 'string' ||
    !source.id.trim() ||
    typeof source.name !== 'string' ||
    !source.name.trim() ||
    source.name.length > 200 ||
    typeof source.color !== 'string' ||
    (value.version === 1 && !Array.isArray(source.items))
  ) {
    throw new Error(translate('Invalid project data.'));
  }
  const boards: ProjectBoard[] =
    value.version === 1
      ? [{ id: source.boardId || createId(), name: translate('Board'), items: source.items }]
      : source.boards;
  if (
    !Array.isArray(boards) ||
    !boards.length ||
    boards.some(
      (board) =>
        !board ||
        typeof board.id !== 'string' ||
        !board.id.trim() ||
        typeof board.name !== 'string' ||
        !board.name.trim() ||
        board.name.length > 200 ||
        !Array.isArray(board.items),
    ) ||
    new Set(boards.map((board) => board.id)).size !== boards.length
  )
    throw new Error(translate('Invalid project boards.'));
  const ordered = orderedBoards(boards, value.version === 2 ? source.boardId : undefined);
  const identities = new Set<string>([source.id]);
  const claim = (id: string) => {
    if (typeof id !== 'string' || !id.trim() || identities.has(id))
      throw new Error(translate('Project identities must be nonempty and unique.'));
    identities.add(id);
  };
  for (const board of ordered) claim(board.id);
  const claimItems = (items: BoardItem[]) => {
    if (!Array.isArray(items)) throw new Error(translate('Invalid project data.'));
    for (const item of items) {
      if (!item || typeof item !== 'object') throw new Error(translate('Invalid project data.'));
      claim(item.id);
      if (item.comments !== undefined && !Array.isArray(item.comments))
        throw new Error(translate('Invalid project data.'));
      for (const comment of item.comments ?? []) claim(comment?.id);
      if (item.type === 'column') claimItems(item.items);
    }
  };
  // Legacy IDs need not be UUIDs: validate identities before renewing them, schemas afterwards.
  for (const board of ordered) claimItems(board.items);
  if (value.version === 2 && source.items !== undefined) {
    if (
      !Array.isArray(source.items) ||
      canonicalJson(normalizeArchiveItems(source.items)) !== canonicalJson(normalizeArchiveItems(ordered[0]!.items))
    )
      throw new Error(translate('The main board items do not match the project board collection.'));
  }
  // Legacy exports cannot recover missing boards; detach their cards so new boards can be created.
  const cleanLegacy = (items: BoardItem[]): BoardItem[] =>
    items.map((item) =>
      item.type === 'column'
        ? { ...item, items: cleanLegacy(item.items) }
        : item.type === 'board'
          ? { ...item, boardId: null }
          : item,
    );
  const project = renewProjectIds<ImportedProject>({
    id: source.id,
    name: source.name.trim(),
    color: source.color,
    items: [],
    ownerId: userId,
    boardId: ordered[0]!.id,
    boards: ordered.map((board) => ({ ...board, items: value.version === 1 ? cleanLegacy(board.items) : board.items })),
  });
  project.items = project.boards[0]!.items;
  let data = JSON.stringify({ formatVersion: 2, projects: [], boards: {}, receipts: {} });
  const storage: Storage = {
    length: 1,
    clear: () => {
      data = '';
    },
    key: () => null,
    removeItem: () => {
      data = '';
    },
    getItem: () => data,
    setItem: (_key, next) => {
      data = next;
    },
  };
  await persistImportedProject(
    createMockWorkspace(userId, storage, () => userId),
    project,
  );
  return project;
}

/** boardId identifies the main board even if a file lists its boards out of order. */
function orderedBoards(boards: ProjectBoard[], mainBoardId?: string): ProjectBoard[] {
  if (mainBoardId === undefined) return boards;
  const main = boards.find((board) => board.id === mainBoardId);
  if (!main) throw new Error(translate('The project references a missing main board.'));
  return [main, ...boards.filter((board) => board !== main)];
}

/** The HTTP mutation endpoint accepts at most 2,000 item changes per request. */
async function writeImportedBoard(
  api: WorkspaceServices,
  projectId: string,
  initial: BoardSnapshot,
  entries: ItemMutation[],
): Promise<BoardSnapshot> {
  let board = initial;
  const write = async (upserts: ItemMutation[]) => {
    board = await api.boards.mutate(projectId, board.board.id, {
      clientMutationId: createId(),
      expectedBoardRevision: board.board.revision,
      upserts,
      deletes: [],
    });
  };
  if (entries.length <= 2000) {
    if (entries.length) await write(entries);
    return board;
  }
  // Create every item before attaching references that may cross batch boundaries.
  for (let index = 0; index < entries.length; index += 2000) {
    await write(
      entries
        .slice(index, index + 2000)
        .map((entry) => ({ ...entry, item: { ...entry.item, parentItemId: null, frameId: null }, links: [] })),
    );
  }
  const linked = entries.filter((entry) => entry.item.parentItemId || entry.item.frameId || entry.links.length);
  for (let index = 0; index < linked.length; index += 2000) {
    const revisions = new Map(board.items.map((item) => [item.id, item.revision]));
    await write(
      linked.slice(index, index + 2000).map((entry) => ({ ...entry, expectedRevision: revisions.get(entry.item.id)! })),
    );
  }
  return board;
}

/** Older exports omitted document format metadata from their legacy main-board projection. */
function normalizeArchiveItems(items: BoardItem[]): BoardItem[] {
  return items.map((item) => {
    if (!item || typeof item !== 'object') throw new Error(translate('Invalid project data.'));
    if (item.type === 'document')
      return { ...item, contentFormat: item.contentFormat ?? 'tiptap-html', contentVersion: item.contentVersion ?? 1 };
    if (item.type === 'column') return { ...item, items: normalizeArchiveItems(item.items) };
    return item;
  });
}
