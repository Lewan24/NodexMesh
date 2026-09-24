import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-transfer-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { exportProjectJson, exportWorkspaceProject, importProjectJson, persistImportedProject, hasLibraryMedia } =
  await server.ssrLoadModule('/src/features/projects/services/projectJson.ts');
const { createMockWorkspace } = await server.ssrLoadModule('/src/features/projects/services/mockWorkspace.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { diffBoard, flattenItems, toProjectView } = await server.ssrLoadModule(
  '/src/features/projects/services/boardAdapter.ts',
);
const { demoProjects } = await server.ssrLoadModule('/src/entities/project/demoProjects.ts');
const { DEMO_USER_ID } = await server.ssrLoadModule('/src/entities/user/mockUsers.ts');
const { createHttpWorkspace } = await server.ssrLoadModule('/src/features/projects/services/httpWorkspace.ts');
await server.close();

function workspace(userId = 'transfer-user') {
  const values = new Map();
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  return {
    api: createMockWorkspace(userId, storage, () => userId),
    reload: () => createMockWorkspace(userId, storage, () => userId),
  };
}
function archive(boards, extra = {}) {
  return {
    format: 'nodexmesh-project',
    version: 2,
    project: {
      id: 'source-project',
      ownerId: 'old-owner',
      name: 'Transfer',
      color: '#059669',
      boardId: boards[0].id,
      boards,
      ...extra,
    },
  };
}
const note = (content) => ({ ...createCanvasItem('note', 20, 20), content });
const card = (title, boardId) => ({ ...createCanvasItem('board', 20, 20), title, boardId });
const read = (value) => importProjectJson(JSON.stringify(value), 'new-owner');

