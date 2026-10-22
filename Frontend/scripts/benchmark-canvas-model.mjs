import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': `${root}src` } },
  server: { middlewareMode: true, watch: null, hmr: false },
});

try {
  const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
  const { getFrameMovementLockedIds } = await server.ssrLoadModule('/src/features/canvas/utils/frameGeometry.ts');
  const { getBoardSearchResult, getSearchTargets, getColumnSearchResult, matchesItemSearch } =
    await server.ssrLoadModule('/src/features/search/utils/itemSearch.ts');

  // Preserve the previous canvas calculations as an explicit comparison baseline.
  const containsLock = (item) => !!item.locked || (item.type === 'column' && item.items.some(containsLock));
  const movementLocked = (frame, items) =>
    !!frame.locked ||
    items
      .filter((item) => item.frameId === frame.id)
      .some((item) => containsLock(item) || (item.type === 'frame' && movementLocked(item, items)));
  const referenceSearch = (items, query) => {
    const targets = getSearchTargets(items, query);
    const matchingIds = new Set();
    const nestedColumnMatches = new Map();
    for (const item of items) {
      if (item.type === 'column') {
        const result = getColumnSearchResult(item, query);
        if (result.matches) matchingIds.add(item.id);
        nestedColumnMatches.set(item.id, result.nestedMatchIds);
      } else if (matchesItemSearch(item, query)) matchingIds.add(item.id);
    }
    const matched = items.filter((item) => matchingIds.has(item.id));
    const contextFrameIds = new Set(
      items
        .filter(
          (item) => item.type === 'frame' && matched.some((match) => match.id !== item.id && match.frameId === item.id),
        )
        .map((item) => item.id),
    );
    return { targets, matchingIds, nestedColumnMatches, contextFrameIds };
  };
  const measure = (work) => {
    for (let i = 0; i < 5; i++) work();
    const samples = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      work();
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    return { medianMs: samples[10], p95Ms: samples[18] };
  };

  for (const count of [100, 500, 2000]) {
    const items = Array.from({ length: count }, (_, i) => ({
      ...createCanvasItem(i % 10 === 0 ? 'frame' : i % 3 === 0 ? 'document' : 'note', i * 20, 0),
      id: `item-${i}`,
      frameId: i % 10 === 0 ? null : `item-${i - (i % 10)}`,
      locked: i % 19 === 0 && i % 10 !== 0,
      content: '<p>Project plan and performance notes</p>'.repeat(20),
    }));
    const frames = items.filter((item) => item.type === 'frame');
    const beforeLocks = () => new Set(frames.filter((frame) => movementLocked(frame, items)).map((frame) => frame.id));
    const afterLocks = () => getFrameMovementLockedIds(items);
    const beforeSearch = () => referenceSearch(items, 'project');
    const afterSearch = () => getBoardSearchResult(items, 'project');
    assert.deepEqual(afterLocks(), beforeLocks());
    assert.deepEqual(afterSearch(), beforeSearch());
    console.log(
      JSON.stringify({
        items: count,
        frames: frames.length,
        locks: { before: measure(beforeLocks), after: measure(afterLocks) },
        search: { before: measure(beforeSearch), after: measure(afterSearch) },
      }),
    );
  }
} finally {
  await server.close();
}
