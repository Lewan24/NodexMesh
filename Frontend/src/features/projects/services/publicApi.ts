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
      if (
        !value.project ||
        typeof record(value.project).id !== 'string' ||
        typeof record(value.project).name !== 'string' ||
        !Array.isArray(value.boards) ||
        value.boards.some((board) => typeof record(board).id !== 'string' || typeof record(board).name !== 'string')
      )
        fail(422, 'invalid_response', 'Invalid share response.');
      return value as unknown as PublicProjectSnapshot;
    },
    async getBoard(token: string, boardId: string): Promise<PublicBoardSnapshot> {
      const value = record(
        await client.request(`/public/shared/${encodeURIComponent(token)}/boards/${encodeURIComponent(boardId)}`),
      );
      if (
        !value.project ||
        !value.board ||
        record(value.board).id !== boardId ||
        !Array.isArray(value.items) ||
        !Array.isArray(value.links) ||
        !Array.isArray(value.tags) ||
        !Array.isArray(value.itemTags)
      )
        fail(422, 'invalid_response', 'Invalid share response.');
      return value as unknown as PublicBoardSnapshot;
    },
  };
}

export type PublicApi = ReturnType<typeof createPublicApi>;
