import type { User } from '@/entities/user/types';
import type { AuthService } from './authService';
import { ApiError, fail } from '@/shared/api/errors';
import { createHttpClient } from '@/shared/api/httpClient';

export function createHttpAuthService(fetcher: typeof fetch = fetch, baseUrl = '/api/v1') {
  let accessToken = '';
  let user: User | null = null;
  let refreshing: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const anonymous = createHttpClient(async () => '', fetcher, undefined, baseUrl);
  const acceptToken = (value: unknown): User => {
    if (!value || typeof value !== 'object' || !('accessToken' in value) || typeof value.accessToken !== 'string')
      fail(422, 'invalid_token', 'Invalid authentication response.');
    try {
      if ('user' in value && value.user && typeof value.user === 'object') {
        const profile = value.user as Record<string, unknown>;
        if (
          typeof profile.id !== 'string' ||
          typeof profile.email !== 'string' ||
          typeof profile.displayName !== 'string' ||
          typeof profile.isAdmin !== 'boolean'
        )
          throw new Error();
        user = {
          id: profile.id,
          username: profile.email,
          name: profile.displayName,
          role: profile.isAdmin ? 'admin' : 'user',
        };
        accessToken = value.accessToken;
        return user;
      }
      const payload = value.accessToken.split('.')[1]!;
      const claims = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0)),
        ),
      );
      const email = claims.email ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      if (typeof claims.sub !== 'string' || typeof email !== 'string') throw new Error();
      const roleClaim = claims.role ?? claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      user = { id: claims.sub, username: email, name: email, role: roleClaim === 'admin' ? 'admin' : 'user' };
      accessToken = value.accessToken;
      return user;
    } catch {
      return fail(422, 'invalid_token', 'Invalid authentication response.');
    }
  };
  const refresh = () => {
    refreshing ??= anonymous
      .request('/auth/refresh', { method: 'POST' })
      .then(acceptToken)
      .then(() => {})
      .catch((error) => {
        if (error instanceof ApiError && error.problem.status === 401) {
          accessToken = '';
          user = null;
          listeners.forEach((listener) => listener());
        }
        throw error;
      })
      .finally(() => {
        refreshing = undefined;
      });
    return refreshing;
  };
  const client = createHttpClient(async () => accessToken, fetcher, refresh, baseUrl);
  const admin = async <T>(path: string, options?: { method?: string; body?: unknown }) =>
    (await client.request(path, options)) as T;
  const auth: AuthService = {
    subscribeSessionExpired(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    async me() {
      if (user) return user;
      try {
        await refresh();
        return user;
      } catch (error) {
        if (error instanceof ApiError && error.problem.status === 401) return null;
        throw error;
      }
    },
    async login(input) {
      return acceptToken(
        await anonymous.request('/auth/login', {
          method: 'POST',
          body: { email: input.username.trim(), password: input.password },
        }),
      );
    },
    async register(input) {
      await anonymous.request('/auth/register', { method: 'POST', body: input });
    },
    async logout() {
      await client.request('/auth/revoke', { method: 'POST' });
      accessToken = '';
      user = null;
    },
    async updateProfile(input) {
      return acceptToken(await client.request('/auth/profile', { method: 'PUT', body: input }));
    },
    async changePassword(input) {
      return acceptToken(await client.request('/auth/password', { method: 'POST', body: input }));
    },
    async listUsers() {
      return (
        await admin<Array<{ id: string; email: string; displayName: string; isAdmin: boolean }>>('/admin/users')
      ).map((item) => ({
        id: item.id,
        username: item.email,
        name: item.displayName,
        role: item.isAdmin ? 'admin' : 'user',
      }));
    },
    async addUser(input) {
      await admin('/admin/users', {
        method: 'POST',
        body: {
          email: input.username,
          password: input.password,
          displayName: input.name,
          isAdmin: input.role === 'admin',
        },
      });
    },
    async removeUser(id) {
      await admin(`/admin/users/${encodeURIComponent(id)}/blocked`, { method: 'PATCH', body: { blocked: true } });
    },
    async adminUsers() {
      return admin('/admin/users');
    },
    async createAdminUser(input) {
      return admin('/admin/users', { method: 'POST', body: input });
    },
    async resetUserPassword(id, password) {
      await admin(`/admin/users/${encodeURIComponent(id)}/password`, { method: 'POST', body: { password } });
    },
    async resetUserAppearance(id, scope) {
      await admin(`/admin/users/${encodeURIComponent(id)}/appearance/reset`, { method: 'POST', body: { scope } });
    },
    async setUserBlocked(id, blocked) {
      await admin(`/admin/users/${encodeURIComponent(id)}/blocked`, { method: 'PATCH', body: { blocked } });
    },
    async updateAdminUser(id, input) {
      return admin(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: input });
    },
    async restoreAdminProject(id) {
      await admin(`/admin/projects/${encodeURIComponent(id)}/restore`, { method: 'POST' });
    },
    async purgeAdminProject(id) {
      await admin(`/admin/projects/${encodeURIComponent(id)}/permanent`, { method: 'DELETE' });
    },
    async adminProjects() {
      return admin('/admin/projects');
    },
    async addProjectMember(projectId, email, role) {
      return admin(`/admin/projects/${encodeURIComponent(projectId)}/members`, {
        method: 'POST',
        body: { email, role },
      });
    },
    async removeProjectMember(projectId, userId) {
      await admin(`/admin/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
    },
    async transferProjectOwner(projectId, email) {
      await admin(`/admin/projects/${encodeURIComponent(projectId)}/owner`, { method: 'PUT', body: { email } });
    },
    async registrationEnabled() {
      return (await admin<{ enabled: boolean }>('/admin/settings/registration')).enabled;
    },
    async setRegistrationEnabled(enabled) {
      return (await admin<{ enabled: boolean }>('/admin/settings/registration', { method: 'PUT', body: { enabled } }))
        .enabled;
    },
    async registrationAvailable() {
      return ((await anonymous.request('/auth/registration')) as { enabled: boolean }).enabled;
    },
  };
  return { auth, client, getAccessToken: () => accessToken };
}
