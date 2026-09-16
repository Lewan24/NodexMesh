import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-api-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const { createMockWorkspace, mockWorkspaceKey } = await server.ssrLoadModule(
  '/src/features/projects/services/mockWorkspace.ts',
);
const { flattenItems, toProjectView, diffBoard } = await server.ssrLoadModule(
  '/src/features/projects/services/boardAdapter.ts',
);
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { createDrawing } = await server.ssrLoadModule('/src/features/blocks/drawing/drawingUtils.ts');
const { WorkspaceController } = await server.ssrLoadModule('/src/features/projects/services/workspaceController.ts');
const { createMockAuthService } = await server.ssrLoadModule('/src/features/auth/services/authService.ts');
const { itemSchemas } = await server.ssrLoadModule('/src/entities/board/itemSchema.ts');
const { DEMO_USER_ID } = await server.ssrLoadModule('/src/entities/user/mockUsers.ts');
const { createHttpClient } = await server.ssrLoadModule('/src/shared/api/httpClient.ts');
const { exportProjectJson, importProjectJson } = await server.ssrLoadModule(
  '/src/features/projects/services/projectJson.ts',
);
const { demoProjects } = await server.ssrLoadModule('/src/entities/project/demoProjects.ts');
const { createDefaultProjectFor } = await server.ssrLoadModule('/src/entities/project/projectFactory.ts');
const { createId } = await server.ssrLoadModule('/src/shared/lib/createId.ts');
await server.close();

