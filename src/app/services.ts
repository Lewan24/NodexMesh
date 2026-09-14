import { createMockAuthService } from '@/features/auth/services/authService';
import { createMockWorkspace } from '@/features/projects/services/mockWorkspace';
import { createHttpAuthService } from '@/features/auth/services/httpAuthService';
import { createHttpWorkspace } from '@/features/projects/services/httpWorkspace';

/** Composition root: replace these adapters together when the API is available. */
const source = import.meta.env.VITE_DATA_SOURCE ?? 'mock';
if (!['mock', 'http'].includes(source)) throw new Error('VITE_DATA_SOURCE must be mock or http.');
const mockAuth = createMockAuthService();
const http = source === 'http' ? createHttpAuthService() : null;
export const isMockDataSource = source === 'mock';
export const authService = http?.auth ?? mockAuth;
export const createWorkspaceServices = (userId: string) =>
  http ? createHttpWorkspace(http.client) : createMockWorkspace(userId, localStorage, mockAuth.currentUserId);
