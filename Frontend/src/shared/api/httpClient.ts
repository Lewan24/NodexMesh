import { ApiError, fail } from './errors';

export interface HttpClient {
  request(path: string, options?: { method?: string; body?: unknown; signal?: AbortSignal }): Promise<unknown>;
}

/** Same-origin cookies; CSRF token is fetched by the Auth HTTP adapter and held in memory. */
export function createHttpClient(getCsrfToken: () => Promise<string>, fetcher: typeof fetch = fetch): HttpClient {
  return {
    async request(path, options = {}) {
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('..') || path.includes('\\')) {
        fail(422, 'invalid_path', 'Invalid API path.');
      }
      const method = options.method ?? 'GET';
      const headers: Record<string, string> = { Accept: 'application/json, application/problem+json' };
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';
      if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-TOKEN'] = await getCsrfToken();
      const response = await fetcher(`/api/v1${path}`, {
        method,
        headers,
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: options.signal
          ? AbortSignal.any([options.signal, AbortSignal.timeout(30_000)])
          : AbortSignal.timeout(30_000),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      if (!response.ok) {
        const problem: unknown = await response.json().catch(() => null);
        const record = problem && typeof problem === 'object' ? (problem as Record<string, unknown>) : {};
        throw new ApiError({
          type: typeof record.type === 'string' ? record.type : 'about:blank',
          status: response.status,
          code: typeof record.code === 'string' ? record.code : 'http_error',
          title:
            response.status === 409
              ? 'The data changed in another session. Local changes are preserved.'
              : response.status === 401
                ? 'Your session expired. Sign in again.'
                : 'The API request failed.',
          traceId: typeof record.traceId === 'string' ? record.traceId : undefined,
        });
      }
      if (response.status === 204) return undefined;
      return response.json();
    },
  };
}
