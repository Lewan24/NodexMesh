import { createId } from '@/shared/lib/createId';
import type { Project, ProjectSnapshot } from '@/entities/project/types';
import type { BoardItem } from '@/entities/board/types';
import { createMockWorkspace } from './mockWorkspace';
import { flattenItems, renewProjectIds, toProjectView } from './boardAdapter';
import type { WorkspaceServices } from './contracts';

interface TransferBoard {
  id: string;
  name: string;
  items: BoardItem[];
}
export interface ImportedProject extends Project {
  boards: TransferBoard[];
}

export function exportProjectJson(project: Project): string {
  return JSON.stringify({ format: 'nodexmesh-project', version: 1, project }, null, 2);
}

export async function exportWorkspaceProject(api: WorkspaceServices, projectId: string): Promise<string> {
  const project = (await api.projects.list()).find((entry) => entry.project.id === projectId);
  if (!project || project.project.deletedAt) throw new Error('Project is unavailable.');
  const records = (await api.boards.list(projectId)).filter((board) => !board.deletedAt);
  if (!records.length) throw new Error('Project has no active boards.');
  const boards = await Promise.all(
    records.map(async (record) => {
      const board = await api.boards.get(projectId, record.id);
      return { id: record.id, name: record.name, items: toProjectView({ project: project.project, board }).items };
    }),
  );
  return JSON.stringify(
    {
      format: 'nodexmesh-project',
      version: 2,
      project: { ...toProjectView(project), boardId: boards[0]!.id, items: boards[0]!.items, boards },
    },
    null,
    2,
  );
}

function remapBoardLinks(items: BoardItem[], ids: Map<string, string>): BoardItem[] {
  return items.map((item) => {
    if (item.type === 'column') return { ...item, items: remapBoardLinks(item.items, ids) };
    if (item.type === 'board') {
      if (item.boardId && !ids.has(item.boardId)) throw new Error('A board card references a missing board.');
      return { ...item, boardId: item.boardId ? ids.get(item.boardId)! : null };
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
      snapshots[index] = await api.boards.mutate(snapshot.project.id, target.board.id, {
        clientMutationId: createId(),
        expectedBoardRevision: target.board.revision,
        upserts: flattenItems(remapBoardLinks(board.items, ids), target.board.id),
        deletes: [],
      });
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
      throw new Error('Import failed and its partial project could not be moved to trash. Refresh before retrying.');
    }
    throw error;
  }
}

/** Validate the entire file using persistence rules before creating a real project. */
export async function importProjectJson(text: string, userId: string): Promise<ImportedProject> {
  const value = JSON.parse(text);
  if (value?.format !== 'nodexmesh-project' || ![1, 2].includes(value.version)) {
    throw new Error('Unsupported project file. Expected NodexMesh project JSON version 1 or 2.');
  }
  const source = value.project;
  if (
    !source ||
    typeof source.id !== 'string' ||
    typeof source.name !== 'string' ||
    !source.name.trim() ||
    source.name.length > 200 ||
    typeof source.color !== 'string' ||
    !Array.isArray(source.items)
  ) {
    throw new Error('Invalid project data.');
  }
  const boards: TransferBoard[] =
    value.version === 1 ? [{ id: source.boardId || createId(), name: 'Board', items: source.items }] : source.boards;
  if (
    !Array.isArray(boards) ||
    !boards.length ||
    boards.some(
      (board) =>
        !board ||
        typeof board.id !== 'string' ||
        typeof board.name !== 'string' ||
        !board.name.trim() ||
        board.name.length > 200 ||
        !Array.isArray(board.items),
    ) ||
    new Set(boards.map((board) => board.id)).size !== boards.length
  )
    throw new Error('Invalid project boards.');
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
    boards: boards.map((board) => ({ ...board, items: value.version === 1 ? cleanLegacy(board.items) : board.items })),
  });
  project.items = project.boards[0]!.items;
  let data = JSON.stringify({ formatVersion: 1, projects: [], receipts: {} });
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