test('HTTP mobile context can load demo, create a project, save blocks and reload', async (t) => {
  const originalCrypto = globalThis.crypto;
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: { getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto) },
  });
  t.after(() => Object.defineProperty(globalThis, 'crypto', originalDescriptor));
  const store = storage();
  const api = createMockWorkspace(DEMO_USER_ID, store, () => DEMO_USER_ID);
  const controller = new WorkspaceController(api);
  await controller.load();
  assert.equal(controller.getSnapshot().status, 'saved');
  assert.ok(controller.getSnapshot().projects.length > 0);
  const project = createDefaultProjectFor(DEMO_USER_ID);
  project.items = Object.keys(itemSchemas)
    .map((type) => createCanvasItem(type, 10, 20))
    .filter(Boolean);
  controller.update((projects) => [...projects, project]);
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'saved');
  const reloaded = new WorkspaceController(createMockWorkspace(DEMO_USER_ID, store, () => DEMO_USER_ID));
  await reloaded.load();
  assert.equal(reloaded.getSnapshot().status, 'saved');
  const saved = (await api.projects.list()).find((entry) => entry.project.id === project.id);
  assert.equal(diffBoard(saved.board, project.items), null);
  assert.deepEqual(
    reloaded.getSnapshot().projects.find((entry) => entry.id === project.id),
    toProjectView(saved),
  );
  assert.match(project.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  const ids = Array.from({ length: 1000 }, () => createId());
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('project JSON imports the complete demo with fresh identities and a new owner', async () => {
  const original = demoProjects[0];
  const json = exportProjectJson(original);
  const imported = await importProjectJson(json, 'qa');
  assert.equal(imported.ownerId, 'qa');
  assert.notEqual(imported.id, original.id);
  assert.equal(imported.name, original.name);
  assert.equal(imported.items.length, original.items.length);
  assert.equal(exportProjectJson(original), json);
  const copy = await importProjectJson(exportProjectJson(imported), 'qa');
  assert.notEqual(copy.items[0].id, imported.items[0].id);
});

test('project JSON rejects invalid files before adding a project', async () => {
  await assert.rejects(importProjectJson('{', 'qa'));
  await assert.rejects(importProjectJson(JSON.stringify({ format: 'nodexmesh-project', version: 99 }), 'qa'));
  const invalid = JSON.parse(exportProjectJson(demoProjects[0]));
  invalid.project.items = [{ id: 'broken', type: 'unknown', x: 0, y: 0, zIndex: 0 }];
  await assert.rejects(importProjectJson(JSON.stringify(invalid), 'qa'));
});

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
async function setup(userId = 'qa') {
  const store = storage();
  const api = createMockWorkspace(userId, store, () => userId);
  const [snapshot] = await api.projects.list();
  return { api, store, snapshot };
}
const mutate = (api, snapshot, items) =>
  api.boards.mutate(snapshot.project.id, snapshot.board.board.id, diffBoard(snapshot.board, items));

test('demo is seeded with fresh identities and survives normalized storage', async () => {
  const { api } = await setup(DEMO_USER_ID);
  const first = await api.projects.list();
  assert.deepEqual(await api.projects.list(), first);
  assert.ok(first.length > 0);
  for (const snapshot of first) {
    assert.match(snapshot.project.id, /^[0-9a-f-]{36}$/);
    assert.equal(diffBoard(snapshot.board, toProjectView(snapshot).items), null);
  }
});

test('all registered item types round-trip and columns become independent records', async () => {
  const { api, snapshot } = await setup();
  const items = Object.keys(itemSchemas)
    .map((type) => createCanvasItem(type, -120, 30))
    .filter(Boolean);
  items.push(
    createDrawing(
      [
        { x: 0, y: 0 },
        { x: 20, y: 20 },
      ],
      2,
    ),
  );
  assert.equal(items.length, Object.keys(itemSchemas).length);
  const column = items.find((item) => item.type === 'column');
  column.items = [createCanvasItem('note', 14, 26)];
  column.items[0].comments = [{ id: crypto.randomUUID(), text: 'Review', createdAt: new Date().toISOString() }];
  column.items[0].tags = ['Backend'];
  const board = await mutate(api, snapshot, items);
  assert.equal(board.items.length, items.length + 1);
  assert.equal(board.items.find((item) => item.id === column.id).data.items, undefined);
  const child = board.items.find((item) => item.parentItemId === column.id);
  assert.equal(child.x, 14);
  assert.equal(board.comments[0].itemId, child.id);
  const view = toProjectView({ ...snapshot, board });
  assert.equal(view.items.find((item) => item.id === column.id).items[0].id, child.id);
  assert.equal(diffBoard(board, view.items), null);
});

test('all icon sources survive persistence and edits', async () => {
  const { api, snapshot } = await setup();
  const items = [
    ['preset', 'rocket'],
    ['emoji', '🚀'],
    ['svg', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>'],
    ['url', 'https://example.com/icon.svg'],
  ].map(([iconMode, source]) => ({ ...createCanvasItem('icon', 0, 0), iconMode, source, label: 'Launch' }));
  const board = await mutate(api, snapshot, items);
  const view = toProjectView({ ...snapshot, board });
  assert.equal(diffBoard(board, view.items), null);
  for (const item of items) {
    const restored = view.items.find((entry) => entry.id === item.id);
    assert.equal(restored.iconMode, item.iconMode);
    assert.equal(restored.source, item.source);
  }
});

test('repeated icon edits fit browser storage without losing the latest retry receipt', async () => {
  const base = storage();
  let limit = Infinity;
  const store = {
    getItem: base.getItem,
    setItem(key, value) {
      if (value.length > limit) throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      base.setItem(key, value);
    },
  };
  const api = createMockWorkspace('icon-quota', store, () => 'icon-quota');
  const [snapshot] = await api.projects.list();
  const items = toProjectView(snapshot).items;
  const icon = createCanvasItem('icon', 0, 0);
  items.push(icon);
  let board = await mutate(api, snapshot, items);
  limit = base.getItem(mockWorkspaceKey('icon-quota')).length * 2;
  let lastMutation;
  for (let index = 0; index < 12; index++) {
    icon.source = index % 2 ? 'heart' : 'rocket';
    lastMutation = diffBoard(board, items);
    board = await api.boards.mutate(snapshot.project.id, board.board.id, lastMutation);
  }
  assert.equal(board.items.find((item) => item.id === icon.id).data.source, 'heart');
  assert.deepEqual(await api.boards.mutate(snapshot.project.id, board.board.id, lastMutation), board);
  assert.equal(diffBoard(board, items), null);
});

test('storage exhaustion preserves confirmed data and local icon edits for retry', async () => {
  const base = storage();
  let full = false;
  const store = {
    getItem: base.getItem,
    setItem(key, value) {
      if (full) throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      base.setItem(key, value);
    },
  };
  const api = createMockWorkspace('icon-retry', store, () => 'icon-retry');
  const controller = new WorkspaceController(api);
  await controller.load();
  const key = mockWorkspaceKey('icon-retry');
  const before = base.getItem(key);
  const icon = { ...createCanvasItem('icon', 0, 0), iconMode: 'emoji', source: '🚀' };
  full = true;
  controller.update((projects) =>
    projects.map((project, index) => (index ? project : { ...project, items: [...project.items, icon] })),
  );
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'error');
  assert.match(controller.getSnapshot().error, /Browser storage is full/);
  assert.equal(base.getItem(key), before);
  assert.equal(controller.getSnapshot().projects[0].items.find((item) => item.id === icon.id).source, '🚀');
  full = false;
  await controller.retry();
  assert.equal(controller.getSnapshot().status, 'saved');
  const [saved] = await api.projects.list();
  assert.equal(saved.board.items.find((item) => item.id === icon.id).data.source, '🚀');
});

test('single item edits generate a single upsert and stale writes are atomic conflicts', async () => {
  const { api, snapshot } = await setup();
  const notes = [createCanvasItem('note', 0, 0), createCanvasItem('note', 30, 40)];
  const board = await mutate(api, snapshot, notes);
  assert.equal(diffBoard(board, notes), null);
  const view = toProjectView({ ...snapshot, board });
  view.items[0].content = 'Changed';
  const request = diffBoard(board, view.items);
  assert.equal(request.upserts.length, 1);
  const next = await api.boards.mutate(snapshot.project.id, board.board.id, request);
  assert.equal(next.items.find((item) => item.id === view.items[0].id).revision, '2');
  await assert.rejects(
    api.boards.mutate(snapshot.project.id, board.board.id, { ...request, clientMutationId: crypto.randomUUID() }),
    (error) => error.problem.status === 409,
  );
  assert.deepEqual(await api.boards.get(snapshot.project.id, board.board.id), next);
  assert.deepEqual(await api.boards.mutate(snapshot.project.id, board.board.id, request), next);
  await assert.rejects(
    api.boards.mutate(snapshot.project.id, board.board.id, {
      ...request,
      deletes: [{ id: notes[1].id, expectedRevision: '1' }],
    }),
    (error) => error.problem.code === 'mutation_reused',
  );
});

test('invalid schemas, URLs, geometry and foreign parents never partially commit', async () => {
  const { api, snapshot } = await setup();
  const entry = flattenItems([createCanvasItem('note', 0, 0)], snapshot.board.board.id)[0];
  for (const patch of [{ schemaVersion: 2 }, { x: Infinity }, { parentItemId: 'foreign' }, { data: { content: 42 } }]) {
    const request = {
      clientMutationId: crypto.randomUUID(),
      expectedBoardRevision: '1',
      upserts: [{ ...entry, item: { ...entry.item, ...patch } }],
      deletes: [],
    };
    await assert.rejects(api.boards.mutate(snapshot.project.id, snapshot.board.board.id, request));
    assert.equal((await api.boards.get(snapshot.project.id, snapshot.board.board.id)).items.length, 0);
  }
  assert.throws(() =>
    flattenItems([{ ...createCanvasItem('link', 0, 0), url: 'javascript:alert(1)' }], snapshot.board.board.id),
  );
});

test('storage corruption is not silently replaced and a different principal cannot read', async () => {
  const { api, store } = await setup();
  const other = createMockWorkspace('qa', store, () => 'intruder');
  await assert.rejects(other.projects.list(), (error) => error.problem.status === 401);
  store.setItem(mockWorkspaceKey('qa'), '{broken');
  await assert.rejects(api.projects.list());
  assert.equal(store.getItem(mockWorkspaceKey('qa')), '{broken');
});

test('queue retains edits made during a request and retries the identical mutation after response loss', async () => {
  const { api } = await setup();
  const requests = [];
  let loseResponse = true;
  let editDuringSave;
  const wrapped = {
    ...api,
    boards: {
      ...api.boards,
      async mutate(projectId, boardId, request) {
        if (requests.length > 4) throw new Error('Unexpected repeated write: ' + JSON.stringify(request));
        requests.push(structuredClone(request));
        const result = await api.boards.mutate(projectId, boardId, request);
        editDuringSave?.();
        editDuringSave = undefined;
        if (loseResponse) {
          loseResponse = false;
          throw new Error('Response lost');
        }
        return result;
      },
    },
  };
  const controller = new WorkspaceController(wrapped);
  await controller.load();
  controller.update((projects) => projects.map((p) => ({ ...p, items: [createCanvasItem('note', 0, 0)] })));
  editDuringSave = () =>
    controller.update((projects) =>
      projects.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i, content: 'Later edit' })) })),
    );
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'error');
  await controller.retry();
  assert.equal(controller.getSnapshot().status, 'saved');
  assert.deepEqual(requests[0], requests[1]);
  assert.equal(requests.length, 3);
  const [saved] = await api.projects.list();
  assert.equal(saved.board.items[0].data.content, 'Later edit');
});

