import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const { createHttpAuthService } = await server.ssrLoadModule('/src/features/auth/services/httpAuthService.ts');
const { createHttpWorkspace } = await server.ssrLoadModule('/src/features/projects/services/httpWorkspace.ts');
const { createHttpClient } = await server.ssrLoadModule('/src/shared/api/httpClient.ts');
const { createHttpAppearance } = await server.ssrLoadModule('/src/features/appearance/httpAppearance.ts');
const { newPreferences, activeAppearance } = await server.ssrLoadModule('/src/features/appearance/appearanceModel.ts');
await server.close();
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const token = (id) =>
  `header.${Buffer.from(JSON.stringify({ sub: id, email: 'person@example.com' })).toString('base64url')}.signature`;

test('login maps email and parallel 401s rotate the refresh cookie only once', async () => {
  let refreshes = 0;
  const requests = [];
  const { auth, client } = createHttpAuthService(async (url, options) => {
    requests.push([url, options]);
    if (url.endsWith('/auth/login')) return json({ accessToken: token('old') });
    if (url.endsWith('/auth/refresh')) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return json({ accessToken: token('new') });
    }
    if (url.endsWith('/auth/revoke')) return new Response(null, { status: 204 });
    return options.headers.Authorization === `Bearer ${token('new')}` ? json([]) : new Response(null, { status: 401 });
  });
  assert.equal((await auth.login({ username: 'person@example.com', password: 'secret' })).id, 'old');
  assert.deepEqual(JSON.parse(requests[0][1].body), { email: 'person@example.com', password: 'secret' });
  await Promise.all([client.request('/projects'), client.request('/appearance')]);
  assert.equal(refreshes, 1);
  assert.ok(
    requests.every(
      ([, options]) => options.credentials === 'include' && options.headers['X-Requested-With'] === 'nodexmesh-web',
    ),
  );
  await auth.logout();
  assert.equal(requests.at(-1)[0], '/api/v1/auth/revoke');
});

test('expired refresh notifies the UI and bootstrap returns an anonymous session', async () => {
  const { auth } = createHttpAuthService(async () => new Response(null, { status: 401 }));
  let expired = 0;
  auth.subscribeSessionExpired(() => expired++);
  assert.equal(await auth.me(), null);
  assert.equal(expired, 1);
});

test('ProblemDetails title is the code and Retry-After blocks early retries', async () => {
  let requests = 0;
  const client = createHttpClient(
    async () => '',
    async () => {
      requests++;
      return new Response(JSON.stringify({ title: 'rate_limited', detail: 'Wait.' }), {
        status: 429,
        headers: { 'Retry-After': '60' },
      });
    },
  );
  await assert.rejects(
    client.request('/projects'),
    (error) => error.problem.code === 'rate_limited' && error.message === 'Wait.',
  );
  await assert.rejects(client.request('/projects'));
  assert.equal(requests, 1);
});

test('HTTP workspace composes project records and boards and reloads mutation snapshots', async () => {
  const audit = {
    revision: '9007199254740993',
    createdAt: '2026-09-16T00:00:00Z',
    updatedAt: '2026-09-16T00:00:00Z',
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
  };
  const project = { ...audit, id: 'project', ownerId: 'owner', name: 'Test', color: null, role: 'Owner' };
  const snapshot = {
    board: { ...audit, id: 'board', projectId: 'project', name: 'Board', sortOrder: 0 },
    items: [],
    links: [],
    comments: [],
    tags: [],
    itemTags: [],
  };
  const calls = [];
  const api = createHttpWorkspace({
    async request(path, options = {}) {
      calls.push([path, options]);
      if (path === '/projects') return options.method === 'POST' ? project : [project];
      if (path === '/projects/project/boards') return [snapshot.board];
      if (path === '/boards/board/mutations') return { boardRevision: audit.revision, items: [], conflicts: [] };
      if (path === '/boards/board') return snapshot;
      throw new Error(path);
    },
  });
  assert.equal((await api.projects.list())[0].project.color, '#7C3AED');
  await api.projects.create({ id: 'local', name: 'Test', color: '#7C3AED', clientMutationId: 'create' });
  assert.deepEqual(calls.find(([, options]) => options.method === 'POST')[1].body, { name: 'Test', color: '#7C3AED' });
  const mutation = { clientMutationId: 'mutation', expectedBoardRevision: audit.revision, upserts: [], deletes: [] };
  assert.deepEqual(await api.boards.mutate('project', 'board', mutation), snapshot);
  assert.deepEqual(calls.find(([path]) => path.endsWith('/mutations'))[1].body, mutation);
  await assert.rejects(api.projects.purge('project'), (error) => error.problem.code === 'unsupported');
});

