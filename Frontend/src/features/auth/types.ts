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

export interface EmailSettings {
  enabled: boolean;
  configured: boolean;
  source: 'configuration' | 'database';
  editable: boolean;
  host: string;
  port: number;
  useSsl: boolean;
  username: string;
  hasPassword: boolean;
  fromAddress: string;
  fromName: string;
  publicBaseUrl: string;
  userNotificationsEnabled: boolean;
  adminAlertsEnabled: boolean;
  pendingMessages: number;
  failedMessages: number;
}

export interface EmailTemplate {
  key: string;
  name: string;
  description: string;
  subject: string;
  textBody: string;
  htmlBody: string;
  variables: string[];
  updatedAt: string;
}

export interface EmailTemplateContent {
  subject: string;
  textBody: string;
  htmlBody: string;
}

export interface EmailOutboxMessage { id: string; kind: string; status: 'pending'|'failed'|'sent'; recipient: string; userId?: string|null; userDisplayName?: string|null; subject: string; attempts: number; createdAt: string; availableAt: string; sentAt?: string|null; deadLetteredAt?: string|null; lastError?: string|null; }
export interface EmailOutboxResponse { items: EmailOutboxMessage[]; pendingMessages: number; failedMessages: number; }
