import { createId } from '@/shared/lib/createId';
import type { User } from '@/entities/user/types';
import type { AddUserInput, AdminProject, AdminProjectMember, AdminUser, LoginInput } from '../types';
import { initialUsers } from '@/entities/user/mockUsers';
import { validateNewUser } from '../utils/authValidation';
import { fail } from '@/shared/api/errors';

export interface AuthService {
  subscribeSessionExpired?(listener: () => void): () => void;
  register?(input: { email: string; password: string; confirmPassword: string; displayName?: string }): Promise<void>;
  me(): Promise<User | null>;
  login(input: LoginInput): Promise<User>;
  logout(): Promise<void>;
  listUsers(): Promise<User[]>;
  addUser(input: AddUserInput): Promise<void>;
  removeUser(id: string): Promise<void>;
  adminUsers(): Promise<AdminUser[]>;
  createAdminUser(input: {
    email: string;
    password: string;
    displayName: string;
    isAdmin: boolean;
  }): Promise<AdminUser>;
  resetUserPassword(id: string, password: string): Promise<void>;
  setUserBlocked(id: string, blocked: boolean): Promise<void>;
  adminProjects(): Promise<AdminProject[]>;
  addProjectMember(projectId: string, email: string, role: AdminProjectMember['role']): Promise<AdminProjectMember>;
  removeProjectMember(projectId: string, userId: string): Promise<void>;
  registrationEnabled(): Promise<boolean>;
  setRegistrationEnabled(enabled: boolean): Promise<boolean>;
  registrationAvailable(): Promise<boolean>;
}

/** Credentials exist only in this mock's memory; never in public User or browser storage. */
export function createMockAuthService(): AuthService & { currentUserId(): string | null } {
  const accounts = initialUsers.map((user) => ({ ...user }));
  let current: User | null = null;
  const publicUser = ({ id, username, name, role }: User): User => ({ id, username, name, role });
  const requireAdmin = () => {
    if (current?.role !== 'admin') fail(403, 'forbidden', 'Administrator access is required.');
  };
  return {
    currentUserId: () => current?.id ?? null,
    async me() {
      return current;
    },
    async login(input) {
      const found = accounts.find(
        (a) => a.username.toLowerCase() === input.username.trim().toLowerCase() && a.password === input.password,
      );
      if (!found) fail(401, 'invalid_credentials', 'Incorrect username or password.');
      current = publicUser(found);
      return current;
    },
    async logout() {
      current = null;
    },
    async listUsers() {
      requireAdmin();
      return accounts.map(publicUser);
    },
    async addUser(input) {
      requireAdmin();
      const result = validateNewUser(input, accounts);
      if (!result.ok) fail(422, 'invalid_user', result.error);
      if (!['admin', 'user'].includes(input.role)) fail(422, 'invalid_role', 'Invalid role.');
      accounts.push({ ...input, username: input.username.trim(), name: input.name.trim(), id: createId() });
    },
    async removeUser(id) {
      requireAdmin();
      if (id === current?.id) fail(409, 'self_removal', 'You cannot remove the active administrator.');
      const index = accounts.findIndex((a) => a.id === id);
      if (index >= 0) accounts.splice(index, 1);
    },
    async adminUsers() {
      requireAdmin();
      return accounts.map((user) => ({
        id: user.id,
        email: user.username,
        displayName: user.name,
        isAdmin: user.role === 'admin',
        isBlocked: false,
        createdAt: '',
      }));
    },
    async createAdminUser(input) {
      await this.addUser({
        username: input.email,
        password: input.password,
        name: input.displayName,
        role: input.isAdmin ? 'admin' : 'user',
      });
      return (await this.adminUsers()).find((user) => user.email === input.email) as AdminUser;
    },
    async resetUserPassword() {
      requireAdmin();
    },
    async setUserBlocked() {
      requireAdmin();
    },
    async adminProjects() {
      requireAdmin();
      return [];
    },
    async addProjectMember() {
      requireAdmin();
      return fail(501, 'unsupported', 'Project administration is unavailable in demo mode.');
    },
    async removeProjectMember() {
      requireAdmin();
    },
    async registrationEnabled() {
      return true;
    },
    async setRegistrationEnabled(enabled) {
      requireAdmin();
      return enabled;
    },
    async registrationAvailable() {
      return true;
    },
  };
}
