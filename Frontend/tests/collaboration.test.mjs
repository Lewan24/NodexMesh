import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-collaboration-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { createMockWorkspace } = await server.ssrLoadModule('/src/features/projects/services/mockWorkspace.ts');
const { createHttpWorkspace } = await server.ssrLoadModule('/src/features/projects/services/httpWorkspace.ts');
const { WorkspaceController } = await server.ssrLoadModule('/src/features/projects/services/workspaceController.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { diffBoard, toProjectView } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { mergeChanges } = await server.ssrLoadModule('/src/features/projects/services/collaborationMerge.ts');
const { ItemHistory } = await server.ssrLoadModule('/src/features/canvas/utils/itemHistory.ts');
const { zoomCamera } = await server.ssrLoadModule('/src/features/projects/hooks/useReadOnlyNavigation.ts');
const { ApiError } = await server.ssrLoadModule('/src/shared/api/errors.ts');
const { browserRecoveryStore } = await server.ssrLoadModule('/src/features/projects/services/recoveryDrafts.ts');
const { createHttpClient } = await server.ssrLoadModule('/src/shared/api/httpClient.ts');
const { createDrawing } = await server.ssrLoadModule('/src/features/blocks/drawing/drawingUtils.ts');
const { hasWheelOverflow } = await server.ssrLoadModule('/src/features/canvas/utils/wheelOverflow.ts');
await server.close();

async function setup() {
  const values = new Map();
  const api = createMockWorkspace(
    'collaboration-test',
    {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    () => 'collaboration-test',
  );
  const [snapshot] = await api.projects.list();
  const items = [createCanvasItem('note', 0, 0), createCanvasItem('note', 500, 0)];
  await api.boards.mutate(snapshot.project.id, snapshot.board.board.id, diffBoard(snapshot.board, items));
  const a = new WorkspaceController(api),
    b = new WorkspaceController(api);
  await a.load();
  await b.load();
  return { api, a, b, id: snapshot.project.id, itemA: items[0].id, itemB: items[1].id };
}
const project = (controller) => controller.getSnapshot().projects[0];
const change = (controller, id, patch) =>
  controller.update((projects) =>
    projects.map((p) => ({ ...p, items: p.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) })),
  );
const item = (controller, id) => project(controller).items.find((entry) => entry.id === id);

test('incoming edits merge with pending local edits and both clients converge', async () => {
  const { a, b, id, itemA, itemB } = await setup();
  change(a, itemA, { content: 'Local draft' });
  change(b, itemB, { content: 'Remote edit' });
  await b.flush();
  await a.syncProject(id);
  assert.equal(item(a, itemA).content, 'Local draft');
  assert.equal(item(a, itemB).content, 'Remote edit');
  assert.equal(a.getSnapshot().status, 'pending');
  await a.flush();
  await b.syncProject(id);
  assert.deepEqual(project(a), project(b));
  assert.equal(a.getSnapshot().status, 'saved');
});

test('simultaneous saves of different items automatically rebase stale board revisions', async () => {
  const { a, b, id, itemA, itemB } = await setup();
  change(a, itemA, { content: 'First' });
  change(b, itemB, { content: 'Second' });
  await a.flush();
  await b.flush();
  await a.syncProject(id);
  assert.equal(b.getSnapshot().status, 'saved');
  assert.equal(item(a, itemA).content, 'First');
  assert.equal(item(a, itemB).content, 'Second');
  assert.deepEqual(project(a), project(b));
});

test('different properties of the same item merge without replacing content', async () => {
  const { a, b, id, itemA } = await setup();
  change(a, itemA, { content: 'Text' });
  change(b, itemA, { x: 123 });
  await a.flush();
  await b.flush();
  await a.syncProject(id);
  assert.equal(b.getSnapshot().status, 'saved');
  assert.equal(item(a, itemA).content, 'Text');
  assert.equal(item(a, itemA).x, 123);
});

test('background opacity survives item mutation, save, and reload', async () => {
  const { api, a, itemA } = await setup();
  change(a, itemA, { backgroundOpacity: 37, color: '#aabbcc' });
  await a.flush();
  assert.equal(a.getSnapshot().status, 'saved');
  const saved = toProjectView((await api.projects.list())[0]);
  assert.equal(saved.items.find((entry) => entry.id === itemA).backgroundOpacity, 37);
  const reloaded = new WorkspaceController(api);
  await reloaded.load();
  assert.equal(item(reloaded, itemA).backgroundOpacity, 37);
});

test('same-property conflicts refresh automatically and preserve a separate recovery draft', async () => {
  const { api, a, b, itemA } = await setup();
  change(a, itemA, { content: 'First writer' });
  change(b, itemA, { content: 'Unsent draft' });
  await a.flush();
  await b.flush();
  assert.equal(b.getSnapshot().status, 'saved');
  assert.equal(item(b, itemA).content, 'First writer');
  assert.equal(
    b.getSnapshot().recoveryDrafts[0].project.items.find((item) => item.id === itemA).content,
    'Unsent draft',
  );
  const saved = toProjectView((await api.projects.list())[0]);
  assert.equal(saved.items.find((entry) => entry.id === itemA).content, 'First writer');
});

test('remote deletion disappears live and is never resurrected by a later unrelated save', async () => {
  const { a, b, id, itemA, itemB } = await setup();
  a.update((projects) => projects.map((p) => ({ ...p, items: p.items.filter((entry) => entry.id !== itemA) })));
  await a.flush();
  await b.syncProject(id);
  assert.equal(item(b, itemA), undefined);
  change(b, itemB, { content: 'Kept' });
  await b.flush();
  await a.syncProject(id);
  assert.equal(item(a, itemA), undefined);
  assert.equal(item(a, itemB).content, 'Kept');
});

test('save acknowledgements retain remote commits and edits made while the request is in flight', async () => {
  const { api, itemA, itemB } = await setup();
  let controller,
    injected = false;
  const wrapped = {
    ...api,
    boards: {
      ...api.boards,
      mutate: async (projectId, boardId, mutation) => {
        const saved = await api.boards.mutate(projectId, boardId, mutation);
        if (injected) return saved;
        injected = true;
        change(controller, itemA, { content: 'Newer local draft' });
        const snapshot = (await api.projects.list())[0];
        const remote = toProjectView(snapshot).items.map((entry) =>
          entry.id === itemB ? { ...entry, content: 'Concurrent remote' } : entry,
        );
        return api.boards.mutate(projectId, boardId, diffBoard(snapshot.board, remote));
      },
    },
  };
  controller = new WorkspaceController(wrapped);
  await controller.load();
  change(controller, itemA, { content: 'Submitted draft' });
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'saved');
  assert.equal(item(controller, itemA).content, 'Newer local draft');
  assert.equal(item(controller, itemB).content, 'Concurrent remote');
  const saved = toProjectView((await api.projects.list())[0]);
  assert.deepEqual(project(controller).items, saved.items);
});