test('the checked-in export is valid and supplies the complete portable demo', async () => {
  const text = await readFile(new URL('../docs/NodexMesh.json', import.meta.url), 'utf8');
  const archive = JSON.parse(text);
  const imported = await importProjectJson(text, DEMO_USER_ID);
  assert.equal(imported.boards.length, archive.project.boards.length);
  assert.equal(hasLibraryMedia(imported), false);
  const demo = demoProjects[0];
  assert.deepEqual(demo.boards, [
    archive.project.boards.find((board) => board.id === archive.project.boardId),
    ...archive.project.boards.filter((board) => board.id !== archive.project.boardId),
  ]);
  assert.equal(demo.ownerId, DEMO_USER_ID);
  assert.equal(demo.name, archive.project.name);
  const visit = (items) => {
    for (const item of items) {
      if (item.type === 'column') visit(item.items);
      if (item.type === 'image' || (item.type === 'icon' && item.iconMode === 'url')) {
        const source = item.url ?? item.source;
        assert.match(source, /^https?:\/\//);
        assert.equal((source.match(/https?:\/\//g) ?? []).length, 1, 'media URL must not be duplicated');
      }
    }
  };
  demo.boards.forEach((board) => visit(board.items));
});

test('nested images and additional-board icons retain original library references during transfer', async () => {
  const reference = 'library://00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-000000000002';
  const image = { ...createCanvasItem('image', 0, 0), url: reference };
  const icon = { ...createCanvasItem('icon', 0, 0), iconMode: 'library', source: reference };
  const column = { ...createCanvasItem('column', 0, 0), items: [image] };
  const imported = await read(
    archive([
      { id: 'main', name: 'Main', items: [column] },
      { id: 'icons', name: 'Icons', items: [icon] },
    ]),
  );
  assert.equal(hasLibraryMedia(imported), true);
  assert.equal(hasLibraryMedia({ ...imported, boards: undefined }), true);
  assert.equal(hasLibraryMedia({ ...imported, boards: [imported.boards[1]] }), true);
  const { api } = workspace();
  const saved = await persistImportedProject(api, imported);
  const exported = JSON.parse(await exportWorkspaceProject(api, saved.project.id));
  assert.equal(exported.project.boards[0].items[0].items[0].url, reference);
  assert.equal(exported.project.boards[1].items[0].source, reference);
  assert.equal(exported.project.boards[1].items[0].iconMode, 'library');
});

function comparable(items) {
  return flattenItems(items, '00000000-0000-4000-8000-000000000001').map((entry) => ({
    ...entry,
    comments: entry.comments.map(({ id, text, status }) => ({ id, text, status })),
  }));
}

test('demo has one main-board item collection and seeds every board with complete content', async () => {
  const demo = demoProjects[0];
  assert.equal(demo.items, demo.boards[0].items);
  assert.equal(demo.boardId, demo.boards[0].id);
  const { api, reload } = workspace(DEMO_USER_ID);
  const [project] = await api.projects.list();
  const boards = await api.boards.list(project.project.id);
  assert.equal(boards.length, demo.boards.length);
  for (const [index, board] of boards.entries()) {
    const snapshot = await api.boards.get(project.project.id, board.id);
    assert.equal(board.name, demo.boards[index].name);
    assert.equal(snapshot.items.length, flattenItems(demo.boards[index].items, board.id).length);
    assert.notEqual(board.id, demo.boards[index].id);
    const originalIds = new Set(flattenItems(demo.boards[index].items, board.id).map((entry) => entry.item.id));
    assert.ok(snapshot.items.every((item) => !originalIds.has(item.id)));
    for (const item of snapshot.items.filter((item) => item.type === 'board' && item.data.boardId)) {
      assert.ok(boards.some((target) => target.id === item.data.boardId));
    }
    const again = await reload().boards.get(project.project.id, board.id);
    assert.deepEqual(again, snapshot);
  }
  const exported = await exportWorkspaceProject(api, project.project.id);
  const imported = await read(JSON.parse(exported));
  const copy = await persistImportedProject(api, imported);
  const copiedBoards = await api.boards.list(copy.project.id);
  assert.equal(copiedBoards.length, demo.boards.length);
  for (const [index, board] of copiedBoards.entries()) {
    const saved = await api.boards.get(copy.project.id, board.id);
    const boardIds = new Map(imported.boards.map((board, i) => [board.id, copiedBoards[i].id]));
    const expected = imported.boards[index].items.map((item) =>
      item.type === 'board' ? { ...item, boardId: item.boardId ? boardIds.get(item.boardId) : null } : item,
    );
    assert.deepEqual(comparable(toProjectView({ project: copy.project, board: saved }).items), comparable(expected));
    assert.equal(diffBoard(saved, toProjectView({ project: copy.project, board: saved }).items), null);
  }
});

test('canonical v2 files can omit legacy items and preserve the main board regardless of array order', async () => {
  const main = { id: 'main', name: 'Main', items: [note('Main content')] };
  const empty = { id: 'empty', name: 'Empty board', items: [] };
  const source = archive([empty, main], { boardId: main.id });
  const imported = await read(source);
  assert.equal(imported.boardId, imported.boards[0].id);
  assert.equal(imported.boards[0].name, 'Main');
  assert.equal(imported.items[0].content, 'Main content');
  assert.deepEqual(imported.boards[1].items, []);
  const { api } = workspace();
  const copied = await persistImportedProject(api, imported);
  assert.equal(copied.board.board.name, 'Main');
  assert.equal((await api.boards.list(copied.project.id)).length, 2);
  const exported = JSON.parse(exportProjectJson(imported));
  assert.deepEqual(exported.project.items, exported.project.boards[0].items);
});

test('v2 rejects conflicting main items, missing main boards, duplicate identities and missing linked boards', async () => {
  const main = { id: 'main', name: 'Main', items: [note('Main content')] };
  await assert.rejects(read(archive([main], { items: [note('Different content')] })), /do not match/);
  await assert.rejects(read(archive([main], { boardId: 'absent' })), /missing main board/);
  await assert.rejects(read(archive([{ ...main, id: '' }])), /Invalid project boards/);
  await assert.rejects(read(archive([main, { id: 'child', name: 'Child', items: main.items }])), /unique/);
  await assert.rejects(read(archive([{ ...main, items: [card('Broken', 'missing')] }])), /missing board/);
  const commented = note('Comments');
  commented.comments = [
    { id: 'comment', text: 'First', status: 'open' },
    { id: 'comment', text: 'Second', status: 'open' },
  ];
  await assert.rejects(read(archive([{ ...main, items: [commented] }])), /unique/);
});

test('legacy v1 files still import and detach unrecoverable child-board references', async () => {
  const legacy = {
    format: 'nodexmesh-project',
    version: 1,
    project: {
      id: 'legacy',
      name: 'Legacy',
      color: '#059669',
      items: [card('Lost board', 'unavailable'), note('Keep me')],
    },
  };
  const imported = await read(legacy);
  assert.equal(imported.boards.length, 1);
  assert.equal(imported.items[0].boardId, null);
  assert.equal(imported.items[1].content, 'Keep me');
  assert.equal(imported.boardId, imported.boards[0].id);
});

test('multiple levels, cyclic board links and column content use new server-assigned identities', async () => {
  const nested = note('Nested text');
  nested.tags = ['important'];
  nested.comments = [
    { id: 'original-comment', text: 'Keep this comment', status: 'todo', createdAt: '2025-01-01T00:00:00Z' },
  ];
  const column = { ...createCanvasItem('column', 0, 0), items: [nested] };
  const source = archive([
    { id: 'main', name: 'Main', items: [card('Child', 'child'), card('Shared child', 'child')] },
    { id: 'child', name: 'Child', items: [card('Grandchild', 'grandchild'), column] },
    { id: 'grandchild', name: 'Grandchild', items: [card('Back', 'main')] },
  ]);
  const imported = await read(source);
  const { api, reload } = workspace();
  const create = api.projects.create;
  api.projects.create = (input) => create({ ...input, id: crypto.randomUUID() });
  const copy = await persistImportedProject(api, imported);
  assert.notEqual(copy.project.id, imported.id);
  const boards = await api.boards.list(copy.project.id);
  const child = await reload().boards.get(copy.project.id, boards[1].id);
  const grandchild = await reload().boards.get(copy.project.id, boards[2].id);
  assert.ok(copy.board.items.every((item) => item.data.boardId === child.board.id));
  assert.equal(child.items.find((item) => item.type === 'board').data.boardId, grandchild.board.id);
  assert.equal(grandchild.items[0].data.boardId, copy.board.board.id);
  const childView = toProjectView({ project: copy.project, board: child });
  const content = childView.items.find((item) => item.type === 'column').items[0];
  assert.equal(content.content, nested.content);
  assert.deepEqual(content.tags, nested.tags);
  assert.equal(content.comments[0].text, nested.comments[0].text);
  assert.equal(content.comments[0].status, 'todo');
  assert.notEqual(content.comments[0].id, 'original-comment');
});

test('ID remapping preserves icon sources that happen to match an item ID', async () => {
  const target = { ...note('Target'), id: 'star' };
  const icon = createCanvasItem('icon', 0, 0);
  const imported = await read(archive([{ id: 'main', name: 'Main', items: [target, icon] }]));
  assert.equal(imported.items[1].source, 'star');
  assert.notEqual(imported.items[0].id, 'star');
});

test('exports exclude trashed boards and detach surviving cards to them without changing the source', async () => {
  const { api } = workspace();
  const [project] = await api.projects.list();
  const child = await api.boards.create(project.project.id, 'Trashed child');
  const first = card('First', child.board.id);
  const second = card('Second', child.board.id);
  let main = await api.boards.mutate(
    project.project.id,
    project.board.board.id,
    diffBoard(project.board, [first, second]),
  );
  main = await api.boards.mutate(project.project.id, main.board.id, diffBoard(main, [second]));
  const exported = await exportWorkspaceProject(api, project.project.id);
  const imported = await read(JSON.parse(exported));
  assert.equal(imported.boards.length, 1);
  assert.equal(imported.items[0].boardId, null);
  assert.equal(main.items.find((item) => item.id === second.id).data.boardId, child.board.id);
});

test('large imports respect HTTP batch limits and restore references across batch boundaries', async () => {
  const notes = Array.from({ length: 2000 }, (_, i) => note(`Note ${i}`));
  const line = { ...createCanvasItem('line', 0, 0), startItemId: notes[0].id, endItemId: notes.at(-1).id };
  const imported = await read(archive([{ id: 'large', name: 'Large board', items: [line, ...notes] }]));
  const { api } = workspace();
  const mutate = api.boards.mutate;
  const batches = [];
  api.boards.mutate = (projectId, boardId, mutation) => {
    assert.ok(mutation.upserts.length <= 2000);
    batches.push(mutation.upserts.length);
    return mutate(projectId, boardId, mutation);
  };
  const copied = await persistImportedProject(api, imported);
  assert.equal(copied.board.items.length, 2001);
  assert.deepEqual(batches, [2000, 1, 1]);
  assert.equal(copied.board.links.length, 2);
  assert.ok(copied.board.links.every((link) => copied.board.items.some((item) => item.id === link.targetItemId)));
});

test('a failed additional-board write moves the incomplete import to trash', async () => {
  const imported = await read(
    archive([
      { id: 'main', name: 'Main', items: [note('First')] },
      { id: 'child', name: 'Child', items: [note('Second')] },
    ]),
  );
  const { api } = workspace();
  const mutate = api.boards.mutate;
  let count = 0;
  api.boards.mutate = (...args) =>
    ++count === 2 ? Promise.reject(new Error('Simulated write failure')) : mutate(...args);
  await assert.rejects(persistImportedProject(api, imported), /Simulated write failure/);
  const partial = (await api.projects.list()).find((entry) => entry.project.id === imported.id);
  assert.ok(partial.project.deletedAt);
});

test('the HTTP workspace adapter exports and imports every board using server-created IDs', async () => {
  const { api: backing } = workspace();
  const projectForBoard = new Map();
  const requests = [];
  const http = createHttpWorkspace({
    async request(path, { method = 'GET', body } = {}) {
      requests.push(`${method} ${path}`);
      if (path === '/projects') {
        if (method === 'GET') return (await backing.projects.list()).map((entry) => entry.project);
        const snapshot = await backing.projects.create({
          ...body,
          id: crypto.randomUUID(),
          clientMutationId: crypto.randomUUID(),
        });
        projectForBoard.set(snapshot.board.board.id, snapshot.project.id);
        return snapshot.project;
      }
      const collection = path.match(/^\/projects\/([^/]+)\/boards$/);
      if (collection) {
        if (method === 'GET') return backing.boards.list(collection[1]);
        const board = await backing.boards.create(collection[1], body.name);
        projectForBoard.set(board.board.id, collection[1]);
        return board.board;
      }
      const boardPath = path.match(/^\/boards\/([^/]+)(\/mutations)?$/);
      if (boardPath) {
        const boardId = boardPath[1];
        const projectId = projectForBoard.get(boardId);
        assert.ok(projectId, 'requests must use server-created board IDs');
        if (method === 'GET') return backing.boards.get(projectId, boardId);
        if (method === 'PATCH') return backing.boards.rename(projectId, boardId, body.name);
        const saved = await backing.boards.mutate(projectId, boardId, body);
        return { boardRevision: saved.board.revision, conflicts: [] };
      }
      throw new Error(`Unexpected request ${method} ${path}`);
    },
  });
  const imported = await read(
    archive([
      { id: 'main', name: 'Main', items: [card('Research', 'research')] },
      { id: 'research', name: 'Research', items: [note('HTTP content'), card('Back', 'main')] },
      { id: 'empty', name: 'Empty board', items: [] },
    ]),
  );
  const saved = await persistImportedProject(http, imported);
  assert.notEqual(saved.project.id, imported.id);
  const exported = JSON.parse(await exportWorkspaceProject(http, saved.project.id));
  assert.equal(exported.project.boards.length, 3);
  assert.deepEqual(
    exported.project.boards.map((board) => board.name),
    ['Main', 'Research', 'Empty board'],
  );
  assert.equal(exported.project.boards[1].items[0].content, 'HTTP content');
  assert.equal(exported.project.items[0].boardId, exported.project.boards[1].id);
  assert.equal(exported.project.boards[1].items[1].boardId, exported.project.boardId);
  assert.equal(requests.filter((request) => request.endsWith('/mutations')).length, 2);
});