test('nullable project appearance continues to inherit defaults after edits', async () => {
  const preferences = newPreferences();
  const calls = [];
  const api = createHttpAppearance({
    async request(path, options) {
      calls.push([path, options]);
      return { ...preferences, projects: { project: { font: null, mode: null, light: null, dark: null } } };
    },
  });
  const loaded = await api.load();
  const updated = { ...loaded, defaults: { ...loaded.defaults, font: 'sans', mode: 'dark' } };
  assert.equal(activeAppearance(updated, 'project').font, 'sans');
  assert.equal(activeAppearance(updated, 'project').mode, 'dark');
  await api.save(loaded, updated);
  assert.equal(calls.length, 2);
  assert.equal(calls[1][0], '/appearance');
  assert.equal(calls[1][1].body.font, 'sans');
  assert.ok(!('defaults' in calls[1][1].body));
});

test('new tags resolve once per normalized name and mutation retries reuse the exact IDs', async () => {
  const audit = {
    revision: '1',
    createdAt: '2026-09-16T00:00:00Z',
    updatedAt: '2026-09-16T00:00:00Z',
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
  };
  const snapshot = {
    board: { ...audit, id: 'board', projectId: 'project', name: 'Board', sortOrder: 0 },
    items: [],
    links: [],
    comments: [],
    tags: [],
    itemTags: [],
  };
  const tagCalls = [];
  const mutations = [];
  const api = createHttpWorkspace({
    async request(path, options = {}) {
      if (path === '/boards/board') return snapshot;
      if (path === '/projects/project/tags') {
        tagCalls.push(options.body);
        return { id: 'tag-id', projectId: 'project', name: 'Planning', normalizedName: 'planning' };
      }
      if (path.endsWith('/mutations')) {
        mutations.push(structuredClone(options.body));
        if (mutations.length === 1) throw new TypeError('Response lost');
        return { boardRevision: '2', items: [], conflicts: [] };
      }
      throw new Error(path);
    },
  });
  const entry = {
    item: { id: 'item' },
    expectedRevision: null,
    links: [],
    comments: [],
    tags: [' Planning ', 'ＰＬＡＮＮＩＮＧ'],
  };
  const mutation = {
    clientMutationId: 'save',
    expectedBoardRevision: '1',
    upserts: [entry, { ...entry, item: { id: 'second' } }],
    deletes: [],
  };
  await assert.rejects(api.boards.mutate('project', 'board', mutation), /Response lost/);
  await api.boards.mutate('project', 'board', mutation);
  assert.deepEqual(tagCalls, [{ name: 'Planning' }]);
  assert.deepEqual(mutations[0], mutations[1]);
  assert.ok(mutations[1].upserts.every((upsert) => JSON.stringify(upsert.tags) === '["tag-id"]'));
  await api.boards.mutate('project', 'board', {
    ...mutation,
    clientMutationId: 'remove',
    upserts: [{ ...entry, tags: [] }],
  });
  assert.deepEqual(mutations.at(-1).upserts[0].tags, []);
  assert.equal(tagCalls.length, 1);
});

test('preferred modes survive HTTP saves and reloads, and clearing restores inheritance', async () => {
  let stored = newPreferences();
  const api = createHttpAppearance({
    async request(path, options) {
      if (!options) return structuredClone(stored);
      const { mode, font, light, dark } = options.body;
      if (path === '/appearance') stored.defaults = { mode, font, light, dark };
      else stored.projects.project = { mode, font, light, dark };
    },
  });
  const initial = await api.load();
  await api.save(initial, { ...initial, defaults: { ...initial.defaults, mode: 'dark' } });
  const dark = await api.load();
  assert.equal(activeAppearance(dark, 'project').mode, 'dark');
  await api.save(dark, { ...dark, projects: { project: { mode: 'light' } } });
  const overridden = await api.load();
  assert.equal(activeAppearance(overridden, 'project').mode, 'light');
  assert.equal(activeAppearance(overridden, 'other').mode, 'dark');
  await api.save(overridden, { ...overridden, projects: {} });
  const inherited = await api.load();
  assert.equal(activeAppearance(inherited, 'project').mode, 'dark');
  await api.save(inherited, { ...inherited, defaults: { ...inherited.defaults, mode: undefined } });
  assert.equal((await api.load()).defaults.mode, null);
});
