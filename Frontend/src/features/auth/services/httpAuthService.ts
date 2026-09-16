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
      const payload = value.accessToken.split('.')[1]!;
      const claims = JSON.parse(
        new TextDecoder().decode(
          Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0)),
        ),
      );
      const email = claims.email ?? claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
      if (typeof claims.sub !== 'string' || typeof email !== 'string') throw new Error();
      user = { id: claims.sub, username: email, name: email, role: 'user' };
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
  const unsupported = async () => fail(501, 'unsupported', 'The API does not support user administration.');
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
    listUsers: unsupported,
    addUser: unsupported,
    removeUser: unsupported,
  };
  return { auth, client };
}
