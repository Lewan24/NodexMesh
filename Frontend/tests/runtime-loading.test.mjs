import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { build, createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));

test('the production HTTP entry graph excludes mock authentication and demo workspace implementations', async () => {
  const result = await build({
    root,
    logLevel: 'silent',
    define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('http') },
    build: { write: false },
  });
  const chunks = new Map(
    result.output.filter((entry) => entry.type === 'chunk').map((entry) => [entry.fileName, entry]),
  );
  const entry = [...chunks.values()].find((chunk) => chunk.isEntry);
  assert.equal(
    [...chunks.values()].some((chunk) => Object.keys(chunk.modules).some((id) => id.includes('/e2e/'))),
    false,
    'The performance fixture and its control API must never enter application bundles',
  );
  assert.ok(entry);
  const seen = new Set();
  const visit = (fileName) => {
    if (seen.has(fileName)) return;
    seen.add(fileName);
    const chunk = chunks.get(fileName);
    assert.ok(chunk, `missing static chunk ${fileName}`);
    for (const dependency of chunk.imports) visit(dependency);
  };
  visit(entry.fileName);
  const startupModules = [...seen].flatMap((name) => Object.keys(chunks.get(name).modules));
  for (const module of ['demoProject.json', 'mockWorkspace.ts', 'mockServices.ts', '/auth/services/authService.ts']) {
    assert.equal(
      startupModules.some((id) => id.endsWith(module)),
      false,
      `${module} must load only on demand`,
    );
  }
  assert.ok(
    [...chunks.values()].some((chunk) => Object.keys(chunk.modules).some((id) => id.endsWith('mockWorkspace.ts'))),
  );
});

test('asynchronous mock bootstrap preserves authentication, demo loading and principal isolation', async () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: new Window().localStorage });
  const server = await createServer({
    root,
    configFile: false,
    cacheDir: 'node_modules/.vite-runtime-tests',
    define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('mock') },
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: { alias: { '@': `${root}src` } },
    server: { middlewareMode: true, watch: null, hmr: false },
  });
  try {
    const services = await server.ssrLoadModule('/src/app/services.ts');
    assert.equal(services.isMockDataSource, true);
    assert.equal(services.httpClient, undefined);
    const user = await services.authService.login({ username: 'demo', password: 'demo123' });
    const workspace = services.createWorkspaceServices(user.id);
    const projects = await workspace.projects.list();
    assert.equal(projects.length, 1);
    assert.ok(projects[0].board.items.length > 0);
    assert.equal(projects[0].project.ownerId, user.id);
    await assert.rejects(services.createWorkspaceServices('another-principal').projects.list());
  } finally {
    await server.close();
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else delete globalThis.localStorage;
  }
});
