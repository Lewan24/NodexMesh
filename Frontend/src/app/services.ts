import { createMockAuthService } from '@/features/auth/services/authService';
import { createMockWorkspace } from '@/features/projects/services/mockWorkspace';
import { createHttpAuthService } from '@/features/auth/services/httpAuthService';
import { createHttpWorkspace } from '@/features/projects/services/httpWorkspace';
import { createSharingApi } from '@/features/projects/services/sharingApi';
import { createPublicApi } from '@/features/projects/services/publicApi';

/** Select matching authentication and workspace adapters. HTTP is the default. */
const source = import.meta.env.VITE_DATA_SOURCE ?? 'mock';
if (!['mock', 'http'].includes(source)) throw new Error('VITE_DATA_SOURCE must be mock or http.');
const mockAuth = createMockAuthService();
const http = source === 'http' ? createHttpAuthService(fetch, import.meta.env.VITE_API_BASE_URL || '/api/v1') : null;
export const isMockDataSource = source === 'mock';
export const authService = http?.auth ?? mockAuth;
export const createWorkspaceServices = (userId: string) =>
  http ? createHttpWorkspace(http.client) : createMockWorkspace(userId, localStorage, mockAuth.currentUserId);

export const httpClient = http?.client;
export const collaborationToken = http?.getAccessToken;

export const sharingApi = httpClient ? createSharingApi(httpClient) : null;
export const publicApi = createPublicApi(fetch, import.meta.env.VITE_API_BASE_URL || '/api/v1');
