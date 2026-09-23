export interface AppVersionCheck {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
}

function isVersionCheck(value: unknown): value is AppVersionCheck {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;

  return (
    typeof result.currentVersion === 'string' &&
    typeof result.latestVersion === 'string' &&
    typeof result.updateAvailable === 'boolean' &&
    typeof result.releaseUrl === 'string'
  );
}

export async function checkForAppUpdate(
  fetcher: typeof fetch = fetch,
  baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1',
  signal?: AbortSignal,
): Promise<AppVersionCheck> {
  const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/version/check`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });

  if (!response.ok) throw new Error(`Version check failed with status ${response.status}.`);

  const result: unknown = await response.json();
  if (!isVersionCheck(result)) throw new Error('The API returned an invalid version check response.');

  return result;
}
