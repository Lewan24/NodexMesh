import { createMockAuthService } from '@/features/auth/services/authService';
import { createMockWorkspace } from '@/features/projects/services/mockWorkspace';

export const authService = createMockAuthService();
export const createWorkspaceServices = (userId: string) =>
  createMockWorkspace(userId, localStorage, authService.currentUserId);