test('a failed background read preserves the displayed board and can reconnect', async () => {
  const { api, id } = await setup();
  let offline = true;
  const controller = new WorkspaceController({
    ...api,
    sync: async () => {
      if (offline) throw new Error('offline');
      return (await api.projects.list())[0];
    },
  });
  await controller.load();
  const before = project(controller);
  await assert.rejects(controller.syncProject(id));
  assert.deepEqual(project(controller), before);
  assert.equal(controller.getSnapshot().status, 'saved');
  offline = false;
  await controller.syncProject(id);
  assert.equal(controller.getSnapshot().status, 'saved');
});

test('aborted background reads cannot overwrite a newer reload', async () => {
  const { api, id, itemA } = await setup();
  const stale = (await api.projects.list())[0];
  let finish;
  const controller = new WorkspaceController({
    ...api,
    sync: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  await controller.load();
  const abort = new AbortController();
  const read = controller.syncProject(id, abort.signal);
  const items = toProjectView(stale).items.map((entry) =>
    entry.id === itemA ? { ...entry, content: 'New server value' } : entry,
  );
  await api.boards.mutate(id, stale.board.board.id, diffBoard(stale.board, items));
  abort.abort();
  await controller.load();
  finish(stale);
  await read;
  assert.equal(item(controller, itemA).content, 'New server value');
});

test('role changes arrive without a reload and block subsequent writes', async () => {
  const { api, id, itemA } = await setup();
  const controller = new WorkspaceController({
    ...api,
    sync: async () => {
      const snapshot = (await api.projects.list())[0];
      return { ...snapshot, project: { ...snapshot.project, role: 'Viewer' } };
    },
  });
  await controller.load();
  await controller.syncProject(id);
  const before = item(controller, itemA).content;
  change(controller, itemA, { content: 'Forbidden' });
  assert.equal(project(controller).role, 'Viewer');
  assert.equal(item(controller, itemA).content, before);
});

test('HTTP revision checks skip unchanged board downloads but detect metadata and role changes', async () => {
  const { api } = await setup();
  const snapshot = (await api.projects.list())[0],
    calls = [];
  let changed = false,
    role = 'Editor';
  const http = createHttpWorkspace({
    request: async (path) => {
      calls.push(path);
      if (path.endsWith('/boards'))
        return [{ ...snapshot.board.board, revision: changed ? '3' : snapshot.board.board.revision }];
      if (path.startsWith('/boards/')) return { ...snapshot.board, board: { ...snapshot.board.board, revision: '3' } };
      return { ...snapshot.project, role };
    },
  });
  const previous = { ...snapshot, project: { ...snapshot.project, role } };
  assert.equal(await http.sync(previous), null);
  assert.equal(calls.filter((path) => path.startsWith('/boards/')).length, 0);
  role = 'Viewer';
  assert.equal((await http.sync(previous)).project.role, 'Viewer');
  changed = true;
  assert.equal((await http.sync(previous)).board.board.revision, '3');
  assert.equal(calls.filter((path) => path.startsWith('/boards/')).length, 1);
});

test('undo removes only local changes after remote additions and updates', () => {
  const initial = [
    { id: 'a', content: 'Old', x: 0 },
    { id: 'b', content: 'Other', x: 0 },
  ];
  const history = new ItemHistory(initial, 50);
  const local = initial.map((entry) => (entry.id === 'a' ? { ...entry, content: 'My edit' } : entry));
  history.observe(local);
  const remote = [
    ...local.map((entry) => (entry.id === 'b' ? { ...entry, content: 'Their edit' } : entry)),
    { id: 'c', content: 'Added remotely' },
  ];
  history.rebase(remote);
  const undone = history.undo(remote);
  assert.equal(undone.find((entry) => entry.id === 'a').content, 'Old');
  assert.equal(undone.find((entry) => entry.id === 'b').content, 'Their edit');
  assert.equal(undone.find((entry) => entry.id === 'c').content, 'Added remotely');
});

test('nested additions merge, but delete-versus-edit and incompatible reorder conflicts are explicit', () => {
  const base = [{ id: 'column', items: [{ id: 'note', content: 'Old' }] }];
  const ours = [{ id: 'column', items: [{ id: 'note', content: 'Local' }] }];
  const theirs = [
    {
      id: 'column',
      items: [
        { id: 'note', content: 'Old' },
        { id: 'new', content: 'Remote' },
      ],
    },
  ];
  const merged = mergeChanges(base, ours, theirs);
  assert.deepEqual(
    merged[0].items.map((entry) => entry.content),
    ['Local', 'Remote'],
  );
  assert.throws(() => mergeChanges(base, ours, []));
  const rows = ['a', 'b', 'c'].map((id) => ({ id }));
  assert.throws(() => mergeChanges(rows, [rows[1], rows[0], rows[2]], [rows[0], rows[2], rows[1]]));
});

test('read-only zoom keeps the point under the cursor fixed and clamps extreme wheel input', () => {
  const camera = { x: 80, y: -30, zoom: 0.5 },
    cursor = { x: 500, y: 300 };
  const next = zoomCamera(camera, 2, cursor);
  assert.equal((cursor.x - camera.x) / camera.zoom, (cursor.x - next.x) / next.zoom);
  assert.equal((cursor.y - camera.y) / camera.zoom, (cursor.y - next.y) / next.zoom);
  assert.equal(zoomCamera(camera, 100, cursor).zoom, 3);
  assert.equal(zoomCamera(camera, -100, cursor).zoom, 0.1);
});

test('concurrent project metadata edits rebase when different fields changed', async () => {
  const { api } = await setup();
  const services = { ...api, sync: async () => (await api.projects.list())[0] };
  const a = new WorkspaceController(services),
    b = new WorkspaceController(services);
  await a.load();
  await b.load();
  a.update((projects) => projects.map((p) => ({ ...p, name: 'Collaborative name' })));
  b.update((projects) => projects.map((p) => ({ ...p, color: '#123456' })));
  await a.flush();
  await b.flush();
  assert.equal(b.getSnapshot().status, 'saved');
  assert.equal(project(b).name, 'Collaborative name');
  assert.equal(project(b).color, '#123456');
});

test('role downgrade refreshes permissions and archives unsaved metadata', async () => {
  const { api, id } = await setup();
  const controller = new WorkspaceController({
    ...api,
    sync: async () => {
      const snapshot = (await api.projects.list())[0];
      return { ...snapshot, project: { ...snapshot.project, role: 'Viewer' } };
    },
  });
  await controller.load();
  controller.update((projects) => projects.map((p) => ({ ...p, name: 'Unsent rename' })));
  await controller.syncProject(id);
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'saved');
  assert.equal(controller.getSnapshot().recoveryDrafts[0].project.name, 'Unsent rename');
  assert.equal(project(controller).role, 'Viewer');
  assert.notEqual((await api.projects.list())[0].project.name, 'Unsent rename');
});

test('untagged mutations skip the pre-save snapshot and still reload the acknowledged board', async () => {
  const { api } = await setup();
  const snapshot = (await api.projects.list())[0];
  const calls = [];
  const http = createHttpWorkspace({
    request: async (path, options) => {
      calls.push(options?.method ?? 'GET');
      if (options?.method === 'POST') return { boardRevision: snapshot.board.board.revision, conflicts: [] };
      return snapshot.board;
    },
  });
  const mutation = diffBoard(
    snapshot.board,
    toProjectView(snapshot).items.map((item) => ({ ...item, x: item.x + 10, tags: [] })),
  );
  await http.boards.mutate(snapshot.project.id, snapshot.board.board.id, mutation);
  assert.deepEqual(calls, ['POST', 'GET']);
});

test('continuous edits start saving before the user stops typing', async () => {
  const { a } = await setup();
  let writes = 0;
  a.flush = async () => {
    writes++;
  };
  const edit = () => a.update((projects) => projects.map((project) => ({ ...project, name: `${project.name}x` })));
  edit();
  const typing = setInterval(edit, 40);
  try {
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.ok(writes > 0, 'saving must not wait for typing to stop');
  } finally {
    clearInterval(typing);
    await a.discardForReset();
  }
});

test('recovery copies are persisted before the shared board replaces local edits', async () => {
  const { api, a, itemA } = await setup();
  const copies = [];
  const b = new WorkspaceController(api, {
    load: () => [],
    save: (draft) => copies.push(structuredClone(draft)),
    remove: () => {},
  });
  await b.load();
  change(b, itemA, { content: 'Keep my unsent text' });
  change(a, itemA, { content: 'Shared text' });
  await a.flush();
  await b.flush();
  assert.equal(copies.length, 1);
  assert.equal(copies[0].project.items.find((item) => item.id === itemA).content, 'Keep my unsent text');
  assert.equal(item(b, itemA).content, 'Shared text');
  const reopened = new WorkspaceController(api, { load: () => copies, save: () => {}, remove: () => {} });
  await reopened.load();
  assert.equal(
    reopened.getSnapshot().recoveryDrafts[0].project.items.find((item) => item.id === itemA).content,
    'Keep my unsent text',
  );
});

test('unavailable recovery storage never discards the local draft', async () => {
  const { api, a, itemA } = await setup();
  const b = new WorkspaceController(api, {
    load: () => [],
    save: () => {
      throw new Error('Storage full');
    },
    remove: () => {},
  });
  await b.load();
  change(b, itemA, { content: 'Unsent text' });
  change(a, itemA, { content: 'Shared text' });
  await a.flush();
  await b.flush();
  assert.equal(b.getSnapshot().status, 'error');
  assert.equal(item(b, itemA).content, 'Unsent text');
  const child = await api.boards.create(project(b).id, 'Other');
  await assert.rejects(b.switchBoard(project(b).id, child.board.id), /Save pending changes/);
  assert.equal(item(b, itemA).content, 'Unsent text');
});

test('a lost response after commit retries the identical mutation without duplicating changes', async () => {
  const { api, itemA } = await setup();
  const calls = [];
  const controller = new WorkspaceController({
    ...api,
    boards: {
      ...api.boards,
      mutate: async (...args) => {
        calls.push(args[2]);
        const result = await api.boards.mutate(...args);
        if (calls.length === 1) throw new TypeError('Failed to fetch');
        return result;
      },
    },
  });
  await controller.load();
  change(controller, itemA, { content: 'Saved once' });
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'saved');
  assert.equal(calls.length, 2);
  assert.equal(calls[0], calls[1]);
  assert.equal(item(controller, itemA).content, 'Saved once');
  assert.equal(controller.getSnapshot().recoveryDrafts.length, 0);
});

