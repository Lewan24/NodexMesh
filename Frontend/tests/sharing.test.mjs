import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-sharing-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const { createPublicApi } = await server.ssrLoadModule('/src/features/projects/services/publicApi.ts');
const { createSharingApi } = await server.ssrLoadModule('/src/features/projects/services/sharingApi.ts');
const { toPublicProjectView } = await server.ssrLoadModule('/src/features/projects/services/publicBoardAdapter.ts');
const { createMockWorkspace } = await server.ssrLoadModule('/src/features/projects/services/mockWorkspace.ts');
const { WorkspaceController } = await server.ssrLoadModule('/src/features/projects/services/workspaceController.ts');
const { toProjectView, flattenItems } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { DEMO_USER_ID } = await server.ssrLoadModule('/src/entities/user/mockUsers.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { default: ItemInspector } = await server.ssrLoadModule('/src/features/inspector/ItemInspector.tsx');
await server.close();

function workspace() {
  const data = new Map();
  return createMockWorkspace(
    DEMO_USER_ID,
    {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key),
    },
    () => DEMO_USER_ID,
  );
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

test('public viewing uses only anonymous GET requests and never refreshes auth', async () => {
  const requests = [];
  const api = createPublicApi(async (url, options) => {
    requests.push({ url, options });
    return json({ project: { id: 'project', name: 'Shared' }, boards: [] });
  }, '/custom/api');
  await api.getProject('public-token');
  assert.equal(requests[0].url, '/custom/api/public/shared/public-token');
  assert.equal(requests[0].options.headers.Authorization, undefined);
  assert.equal(requests[0].options.method, 'GET');
  let count = 0;
  const expired = createPublicApi(async () => {
    count++;
    return json({}, 404);
  });
  await assert.rejects(expired.getProject('expired'), (error) => error.problem.status === 404);
  assert.equal(count, 1);
});

test('sharing maps member roles and link lifecycle to the existing API', async () => {
  const calls = [];
  const api = createSharingApi({
    request: async (...args) => {
      calls.push(args);
      return [];
    },
  });
  await api.invite('project', 'user@example.com', 'Editor');
  await api.changeRole('project', 'user', 'Viewer');
  await api.remove('project', 'user');
  await api.createLink('project', 'Review', '2030-01-01T00:00:00.000Z');
  await api.revoke('project', 'link');
  assert.deepEqual(
    calls.map(([path, options]) => [path, options.method]),
    [
      ['/projects/project/members', 'POST'],
      ['/projects/project/members/user', 'PATCH'],
      ['/projects/project/members/user', 'DELETE'],
      ['/projects/project/share-links', 'POST'],
      ['/projects/project/share-links/link', 'DELETE'],
    ],
  );
  assert.deepEqual(calls[0][1].body, { email: 'user@example.com', role: 'Editor' });
  assert.equal(calls[3][1].body.expiresAt, '2030-01-01T00:00:00.000Z');
});

test('public projection preserves nested content and connections without private comments or owner IDs', async () => {
  const [snapshot] = await workspace().projects.list();
  const column = createCanvasItem('column', -100, -100);
  column.items = [createCanvasItem('note', 0, 0)];
  const audit = {
    revision: '1',
    createdAt: snapshot.project.updatedAt,
    updatedAt: snapshot.project.updatedAt,
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
  };
  snapshot.board.items.push(
    ...flattenItems([column], snapshot.board.board.id).map(({ item }) => ({ ...item, ...audit })),
  );
  const { project, board } = snapshot;
  const payload = {
    project: { id: project.id, name: project.name, color: project.color, updatedAt: project.updatedAt },
    board: { id: board.board.id, name: board.board.name, sortOrder: board.board.sortOrder },
    items: board.items.map(({ createdAt, createdBy, updatedBy, deletedAt, ...item }) => item),
    links: board.links,
    tags: board.tags,
    itemTags: board.itemTags,
    appearance: null,
  };
  const view = toPublicProjectView(payload);
  const expected = toProjectView({ ...snapshot, board: { ...board, comments: [] } });
  assert.deepEqual(view.items, expected.items);
  assert.equal('ownerId' in view, false);
  assert.ok(view.items.some((item) => item.type === 'column'));
  const invalid = structuredClone(payload);
  invalid.items[0].boardId = 'another-board';
  assert.throws(() => toPublicProjectView(invalid));
});

for (const role of ['Viewer', 'Commenter', 'Editor']) {
  test(`${role} permissions survive projection and prevent unauthorized local saves`, async () => {
    const services = workspace();
    const snapshots = (await services.projects.list()).map((snapshot) => ({
      ...snapshot,
      project: { ...snapshot.project, role },
    }));
    let writes = 0;
    const controller = new WorkspaceController({
      ...services,
      projects: {
        ...services.projects,
        list: async () => snapshots,
        update: async () => {
          writes++;
          throw new Error('unexpected write');
        },
      },
      boards: {
        ...services.boards,
        mutate: async () => {
          writes++;
          throw new Error('unexpected write');
        },
      },
    });
    await controller.load();
    assert.equal(controller.getSnapshot().projects[0].role, role);
    const before = controller.getSnapshot().projects;
    controller.update((projects) => projects.map((project) => ({ ...project, deletedAt: new Date().toISOString() })));
    assert.deepEqual(controller.getSnapshot().projects, before);
    if (role !== 'Editor') {
      controller.update((projects) => projects.map((project) => ({ ...project, name: 'Forbidden edit' })));
      controller.update((projects) => projects.map((project) => ({ ...project, items: [] })));
      assert.deepEqual(controller.getSnapshot().projects, before);
    }
    await controller.flush();
    assert.equal(writes, 0);
  });
}

test('viewer inspector exposes details and comments without tag or position editing', () => {
  const item = { ...createCanvasItem('note', 0, 0), tags: ['review'] };
  const html = renderToStaticMarkup(
    createElement(ItemInspector, {
      items: [item],
      readOnly: true,
      canComment: false,
      onUpdateAll: () => {},
      onClose: () => {},
    }),
  );
  assert.match(html, /Item details/);
  assert.match(html, /#review/);
  assert.match(html, /View comments/);
  assert.doesNotMatch(html, /Add tag|Add comment/);
  assert.match(html, /<button[^>]*disabled=""[^>]*hidden=""[^>]*title="Remove #review/);
  assert.match(html, /disabled=""[^>]*class="w-full flex items-center justify-between/);
});

test('commenter saves through the comments endpoint without modifying item content', async () => {
  const services = workspace();
  const [snapshot] = await services.projects.list();
  const item = createCanvasItem('note', 20, 30);
  await services.boards.mutate(snapshot.project.id, snapshot.board.board.id, {
    clientMutationId: crypto.randomUUID(),
    expectedBoardRevision: snapshot.board.board.revision,
    upserts: flattenItems([item], snapshot.board.board.id),
    deletes: [],
  });
  const controller = new WorkspaceController({
    ...services,
    projects: {
      ...services.projects,
      list: async () =>
        (await services.projects.list()).map((entry) => ({
          ...entry,
          project: { ...entry.project, role: 'Commenter' },
        })),
    },
  });
  await controller.load();
  const before = controller.getSnapshot().projects.find((project) => project.id === snapshot.project.id).items;
  const comment = { id: crypto.randomUUID(), text: 'Review this', status: 'open', createdAt: new Date().toISOString() };
  await controller.saveComments(snapshot.project.id, item.id, [comment]);
  const after = controller.getSnapshot().projects.find((project) => project.id === snapshot.project.id).items;
  const saved = after.find((entry) => entry.id === item.id);
  assert.equal(saved.comments[0].text, comment.text);
  assert.equal(saved.comments[0].authorId, DEMO_USER_ID);
  assert.deepEqual(
    after.map((entry) => ({ ...entry, comments: [] })),
    before.map((entry) => ({ ...entry, comments: [] })),
  );
  assert.equal(controller.getSnapshot().status, 'saved');
  await controller.load();
  assert.equal(
    controller
      .getSnapshot()
      .projects.find((project) => project.id === snapshot.project.id)
      .items.find((entry) => entry.id === item.id).comments.length,
    1,
  );
});