test('undo writes an inverse item mutation instead of replacing a board snapshot', async () => {
  const { api } = await setup();
  const controller = new WorkspaceController(api);
  await controller.load();
  const empty = controller.getSnapshot().projects;
  controller.update(empty.map((p) => ({ ...p, items: [createCanvasItem('note', 0, 0)] })));
  await controller.flush();
  controller.update(empty);
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'saved');
  const [saved] = await api.projects.list();
  assert.ok(saved.board.items[0].deletedAt);
});

test('public auth profiles exclude passwords and mock administrative operations enforce role', async () => {
  const auth = createMockAuthService();
  const demo = await auth.login({ username: 'demo', password: 'demo123' });
  assert.equal('password' in demo, false);
  await assert.rejects(
    auth.addUser({ username: 'new', password: 'secret', name: 'New', role: 'admin' }),
    (error) => error.problem.status === 403,
  );
  await auth.logout();
  await auth.login({ username: 'admin', password: 'admin123' });
  assert.ok((await auth.listUsers()).every((user) => !('password' in user)));
});

test('HTTP transport uses included cookies, bearer token and CSRF guard', async () => {
  const calls = [];
  const client = createHttpClient(
    async () => 'csrf-token',
    async (url, options) => {
      calls.push({ url, options });
      return new Response(null, { status: 204 });
    },
  );
  await client.request('/projects', { method: 'POST', body: { name: 'Test' } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[0].options.headers['X-Requested-With'], 'nodexmesh-web');
  await assert.rejects(client.request('//attacker.example'));
});

test('project trash preserves content, blocks edits, restores and purges to an empty collection', async () => {
  const { api, snapshot } = await setup();
  const board = await mutate(api, snapshot, [createCanvasItem('timeline', 0, 0)]);
  let project = await api.projects.update(snapshot.project.id, {
    name: snapshot.project.name,
    color: snapshot.project.color,
    deletedAt: new Date().toISOString(),
    expectedRevision: '1',
    clientMutationId: crypto.randomUUID(),
  });
  assert.equal((await api.projects.list())[0].board.items.length, 1);
  await assert.rejects(
    api.boards.mutate(project.id, board.board.id, {
      clientMutationId: crypto.randomUUID(),
      expectedBoardRevision: board.board.revision,
      upserts: [],
      deletes: [],
    }),
    (error) => error.problem.code === 'project_trashed',
  );
  project = await api.projects.update(project.id, {
    name: project.name,
    color: project.color,
    deletedAt: null,
    expectedRevision: project.revision,
    clientMutationId: crypto.randomUUID(),
  });
  assert.equal(project.deletedAt, null);
  await assert.rejects(api.projects.purge(project.id, project.revision, crypto.randomUUID()));
  project = await api.projects.update(project.id, {
    name: project.name,
    color: project.color,
    deletedAt: new Date().toISOString(),
    expectedRevision: project.revision,
    clientMutationId: crypto.randomUUID(),
  });
  const mutationId = crypto.randomUUID();
  await api.projects.purge(project.id, project.revision, mutationId);
  await api.projects.purge(project.id, project.revision, mutationId);
  assert.deepEqual(await api.projects.list(), []);
});

test('column transfer retains identity and tags normalize without endless writes', async () => {
  const { api, snapshot } = await setup();
  const column = createCanvasItem('column', 0, 0);
  const note = { ...createCanvasItem('note', 0, 0), tags: ['Backend', 'backend', ' BACKEND '] };
  column.items = [note];
  let board = await mutate(api, snapshot, [column]);
  assert.equal(board.tags.length, 1);
  assert.equal(diffBoard(board, [column]), null);
  board = await mutate(api, { ...snapshot, board }, [
    { ...column, items: [] },
    { ...note, x: 600 },
  ]);
  const savedNote = board.items.find((item) => item.id === note.id);
  assert.equal(savedNote.parentItemId, null);
  assert.equal(savedNote.revision, '2');
});

test('controller exposes conflicts and preserves local draft instead of overwriting another session', async () => {
  const { api } = await setup();
  const controller = new WorkspaceController(api);
  await controller.load();
  controller.update((projects) => projects.map((p) => ({ ...p, items: [createCanvasItem('note', 0, 0)] })));
  await controller.flush();
  const [snapshot] = await api.projects.list();
  const remote = toProjectView(snapshot);
  remote.items[0].content = 'Remote';
  await mutate(api, snapshot, remote.items);
  controller.update((projects) =>
    projects.map((p) => ({ ...p, items: p.items.map((i) => ({ ...i, content: 'Local' })) })),
  );
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'conflict');
  assert.equal(controller.getSnapshot().projects[0].items[0].content, 'Local');
  assert.equal((await api.projects.list())[0].board.items[0].data.content, 'Remote');
});

test('a forged author is rejected and an unsupported persisted version is retained', async () => {
  const { api, store, snapshot } = await setup();
  const entry = flattenItems([createCanvasItem('note', 0, 0)], snapshot.board.board.id)[0];
  await assert.rejects(
    api.boards.mutate(snapshot.project.id, snapshot.board.board.id, {
      clientMutationId: crypto.randomUUID(),
      expectedBoardRevision: '1',
      upserts: [{ ...entry, item: { ...entry.item, createdBy: 'forged' } }],
      deletes: [],
    }),
    (error) => error.problem.code === 'read_only_field',
  );
  await mutate(api, snapshot, [createCanvasItem('note', 0, 0)]);
  const db = JSON.parse(store.getItem(mockWorkspaceKey('qa')));
  db.projects[0].board.items[0].schemaVersion = 99;
  const raw = JSON.stringify(db);
  store.setItem(mockWorkspaceKey('qa'), raw);
  await assert.rejects(api.projects.list());
  assert.equal(store.getItem(mockWorkspaceKey('qa')), raw);
});
