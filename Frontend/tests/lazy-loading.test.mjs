import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-lazy-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const { createHttpWorkspace } = await server.ssrLoadModule('/src/features/projects/services/httpWorkspace.ts');
const { WorkspaceController } = await server.ssrLoadModule('/src/features/projects/services/workspaceController.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { flattenItems, toProjectView } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { ApiError } = await server.ssrLoadModule('/src/shared/api/errors.ts');
await server.close();
const audit = {
  revision: '1',
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  createdBy: null,
  updatedBy: null,
  deletedAt: null,
};
const project = {
  ...audit,
  id: 'project',
  ownerId: 'owner',
  name: 'Project',
  color: '#ffffff',
  role: 'Owner',
  itemCount: 120,
};
const board = {
  ...audit,
  id: '00000000-0000-4000-8000-000000000001',
  projectId: project.id,
  name: 'Board',
  sortOrder: 0,
};
const items = Array.from({ length: 120 }, (_, i) => ({
  ...flattenItems([createCanvasItem('note', i * 260, 0)], board.id)[0].item,
  ...audit,
}));
const snapshot = { board, items, links: [], comments: [], tags: [], itemTags: [] };
const manifest = {
  board,
  items: items.map(({ id, x, y, width, height, parentItemId }) => ({ id, x, y, width, height, parentItemId })),
};
function fixture(options = {}) {
  const requests = [];
  let active = 0,
    maximum = 0;
  const api = createHttpWorkspace({
    request: async (path, input) => {
      requests.push([path, input]);
      if (path === '/projects') return [project, { ...project, id: 'other-project' }];
      if (path === '/projects/project/boards') return [board];
      if (path === `/boards/${board.id}/loading-manifest`) return manifest;
      if (path === `/boards/${board.id}/item-page`) {
        maximum = Math.max(maximum, ++active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        active--;
        if (options.rateLimited) {
          options.rateLimited = false;
          throw new ApiError({ status: 429, code: 'rate_limited', title: 'Wait', retryAfterMs: 1 });
        }
        if (options.fail) throw new TypeError('Offline');
        if (options.stale) throw new ApiError({ status: 409, code: 'revision_mismatch', message: 'Changed' });
        return { ...snapshot, items: items.filter((item) => input.body.itemIds.includes(item.id)) };
      }
      throw new Error(`Unexpected request: ${path}`);
    },
  });
  return { api, requests, maximum: () => maximum };
}
test('startup loads summaries; opening uses bounded concurrent batches, progress, counts and caching', async () => {
  const { api, requests, maximum } = fixture();
  const controller = new WorkspaceController(api);
  await controller.load();
  assert.deepEqual(
    requests.map(([path]) => path),
    ['/projects'],
  );
  assert.equal(controller.getSnapshot().projects[0].itemCount, 120);
  assert.equal(controller.getSnapshot().projects[0].items.length, 0);
  const progress = [];
  controller.subscribe(() => progress.push(controller.getSnapshot().projects[0].items.length));
  await Promise.all([controller.openProject(project.id), controller.openProject(project.id)]);
  assert.ok(progress.includes(50) && progress.includes(100));
  assert.equal(controller.getSnapshot().projects[0].itemsLoading, undefined);
  assert.equal(controller.getSnapshot().projects[0].items.length, 120);
  assert.equal(controller.getSnapshot().projects[1].itemsLoading, true);
  assert.equal(requests.filter(([path]) => path.endsWith('/item-page')).length, 3);
  assert.ok(maximum() <= 3);
  assert.ok(requests.every(([, input]) => !input?.body?.itemIds || input.body.itemIds.length <= 50));
  await controller.openProject(project.id);
  assert.equal(requests.length, 6);
});
test('incomplete projections cannot create board writes and failed loads can retry', async () => {
  const options = { fail: true };
  const { api } = fixture(options);
  const controller = new WorkspaceController(api);
  await controller.load();
  controller.update((projects) => projects.map((p) => ({ ...p, items: [createCanvasItem('note', 0, 0)] })));
  await controller.flush();
  assert.equal(controller.getSnapshot().projects[0].items.length, 0);
  assert.equal(controller.getSnapshot().status, 'saved');
  await controller.openProject(project.id);
  assert.ok(controller.getSnapshot().projects[0].loadingError);
  options.fail = false;
  await controller.openProject(project.id);
  assert.equal(controller.getSnapshot().projects[0].loadingError, undefined);
  assert.equal(controller.getSnapshot().projects[0].items.length, 120);
});
test('revision changes restart loading a bounded number of times', async () => {
  const { api, requests } = fixture({ stale: true });
  const controller = new WorkspaceController(api);
  await controller.load();
  await controller.openProject(project.id);
  assert.equal(requests.filter(([path]) => path.endsWith('/loading-manifest')).length, 3);
  assert.equal(controller.getSnapshot().projects[0].itemsLoading, true);
  assert.ok(controller.getSnapshot().projects[0].loadingError);
});
test('dispenser paper color persists independently of its shell color', () => {
  const item = { ...createCanvasItem('dispenser', 0, 0), color: '#123456', paperColor: '#abcdef' };
  const entries = flattenItems([item], board.id);
  assert.equal(entries[0].item.data.paperColor, '#abcdef');
  assert.equal(entries[0].item.appearance.color, '#123456');
  const view = toProjectView({ project, board: { ...snapshot, items: [{ ...entries[0].item, ...audit }] } });
  assert.equal(view.items[0].paperColor, '#abcdef');
  assert.equal(view.items[0].color, '#123456');
});

test('links, comments and tags survive pages whose targets arrive in later batches', async () => {
  const target = { ...flattenItems([createCanvasItem('dispenser', 0, 0)], board.id)[0].item, ...audit };
  const linkedItems = [...items.slice(0, -1), target];
  const link = { sourceItemId: items[0].id, targetItemId: target.id, kind: 'created_from' };
  const comment = { ...audit, id: 'comment', itemId: items[0].id, text: 'Saved comment', status: 'open' };
  const tag = { id: 'tag', projectId: project.id, name: 'Work', normalizedName: 'work' };
  const itemTag = { itemId: items[0].id, tagId: tag.id };
  const api = createHttpWorkspace({
    request: async (path, options) => {
      if (path.endsWith('/boards')) return [board];
      if (path.endsWith('/loading-manifest'))
        return {
          board,
          items: linkedItems.map(({ id, x, y, width, height, parentItemId }) => ({
            id,
            x,
            y,
            width,
            height,
            parentItemId,
          })),
        };
      if (path.endsWith('/item-page')) {
        const selected = new Set(options.body.itemIds);
        return {
          board,
          items: linkedItems.filter((item) => selected.has(item.id)),
          links: selected.has(link.sourceItemId) ? [link] : [],
          comments: selected.has(comment.itemId) ? [comment] : [],
          tags: selected.has(itemTag.itemId) ? [tag] : [],
          itemTags: selected.has(itemTag.itemId) ? [itemTag] : [],
        };
      }
      throw new Error(path);
    },
  });
  const result = await api.projects.open(project);
  assert.equal(result.board.items.length, 120);
  const note = toProjectView(result).items.find((item) => item.id === items[0].id);
  assert.equal(note.dispenserId, target.id);
  assert.equal(note.comments[0].text, 'Saved comment');
  assert.deepEqual(note.tags, ['Work']);
});

test('rate-limited item pages retry without losing downloaded batches', async () => {
  const { api, requests } = fixture({ rateLimited: true });
  const controller = new WorkspaceController(api);
  await controller.load();
  await controller.openProject(project.id);
  assert.equal(controller.getSnapshot().projects[0].itemsLoading, undefined);
  assert.equal(controller.getSnapshot().projects[0].items.length, 120);
  assert.equal(requests.filter(([path]) => path.endsWith('/item-page')).length, 4);
});
