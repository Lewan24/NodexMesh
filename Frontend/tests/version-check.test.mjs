import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-version-check-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const { checkForAppUpdate } = await server.ssrLoadModule('/src/features/version/services/versionApi.ts');
await server.close();

test('version check calls the anonymous API endpoint and validates the response', async () => {
  const calls = [];
  const fetcher = async (...args) => {
    calls.push(args);
    return new Response(
      JSON.stringify({
        currentVersion: '1.0.0',
        latestVersion: '1.2.0',
        updateAvailable: true,
        releaseUrl: 'https://github.com/Lewan24/NodexMesh/releases/tag/v1.2.0',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await checkForAppUpdate(fetcher, '/api/v1');

  assert.equal(calls[0][0], '/api/v1/version/check');
  assert.equal(result.updateAvailable, true);
  assert.equal(result.latestVersion, '1.2.0');
});

test('version check rejects malformed API responses', async () => {
  const fetcher = async () => new Response(JSON.stringify({ updateAvailable: true }), { status: 200 });

  await assert.rejects(checkForAppUpdate(fetcher, '/api/v1'), /invalid version check response/i);
});
