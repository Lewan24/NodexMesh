import type { HttpClient } from '@/shared/api/httpClient';
import { fail } from '@/shared/api/errors';
import type { WorkspaceServices } from './contracts';
import type { ProjectRecord, ProjectSnapshot } from '@/entities/project/types';
import { parseBoardRecord, parseBoardSnapshot, parseProjectRecord, parseTrashedItem } from './responseValidation';

const segment = encodeURIComponent;

export function createHttpWorkspace(client: HttpClient): WorkspaceServices {
  const projects = new Map<string, ProjectRecord>();
  const created = new Map<string, ProjectRecord>();
  const mutationBodies = new WeakMap<object, unknown>();
  let nextMutationAt = 0;
  const snapshot = async (project: ProjectRecord, signal?: AbortSignal): Promise<ProjectSnapshot> => {
    if (project.deletedAt) {
      // Trashed projects expose metadata only. The project ID marks a placeholder
      // board which the controller replaces with the real snapshot after restore.
      projects.set(project.id, project);
      return {
        project,
        board: {
          board: { ...project, projectId: project.id, sortOrder: 0 },
          items: [],
          links: [],
          comments: [],
          tags: [],
          itemTags: [],
        },
      };
    }
    const boards = await client.request(`/projects/${segment(project.id)}/boards`, { signal });
    if (!Array.isArray(boards) || !boards[0]?.id) fail(422, 'invalid_response', 'Project has no default board.');
    const board = parseBoardSnapshot(await client.request(`/boards/${segment(boards[0].id)}`, { signal }));
    if (board.board.projectId !== project.id) fail(422, 'invalid_scope', 'Invalid board project.');
    projects.set(project.id, project);
    return { project, board };
  };
  return {
    async sync(previous, signal) {
      const id = previous.project.id;
      const [projectValue, value] = await Promise.all([
        client.request(`/projects/${segment(id)}`, { signal }),
        client.request(`/projects/${segment(id)}/boards`, { signal }),
      ]);
      const project = parseProjectRecord(projectValue);
      if (!Array.isArray(value)) fail(422, 'invalid_response', 'Invalid board collection.');
      const current = value.find((entry) => entry.id === previous.board.board.id);
      if (!current || typeof current.revision !== 'string') fail(404, 'not_found', 'Board is no longer available.');
      const changed = current.revision !== previous.board.board.revision;
      const board = changed
        ? parseBoardSnapshot(await client.request(`/boards/${segment(current.id)}`, { signal }))
        : previous.board;
      if (board.board.projectId !== id) fail(422, 'invalid_scope', 'Invalid board project.');
      projects.set(id, project);
      return changed || project.revision !== previous.project.revision || project.role !== previous.project.role
        ? { project, board }
        : null;
    },
    projects: {
      async list(signal) {
        const value = await client.request('/projects', { signal });
        if (!Array.isArray(value)) fail(422, 'invalid_response', 'Invalid project collection.');
        return Promise.all(value.map((entry) => snapshot(parseProjectRecord(entry), signal)));
      },
      async create(input) {
        let project = created.get(input.clientMutationId);
        if (!project) {
          project = parseProjectRecord(
            await client.request('/projects', { method: 'POST', body: { name: input.name, color: input.color } }),
          );
          created.set(input.clientMutationId, project);
        }
        return snapshot(project);
      },
      async update(id, input) {
        const path = `/projects/${segment(id)}`;
        let previous = projects.get(id);
        if (input.deletedAt && previous && (previous.name !== input.name || previous.color !== input.color)) {
          previous = parseProjectRecord(
            await client.request(path, {
              method: 'PATCH',
              body: { name: input.name, color: input.color, expectedRevision: previous.revision },
            }),
          );
          projects.set(id, previous);
        }
        if (input.deletedAt) {
          await client.request(path, { method: 'DELETE' });
          const project = { ...previous!, deletedAt: input.deletedAt };
          projects.set(id, project);
          return project;
        }
        if (previous?.deletedAt) await client.request(`${path}/restore`, { method: 'POST' });
        const current = previous?.deletedAt ? parseProjectRecord(await client.request(path)) : previous;
        const project = parseProjectRecord(
          await client.request(path, {
            method: 'PATCH',
            body: {
              name: input.name,
              color: input.color,
              expectedRevision: current?.revision ?? input.expectedRevision,
            },
          }),
        );
        projects.set(id, project);
        return project;
      },
      async purge(id) {
        await client.request(`/projects/${segment(id)}/permanent`, { method: 'DELETE' });
        projects.delete(id);
      },
    },
    boards: {
      async saveComments(_projectId, boardId, itemId, changes) {
        return parseBoardSnapshot(
          await client.request(`/boards/${segment(boardId)}/items/${segment(itemId)}/comments`, {
            method: 'PUT',
            body: changes,
          }),
        );
      },
      async list(projectId, signal) {
        const value = await client.request(`/projects/${segment(projectId)}/boards`, { signal });
        if (!Array.isArray(value)) fail(422, 'invalid_response', 'Invalid board collection.');
        return value.map(parseBoardRecord);
      },
      async create(projectId, name) {
        const value = await client.request(`/projects/${segment(projectId)}/boards`, {
          method: 'POST',
          body: { name },
        });
        const board = parseBoardRecord(value);
        if (board.projectId !== projectId) fail(422, 'invalid_scope', 'Invalid board project.');
        if (!value || typeof value !== 'object' || typeof (value as { id?: unknown }).id !== 'string')
          fail(422, 'invalid_response', 'Invalid board response.');
        return parseBoardSnapshot({ board, items: [], links: [], comments: [], tags: [], itemTags: [] });
      },
      async rename(projectId, boardId, name) {
        const value = await client.request(`/boards/${segment(boardId)}`, { method: 'PATCH', body: { name } });
        const board = parseBoardRecord(value);
        if (board.projectId !== projectId) fail(422, 'invalid_scope', 'Invalid board project.');
        return board;
      },
      async delete(projectId, boardId) {
        await client.request(`/boards/${segment(boardId)}`, { method: 'DELETE' });
        void projectId;
      },
      async get(_projectId, boardId, signal) {
        return parseBoardSnapshot(await client.request(`/boards/${segment(boardId)}`, { signal }));
      },
      async mutate(projectId, boardId, mutation) {
        const role = projects.get(projectId)?.role;
        if (role === 'Viewer' || role === 'Commenter') fail(403, 'forbidden', 'This project is read-only.');
        if (mutation.upserts.length + mutation.deletes.length > 2000)
          fail(422, 'batch_limit', 'Save fewer than 2,001 item changes at a time.');
        let body = mutationBodies.get(mutation);
        if (!body) {
          // Untagged edits do not need a full snapshot before the write.
          const existingTags = mutation.upserts.some((entry) => entry.tags.length > 0)
            ? parseBoardSnapshot(await client.request(`/boards/${segment(boardId)}`)).tags
            : [];
          const tags = new Map(existingTags.map((tag) => [tag.normalizedName, tag]));
          const upserts = [];
          for (const entry of mutation.upserts) {
            if (entry.tags.length > 100) fail(422, 'invalid_tag', 'An item may have at most 100 tags.');
            const tagIds = new Set<string>();
            for (const name of entry.tags) {
              const displayName = name.trim();
              const normalizedName = displayName.normalize('NFKC').toLowerCase();
              if (!normalizedName.trim() || displayName.length > 64 || normalizedName.length > 64)
                fail(422, 'invalid_tag', 'Tag names must contain 1 to 64 characters.');
              let tag = tags.get(normalizedName);
              if (!tag) {
                const value = await client.request(`/projects/${segment(projectId)}/tags`, {
                  method: 'POST',
                  body: { name: displayName },
                });
                if (
                  !value ||
                  typeof value !== 'object' ||
                  !('id' in value) ||
                  typeof value.id !== 'string' ||
                  !('projectId' in value) ||
                  value.projectId !== projectId ||
                  !('name' in value) ||
                  typeof value.name !== 'string' ||
                  !('normalizedName' in value) ||
                  typeof value.normalizedName !== 'string'
                )
                  fail(422, 'invalid_response', 'Invalid tag response.');
                tag = { id: value.id, projectId, name: value.name, normalizedName: value.normalizedName };
                tags.set(normalizedName, tag);
              }
              tagIds.add(tag.id);
            }
            upserts.push({ ...entry, tags: [...tagIds] });
          }
          body = { ...mutation, upserts };
          mutationBodies.set(mutation, body);
        }
        const delay = nextMutationAt - Date.now();
        if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
        nextMutationAt = Date.now() + 1100;
        const result = await client.request(`/boards/${segment(boardId)}/mutations`, { method: 'POST', body });
        if (
          !result ||
          typeof result !== 'object' ||
          !('boardRevision' in result) ||
          typeof result.boardRevision !== 'string' ||
          !('conflicts' in result) ||
          !Array.isArray(result.conflicts)
        )
          fail(422, 'invalid_response', 'Invalid mutation response.');
        if (result.conflicts.length)
          fail(409, 'revision_mismatch', 'The board changed in another session. Local changes are preserved.');
        return parseBoardSnapshot(await client.request(`/boards/${segment(boardId)}`));
      },
      async listTrash(projectId) {
        const value = await client.request(`/projects/${segment(projectId)}/item-trash`);
        if (!Array.isArray(value)) fail(422, 'invalid_response', 'Invalid item trash response.');
        return value.map(parseTrashedItem);
      },
      async restoreTrashItem(projectId, itemId, targetBoardId, position) {
        return parseBoardSnapshot(
          await client.request(`/projects/${segment(projectId)}/item-trash/${segment(itemId)}/restore`, {
            method: 'POST',
            body: { targetBoardId, x: position?.x ?? null, y: position?.y ?? null },
          }),
        );
      },
      async purgeTrashItem(projectId, itemId) {
        await client.request(`/projects/${segment(projectId)}/item-trash/${segment(itemId)}`, { method: 'DELETE' });
      },
      async emptyTrash(projectId) {
        await client.request(`/projects/${segment(projectId)}/item-trash`, { method: 'DELETE' });
      },
    },
  };
}
