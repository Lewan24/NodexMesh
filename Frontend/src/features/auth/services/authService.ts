import { createId } from '@/shared/lib/createId';
import type { User } from '@/entities/user/types';
import type {
  AddUserInput,
  AdminAppearanceResetScope,
  AdminProject,
  AdminProjectMember,
  AdminUser,
  LoginInput,
} from '../types';
import { initialUsers } from '@/entities/user/mockUsers';
import { validateNewUser } from '../utils/authValidation';
import { fail } from '@/shared/api/errors';
import { newPreferences, preferenceKey, readPreferences } from '@/features/appearance/appearanceModel';

export interface AuthService {
  subscribeSessionExpired?(listener: () => void): () => void;
  register?(input: { email: string; password: string; confirmPassword: string; displayName?: string }): Promise<void>;
  me(): Promise<User | null>;
  login(input: LoginInput): Promise<User>;
  logout(): Promise<void>;
  updateProfile(input: { email: string; displayName: string; currentPassword?: string }): Promise<User>;
  changePassword(input: { currentPassword: string; newPassword: string; confirmPassword: string }): Promise<User>;
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
  resetUserAppearance(id: string, scope: AdminAppearanceResetScope): Promise<void>;
  setUserBlocked(id: string, blocked: boolean): Promise<void>;
  updateAdminUser(id: string, input: { email: string; displayName: string; isAdmin: boolean }): Promise<AdminUser>;
  restoreAdminProject(id: string): Promise<void>;
  purgeAdminProject(id: string): Promise<void>;
  adminProjects(): Promise<AdminProject[]>;
  addProjectMember(projectId: string, email: string, role: AdminProjectMember['role']): Promise<AdminProjectMember>;
  removeProjectMember(projectId: string, userId: string): Promise<void>;
  transferProjectOwner(projectId: string, email: string): Promise<void>;
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
    async updateProfile(input) {
      if (!current) return fail(401, 'unauthorized', 'Sign in to update your profile.');
      const account = accounts.find((candidate) => candidate.id === current?.id)!;
      const email = input.email.trim();
      if (
        accounts.some(
          (candidate) => candidate.id !== account.id && candidate.username.toLowerCase() === email.toLowerCase(),
        )
      )
        return fail(409, 'profile_conflict', 'Unable to update the profile with the provided details.');
      if (email.toLowerCase() !== account.username.toLowerCase() && input.currentPassword !== account.password)
        return fail(400, 'invalid_credentials', 'The current password is incorrect.');
      account.username = email;
      account.name = input.displayName.trim();
      current = publicUser(account);
      return current;
    },
    async changePassword(input) {
      if (!current) return fail(401, 'unauthorized', 'Sign in to change your password.');
      const account = accounts.find((candidate) => candidate.id === current?.id)!;
      if (account.password !== input.currentPassword)
        return fail(422, 'invalid_password', 'The current password is incorrect.');
      if (input.newPassword !== input.confirmPassword) return fail(422, 'invalid_password', 'Passwords do not match.');
      account.password = input.newPassword;
      return current;
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
    async resetUserAppearance(id, scope) {
      requireAdmin();
      if (typeof localStorage === 'undefined') return;
      const currentPreferences = readPreferences(id);
      const defaults = newPreferences();
      const next = {
        ...(scope === 'Defaults' || scope === 'All' ? defaults : currentPreferences),
        projects: scope === 'ProjectOverrides' || scope === 'All' ? {} : currentPreferences.projects,
      };
      localStorage.setItem(preferenceKey(id), JSON.stringify(next));
    },
    async setUserBlocked() {
      requireAdmin();
    },
    async updateAdminUser(id, input) {
      requireAdmin();
      const account = accounts.find((candidate) => candidate.id === id);
      if (!account) return fail(404, 'not_found', 'User not found.');
      if (id === current?.id && (account.role === 'admin') !== input.isAdmin)
        return fail(409, 'self_role_change', 'You cannot change your own administrator role.');
      account.username = input.email.trim();
      account.name = input.displayName.trim();
      account.role = input.isAdmin ? 'admin' : 'user';
      if (id === current?.id) current = publicUser(account);
      return {
        id: account.id,
        email: account.username,
        displayName: account.name,
        isAdmin: account.role === 'admin',
        isBlocked: false,
        createdAt: '',
      };
    },
    async restoreAdminProject() {
      requireAdmin();
      return fail(501, 'unsupported', 'Project administration is unavailable in demo mode.');
    },
    async purgeAdminProject() {
      requireAdmin();
      return fail(501, 'unsupported', 'Project administration is unavailable in demo mode.');
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
    async transferProjectOwner() {
      requireAdmin();
      return fail(501, 'unsupported', 'Project administration is unavailable in demo mode.');
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
