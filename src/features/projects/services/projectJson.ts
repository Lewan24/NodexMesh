import type { Project } from '@/entities/project/types';
import { createMockWorkspace } from './mockWorkspace';
import { flattenItems, renewProjectIds } from './boardAdapter';

export function exportProjectJson(project: Project): string {
  return JSON.stringify({ format: 'nodexmesh-project', version: 1, project }, null, 2);
}

/** Validate through the same persistence rules before touching the real workspace. */
export async function importProjectJson(text: string, userId: string): Promise<Project> {
  const value = JSON.parse(text);
  if (value?.format !== 'nodexmesh-project' || value.version !== 1) {
    throw new Error('Unsupported project file. Expected NodexMesh project JSON version 1.');
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
  )
    throw new Error('Invalid project data.');

  const project = renewProjectIds({
    id: source.id,
    name: source.name.trim(),
    color: source.color,
    items: source.items,
    ownerId: userId,
  });
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
    setItem: (_key: string, next: string) => {
      data = next;
    },
  };
  const api = createMockWorkspace(userId, storage, () => userId);
  const snapshot = await api.projects.create({
    id: project.id,
    name: project.name,
    color: project.color,
    clientMutationId: crypto.randomUUID(),
  });
  await api.boards.mutate(project.id, snapshot.board.board.id, {
    clientMutationId: crypto.randomUUID(),
    expectedBoardRevision: snapshot.board.board.revision,
    upserts: flattenItems(project.items, snapshot.board.board.id),
    deletes: [],
  });
  return project;
}