test('repeated revision conflicts recover without retrying forever', async () => {
  const { api, itemA } = await setup();
  let attempts = 0;
  const controller = new WorkspaceController({
    ...api,
    boards: {
      ...api.boards,
      mutate: async () => {
        attempts++;
        throw new ApiError({ type: 'about:blank', status: 409, code: 'revision_mismatch', title: 'Conflict' });
      },
    },
  });
  await controller.load();
  change(controller, itemA, { content: 'Recovery draft' });
  await controller.flush();
  assert.equal(attempts, 4);
  assert.equal(controller.getSnapshot().status, 'saved');
  assert.equal(controller.getSnapshot().recoveryDrafts.length, 1);
  assert.equal(
    controller.getSnapshot().recoveryDrafts[0].project.items.find((item) => item.id === itemA).content,
    'Recovery draft',
  );
});

test('comment saves rebase unrelated board edits automatically', async () => {
  const { a, b, id, itemA, itemB } = await setup();
  change(a, itemB, { content: 'Other edit' });
  await a.flush();
  const comment = { id: crypto.randomUUID(), text: 'Comment after remote edit', status: 'open' };
  await b.saveComments(id, itemA, [comment]);
  assert.equal(item(b, itemA).comments[0].text, comment.text);
  assert.equal(item(b, itemB).content, 'Other edit');
  assert.equal(b.getSnapshot().recoveryDrafts.length, 0);
});

