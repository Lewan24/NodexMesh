import { ApiError, fail } from './errors';

export interface HttpClient {
  request(path: string, options?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<unknown>;
}

export function createHttpClient(
  getAccessToken: () => Promise<string>,
  fetcher: typeof fetch = fetch,
  refresh?: () => Promise<void>,
  baseUrl = '/api/v1',
): HttpClient {
  let refreshPromise: Promise<void> | undefined;
  let retryAfter = 0;
  return {
    async request(path, options = {}) {
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('..') || path.includes('\\')) {
        fail(422, 'invalid_path', 'Invalid API path.');
      }
      const send = async (token: string) => {
        if (Date.now() < retryAfter) fail(429, 'rate_limited', 'Too many requests. Please wait before retrying.');
        return fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
          method: options.method ?? 'GET',
          headers: {
            Accept: 'application/json, application/problem+json',
            'X-Requested-With': 'nodexmesh-web',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          },
          credentials: 'include',
          cache: 'no-store',
          redirect: 'error',
          signal: options.signal
            ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
            : AbortSignal.timeout(30_000),
          body: options.body === undefined ? undefined : JSON.stringify(options.body),
        });
      };
      const token = await getAccessToken();
      let response = await send(token);
      if (response.status === 401 && refresh && !['/auth/login', '/auth/register', '/auth/refresh'].includes(path)) {
        if (token === (await getAccessToken())) {
          refreshPromise ??= refresh().finally(() => {
            refreshPromise = undefined;
          });
          await refreshPromise;
        }
        response = await send(await getAccessToken());
      }
      if (!response.ok) {
        const problem = await response.json().catch(() => ({}));
        const record = problem && typeof problem === 'object' ? problem : {};
        if (response.status === 429) {
          const value = response.headers.get('Retry-After') ?? '60';
          retryAfter = /^\d+$/.test(value) ? Date.now() + Number(value) * 1000 : Date.parse(value);
          if (!Number.isFinite(retryAfter)) retryAfter = Date.now() + 60_000;
        }
        throw new ApiError({
          type: record.type ?? 'about:blank',
          status: response.status,
          code: record.title ?? record.code ?? 'http_error',
          title:
            record.detail ??
            record.error ??
            (record.errors && typeof record.errors === 'object'
              ? Object.values(record.errors)
                  .flat()
                  .filter((message) => typeof message === 'string')
                  .join(' ') || undefined
              : undefined) ??
            (response.status === 409
              ? 'The data changed in another session. Local changes are preserved.'
              : response.status === 401
                ? 'Sign in again. Too many attempts? Try again later.'
                : response.status === 429
                  ? 'Too many requests. Please wait before retrying.'
                  : 'The API request failed.'),
          errors: record.errors,
        });
      }
      return response.status === 204 ? undefined : response.json();
    },
  };
}
