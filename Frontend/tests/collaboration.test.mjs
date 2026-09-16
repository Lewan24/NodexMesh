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
const { createMockWorkspace } = await server.ssrLoadModule('/src/features/projects/services/mockWorkspace.ts');
const { createHttpWorkspace } = await server.ssrLoadModule('/src/features/projects/services/httpWorkspace.ts');
const { WorkspaceController } = await server.ssrLoadModule('/src/features/projects/services/workspaceController.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { diffBoard, toProjectView } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { mergeChanges } = await server.ssrLoadModule('/src/features/projects/services/collaborationMerge.ts');
const { ItemHistory } = await server.ssrLoadModule('/src/features/canvas/utils/itemHistory.ts');
const { zoomCamera } = await server.ssrLoadModule('/src/features/projects/hooks/useReadOnlyNavigation.ts');
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

test('same-property conflicts preserve the local draft and do not overwrite the server', async () => {
  const { api, a, b, itemA } = await setup();
  change(a, itemA, { content: 'First writer' });
  change(b, itemA, { content: 'Unsent draft' });
  await a.flush();
  await b.flush();
  assert.equal(b.getSnapshot().status, 'conflict');
  assert.equal(item(b, itemA).content, 'Unsent draft');
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

test('role downgrade preserves unsaved metadata instead of trying to write with viewer access', async () => {
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
  assert.equal(controller.getSnapshot().status, 'conflict');
  assert.equal(project(controller).name, 'Unsent rename');
  assert.notEqual((await api.projects.list())[0].project.name, 'Unsent rename');
});