test('competing comment edits refresh and preserve the unsent comment text', async () => {
  const { a, b, id, itemA } = await setup();
  const comment = { id: crypto.randomUUID(), text: 'Original', status: 'open' };
  await a.saveComments(id, itemA, [comment]);
  await b.syncProject(id);
  await a.saveComments(id, itemA, [{ ...comment, text: 'Shared comment edit' }]);
  await b.saveComments(id, itemA, [{ ...comment, text: 'Unsent comment edit' }]);
  assert.equal(item(b, itemA).comments[0].text, 'Shared comment edit');
  assert.equal(
    b.getSnapshot().recoveryDrafts[0].project.items.find((item) => item.id === itemA).comments[0].text,
    'Unsent comment edit',
  );
});

test('mutation conflict reasons survive HTTP transport for lock-aware recovery', async () => {
  const client = createHttpClient(
    async () => 'token',
    async () =>
      new Response(JSON.stringify({ boardRevision: '2', conflicts: [{ id: 'item', reason: 'presence_locked' }] }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      }),
  );
  await assert.rejects(
    client.request('/boards/board/mutations', { method: 'POST', body: {} }),
    (error) => error.problem.code === 'presence_locked',
  );
});

test('browser recovery copies are scoped to users and independent tabs', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      get length() {
        return values.size;
      },
      key: (index) => [...values.keys()][index],
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  try {
    const a = browserRecoveryStore('a'),
      tab = browserRecoveryStore('a'),
      b = browserRecoveryStore('b');
    a.save({ id: 'one', createdAt: '2026-01-01', project: { id: 'p', items: [] } });
    tab.save({ id: 'two', createdAt: '2026-01-02', project: { id: 'p', items: [] } });
    assert.equal(a.load().length, 2);
    assert.equal(b.load().length, 0);
    a.remove('one');
    assert.equal(tab.load().length, 1);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

test('HTTP throttling reports the remaining retry delay without making another request', async () => {
  let requests = 0;
  const client = createHttpClient(
    async () => 'token',
    async () => {
      requests++;
      return new Response('{}', { status: 429, headers: { 'Retry-After': '60' } });
    },
  );
  const throttled = (error) => error.problem.status === 429 && error.problem.retryAfterMs > 59000;
  await assert.rejects(client.request('/boards/board'), throttled);
  await assert.rejects(client.request('/boards/board'), throttled);
  assert.equal(requests, 1);
});

test('unchanged background refresh resumes failed saves with the same mutation id', async () => {
  const { api, id, itemA } = await setup();
  let failing = true;
  const requests = [];
  const controller = new WorkspaceController({
    ...api,
    sync: async () => null,
    boards: {
      ...api.boards,
      mutate: async (...args) => {
        requests.push(args[2].clientMutationId);
        if (failing) throw new Error('Connection interrupted');
        return api.boards.mutate(...args);
      },
    },
  });
  await controller.load();
  change(controller, itemA, { content: 'Retained draft' });
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'error');
  failing = false;
  await controller.syncProject(id);
  await controller.flush();
  assert.equal(controller.getSnapshot().status, 'saved');
  assert.equal(new Set(requests).size, 1);
  const loaded = new WorkspaceController(api);
  await loaded.load();
  assert.equal(item(loaded, itemA).content, 'Retained draft');
});

test('drawing undo survives a controller save and persists its deletion', async () => {
  const { a, api, id } = await setup();
  const original = project(a).items;
  const history = new ItemHistory(original, 50);
  let version = a.getRemoteVersion(id);
  const unsubscribe = a.subscribe(() => {
    const nextVersion = a.getRemoteVersion(id);
    if (version !== nextVersion) history.rebase(project(a).items);
    else history.observe(project(a).items);
    version = nextVersion;
  });
  const drawing = createDrawing(
    [
      { x: 20, y: 30 },
      { x: 40, y: 60 },
    ],
    3,
  );
  history.boundary();
  a.update((projects) => projects.map((p) => ({ ...p, items: [...p.items, drawing] })));
  // Changing tool before the acknowledgement must not create a no-op undo.
  history.boundary();
  await a.flush();
  const undone = history.undo(project(a).items);
  assert.deepEqual(
    undone?.map((entry) => entry.id),
    original.map((entry) => entry.id),
  );
  a.update((projects) => projects.map((p) => ({ ...p, items: undone })));
  await a.flush();
  unsubscribe();
  const loaded = new WorkspaceController(api);
  await loaded.load();
  assert.equal(
    project(loaded).items.some((entry) => entry.id === drawing.id),
    false,
  );
});

test('wheel guards require scrollable overflow, not just fixed or clipped dimensions', () => {
  const previous = globalThis.getComputedStyle;
  globalThis.getComputedStyle = (element) => element.style;
  try {
    const element = {
      clientHeight: 100,
      scrollHeight: 100,
      clientWidth: 100,
      scrollWidth: 100,
      style: { overflowY: 'auto', overflowX: 'hidden' },
    };
    assert.equal(hasWheelOverflow(element), false);
    element.scrollHeight = 150;
    assert.equal(hasWheelOverflow(element), true);
    element.style.overflowY = 'hidden';
    assert.equal(hasWheelOverflow(element), false);
    element.scrollWidth = 150;
    element.style.overflowX = 'auto';
    assert.equal(hasWheelOverflow(element), true);
  } finally {
    globalThis.getComputedStyle = previous;
  }
});
