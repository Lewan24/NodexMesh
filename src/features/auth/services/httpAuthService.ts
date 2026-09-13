import type { User } from '@/entities/user/types';
import type { AuthService } from './authService';
import { ApiError, fail } from '@/shared/api/errors';
import { createHttpClient } from '@/shared/api/httpClient';

function profile(value: unknown): User {
  if (
    !value ||
    typeof value !== 'object' ||
    !('id' in value) ||
    !('username' in value) ||
    !('name' in value) ||
    !('role' in value) ||
    typeof value.id !== 'string' ||
    typeof value.username !== 'string' ||
    typeof value.name !== 'string' ||
    !['admin', 'user'].includes(String(value.role)) ||
    'password' in value
  ) {
    fail(422, 'invalid_profile', 'Invalid public user profile.');
  }
  return { id: value.id, username: value.username, name: value.name, role: value.role as User['role'] };
}

export function createHttpAuthService(fetcher: typeof fetch = fetch) {
  let csrfToken: string | null = null;
  const csrfClient = createHttpClient(
    async () => fail(500, 'csrf_bootstrap', 'Invalid CSRF bootstrap request.'),
    fetcher,
  );
  const client = createHttpClient(async () => {
    if (!csrfToken) {
      const value = await csrfClient.request('/auth/csrf');
      if (
        !value ||
        typeof value !== 'object' ||
        !('token' in value) ||
        typeof value.token !== 'string' ||
        !value.token
      ) {
        fail(422, 'invalid_csrf', 'Invalid CSRF token response.');
      }
      csrfToken = value.token;
    }
    return csrfToken;
  }, fetcher);
  const auth: AuthService = {
    async me() {
      try {
        return profile(await client.request('/auth/me'));
      } catch (error) {
        if (error instanceof ApiError && error.problem.status === 401) return null;
        throw error;
      }
    },
    async login(input) {
      const value = await client.request('/auth/login', { method: 'POST', body: input });
      csrfToken = null;
      return profile(value);
    },
    async logout() {
      await client.request('/auth/logout', { method: 'POST' });
      csrfToken = null;
    },
    async listUsers() {
      const value = await client.request('/users');
      if (!Array.isArray(value)) fail(422, 'invalid_users', 'Invalid user collection.');
      return value.map(profile);
    },
    async addUser(input) {
      await client.request('/users', { method: 'POST', body: input });
    },
    async removeUser(id) {
      await client.request(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
  };
  return { auth, client };
}
