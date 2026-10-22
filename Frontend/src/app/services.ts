import { createHttpAuthService } from '@/features/auth/services/httpAuthService';
import { createHttpWorkspace } from '@/features/projects/services/httpWorkspace';
import { createSharingApi } from '@/features/projects/services/sharingApi';
import { createPublicApi } from '@/features/projects/services/publicApi';

/** Select matching authentication and workspace adapters. HTTP is the default. */
const source = import.meta.env.VITE_DATA_SOURCE ?? 'http';
if (!['mock', 'http'].includes(source)) throw new Error('VITE_DATA_SOURCE must be mock or http.');
const mock = source === 'mock' ? await import('./mockServices') : null;
const http = source === 'http' ? createHttpAuthService(fetch, import.meta.env.VITE_API_BASE_URL || '/api/v1') : null;
export const isMockDataSource = source === 'mock';
export const authService = http?.auth ?? mock!.authService;
export const createWorkspaceServices = (userId: string) =>
  http ? createHttpWorkspace(http.client) : mock!.createWorkspaceServices(userId);

export const httpClient = http?.client;
export const collaborationToken = http?.getCollaborationToken;

export const sharingApi = httpClient ? createSharingApi(httpClient) : null;
export const publicApi = createPublicApi(fetch, import.meta.env.VITE_API_BASE_URL || '/api/v1');
