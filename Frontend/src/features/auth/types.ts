import type { Role } from '@/entities/user/types';

export interface LoginInput {
  username: string;
  password: string;
}

export interface AddUserInput {
  username: string;
  password: string;
  name: string;
  role: Role;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

export interface AdminUser {
  deletionRequestedAt?: string | null;
  permanentDeletionAt?: string | null;
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  isBlocked: boolean;
  createdAt: string;
}

export type AdminAppearanceResetScope = 'Defaults' | 'ProjectOverrides' | 'All';

export interface AdminProjectMember {
  userId: string;
  email: string;
  displayName: string;
  role: 'Editor' | 'Commenter' | 'Viewer';
}

export interface AdminProject {
  userDeletedAt?: string | null;
  status?: 'active' | 'trashed' | 'userdeleted';
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  members: AdminProjectMember[];
}
