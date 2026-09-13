import type { HttpClient } from '@/shared/api/httpClient';
import type { WorkspaceServices } from './contracts';
import { parseBoardSnapshot, parseProjectRecord, parseProjectSnapshots } from './responseValidation';

const segment = encodeURIComponent;

export function createHttpWorkspace(client: HttpClient): WorkspaceServices {
  return {
    projects: {
      async list(signal) {
        return parseProjectSnapshots(await client.request('/projects', { signal }));
      },
      async create(input) {
        return parseProjectSnapshots([await client.request('/projects', { method: 'POST', body: input })])[0]!;
      },
      async update(id, input) {
        return parseProjectRecord(await client.request(`/projects/${segment(id)}`, { method: 'PATCH', body: input }));
      },
      async purge(id, expectedRevision, clientMutationId) {
        await client.request(`/projects/${segment(id)}/purge`, {
          method: 'POST',
          body: { expectedRevision, clientMutationId },
        });
      },
    },
    boards: {
      async get(projectId, boardId, signal) {
        return parseBoardSnapshot(
          await client.request(`/projects/${segment(projectId)}/boards/${segment(boardId)}`, { signal }),
        );
      },
      async mutate(projectId, boardId, mutation) {
        return parseBoardSnapshot(
          await client.request(`/projects/${segment(projectId)}/boards/${segment(boardId)}/mutations`, {
            method: 'POST',
            body: mutation,
          }),
        );
      },
    },
  };
}
