import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': `${root}src` } },
  server: { middlewareMode: true, watch: null, hmr: false },
});

try {
  const { toProjectView, flattenItems } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
  const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
  const audit = {
    revision: '1',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
  };
  const boardId = '00000000-0000-4000-8000-000000000001';
  for (const count of [100, 500, 2000]) {
    const mutations = flattenItems(
      Array.from({ length: count }, (_, i) => ({
        ...createCanvasItem('note', i * 10, 0),
        content: 'Example note',
        comments: [{ id: `comment-${i}`, text: 'Comment' }],
        tags: ['One', 'Two', 'Three'],
      })),
      boardId,
    );
    const snapshot = {
      project: { id: 'project', name: 'Project', color: '#ffffff', ownerId: 'owner' },
      board: {
        board: { id: boardId },
        items: mutations.map(({ item }) => ({ ...item, ...audit })),
        links: [],
        comments: mutations.flatMap(({ item, comments }) =>
          comments.map((comment) => ({ ...comment, itemId: item.id, ...audit })),
        ),
        tags: ['One', 'Two', 'Three'].map((name) => ({ id: name, name })),
        itemTags: mutations.flatMap(({ item, tags }) => tags.map((tagId) => ({ itemId: item.id, tagId }))),
      },
    };
    for (let i = 0; i < 5; i++) toProjectView(snapshot);
    const samples = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      toProjectView(snapshot);
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    console.log(JSON.stringify({ items: count, medianMs: samples[10], p95Ms: samples[18] }));
  }
} finally {
  await server.close();
}
