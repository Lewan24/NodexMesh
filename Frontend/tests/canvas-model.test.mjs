import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement, act } from 'react';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event']) {
  globalThis[key] = key === 'window' ? browser : browser[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-canvas-model-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { getCanvasLayers, indexCanvasGeometry, resolveCanvasItems } = await server.ssrLoadModule(
  '/src/features/canvas/utils/canvasRenderModel.ts',
);
const { getFrameMovementLockedIds, isFrameMovementLocked } = await server.ssrLoadModule(
  '/src/features/canvas/utils/frameGeometry.ts',
);
const { getBoardSearchResult, getSearchTargets, getColumnSearchResult, matchesItemSearch } = await server.ssrLoadModule(
  '/src/features/search/utils/itemSearch.ts',
);
const { resolveLineItem } = await server.ssrLoadModule('/src/features/canvas/utils/lineGeometry.ts');
const { useCanvasRenderModel } = await server.ssrLoadModule('/src/features/canvas/hooks/useCanvasRenderModel.ts');
const item = (type, id, extra = {}) => ({ ...createCanvasItem(type, 0, 0), id, frameId: null, ...extra });

const { useCanvasCallbacks } = await server.ssrLoadModule('/src/features/canvas/hooks/useCanvasCallbacks.ts');
const { getHeavyPreviewLines, hasPreviewCustomCss, isHeavyPreviewItem } = await server.ssrLoadModule(
  '/src/features/canvas/utils/heavyPreview.ts',
);

test('render layers retain stable paint order and transient connection geometry without mutating persisted items', () => {
  const start = item('note', 'start', { x: 10, y: 20, zIndex: 5 });
  const end = item('note', 'end', { x: 600, y: 400, zIndex: 5 });
  const frame = item('frame', 'frame');
  const line = item('line', 'line', { startItemId: start.id, endItemId: end.id, zIndex: 1 });
  const divider = item('line', 'divider', { divider: true, startItemId: start.id, arrowEnd: true });
  const freeLine = item('line', 'free', { endItemId: 'removed' });
  const items = [start, frame, line, end, divider, freeLine];
  const snapshot = structuredClone(items);
  const layers = getCanvasLayers(items);
  assert.deepEqual(layers.frames, [frame]);
  assert.deepEqual(
    layers.regularItems.map(({ id }) => id),
    ['line', 'divider', 'free', 'start', 'end'],
  );
  const sizes = new Map([
    [start.id, { width: 180, height: 90 }],
    [end.id, { width: 200, height: 160 }],
  ]);
  const overrides = new Map([
    [start.id, { x: 120, y: 180 }],
    [freeLine.id, { x: 20, y: 30, x2: -200, y2: -300 }],
  ]);
  const byId = indexCanvasGeometry(items, overrides);
  const rendered = resolveCanvasItems(layers.regularItems, byId, sizes);
  assert.equal(byId.get(end.id), end);
  assert.notEqual(byId.get(start.id), start);
  assert.deepEqual(rendered.get(line.id), resolveLineItem(line, [...byId.values()], sizes));
  assert.notEqual(rendered.get(line.id).x, resolveLineItem(line, items, sizes).x);
  assert.equal(rendered.get(divider.id).startItemId, undefined);
  assert.equal(rendered.get(divider.id).arrowEnd, false);
  assert.equal(rendered.get(freeLine.id).x2, -200);
  assert.deepEqual(items, snapshot);
});

test('frame locks follow ownership and nested columns, release immediately, and terminate on cyclic/deep input', () => {
  const outer = item('frame', 'outer');
  const inner = item('frame', 'inner', { frameId: outer.id });
  const locked = item('note', 'locked', { locked: true });
  const column = item('column', 'column', {
    frameId: inner.id,
    items: [item('column', 'nested', { items: [locked] })],
  });
  const unrelated = item('frame', 'unrelated', { x: -100, y: -100, width: 10000, height: 10000 });
  assert.deepEqual(getFrameMovementLockedIds([outer, inner, column, unrelated]), new Set(['inner', 'outer']));
  assert.deepEqual(getFrameMovementLockedIds([outer, inner, { ...column, items: [] }, unrelated]), new Set());
  assert.deepEqual(
    getFrameMovementLockedIds([outer, { ...inner, frameId: unrelated.id }, column, unrelated]),
    new Set(['inner', 'unrelated']),
  );
  assert.equal(isFrameMovementLocked(outer, [item('note', 'child', { frameId: outer.id, locked: true })]), true);
  const cycle = [
    { ...outer, frameId: inner.id },
    { ...inner, locked: true },
  ];
  assert.deepEqual(getFrameMovementLockedIds(cycle), new Set(['inner', 'outer']));
  assert.deepEqual(getFrameMovementLockedIds(cycle.map((frame) => ({ ...frame, locked: false }))), new Set());
  const deep = Array.from({ length: 10000 }, (_, i) => ({
    ...outer,
    id: `frame-${i}`,
    frameId: i ? `frame-${i - 1}` : null,
    locked: i === 9999,
  }));
  assert.equal(getFrameMovementLockedIds(deep).size, deep.length);
});

test('indexed locks match recursive ownership semantics across varied acyclic boards', () => {
  const frames = Array.from({ length: 40 }, (_, i) =>
    item('frame', `f-${i}`, { frameId: i && i % 3 ? `f-${Math.floor((i - 1) / 3)}` : null, locked: i % 17 === 0 }),
  );
  const notes = Array.from({ length: 150 }, (_, i) =>
    item('note', `n-${i}`, { frameId: `f-${i % frames.length}`, locked: i % 13 === 0 }),
  );
  const containsLock = (item) => !!item.locked || (item.type === 'column' && item.items.some(containsLock));
  const reference = (frame, items) =>
    !!frame.locked ||
    items
      .filter((item) => item.frameId === frame.id)
      .some((item) => containsLock(item) || (item.type === 'frame' && reference(item, items)));
  const items = [...frames, ...notes];
  const locked = getFrameMovementLockedIds(items);
  for (const frame of frames) assert.equal(locked.has(frame.id), reference(frame, items), frame.id);
});

test('one search result supplies navigation and highlighting with existing tag/status/column semantics', () => {
  const frame = item('frame', 'frame', { title: 'Container' });
  const child = item('note', 'child', { content: 'Needle', tags: ['todo'], comments: [{ status: 'resolved' }] });
  const column = item('column', 'column', { title: 'Needle column', frameId: frame.id, items: [child] });
  const other = item('note', 'other', { content: 'Needle elsewhere', frameId: 'missing' });
  const document = item('document', 'document', {
    title: 'Doc',
    content: '<p>Needle &amp; more</p>',
    frameId: frame.id,
  });
  const items = [frame, column, other, document];
  for (const query of ['', ' ', 'needle', 'NeedLE', ' #todo ', '#', 'status:resolved', 'status:', 'absent']) {
    const result = getBoardSearchResult(items, query);
    assert.deepEqual(result.targets, getSearchTargets(items, query), query);
    for (const entry of items) {
      const expected =
        entry.type === 'column' ? getColumnSearchResult(entry, query).matches : matchesItemSearch(entry, query);
      assert.equal(result.matchingIds.has(entry.id), expected, `${query}:${entry.id}`);
    }
  }
  const result = getBoardSearchResult(items, 'needle');
  assert.deepEqual(
    result.targets.map(({ item }) => item.id),
    ['column', 'child', 'other', 'document'],
  );
  assert.deepEqual(result.nestedColumnMatches.get(column.id), new Set([child.id]));
  assert.deepEqual(result.contextFrameIds, new Set([frame.id]));
  assert.equal(getBoardSearchResult(items, '').contextFrameIds.size, 0);
});

test('camera/drag/measurement rerenders preserve ownership locks and base layer identities', async () => {
  const root = createRoot(document.createElement('div'));
  let model;
  const frame = item('frame', 'frame');
  const note = item('note', 'note', { frameId: frame.id, locked: true });
  const items = [frame, note];
  const sizes = new Map();
  const overrides = new Map();
  function Harness({ items, overrides, sizes }) {
    model = useCanvasRenderModel(items, overrides, sizes);
    return null;
  }
  try {
    const render = (props = {}) =>
      act(async () => root.render(createElement(Harness, { items, overrides, sizes, ...props })));
    await render();
    const initial = model;
    await render();
    assert.equal(model.renderedItems, initial.renderedItems);
    assert.equal(model.lockedFrameIds, initial.lockedFrameIds);
    await render({ overrides: new Map([[frame.id, { x: 40, y: 50 }]]) });
    assert.equal(model.lockedFrameIds, initial.lockedFrameIds);
    assert.equal(model.regularItems, initial.regularItems);
    assert.equal(model.frames[0].x, 40);
    await render({ sizes: new Map([[note.id, { width: 300, height: 170 }]]) });
    assert.equal(model.lockedFrameIds, initial.lockedFrameIds);
    await render({ items: [frame, { ...note, locked: false }] });
    assert.equal(model.lockedFrameIds.has(frame.id), false);
  } finally {
    await act(async () => root.unmount());
  }
});

test('stable canvas event props skip child work while using current geometry and permissions', async () => {
  const { memo } = await import('react');
  const host = document.createElement('div');
  const root = createRoot(host);
  let callbacks;
  let renders = 0;
  const Child = memo(function Child({ actions }) {
    callbacks = actions;
    renders++;
    return null;
  });
  function Harness({ size, locked }) {
    const actions = useCanvasCallbacks({ resize: (value) => (locked ? null : size + value) });
    return createElement(Child, { actions });
  }
  try {
    await act(() => root.render(createElement(Harness, { size: 100, locked: false })));
    const first = callbacks;
    assert.equal(callbacks.resize(20), 120);
    await act(() => root.render(createElement(Harness, { size: 500, locked: false })));
    assert.equal(callbacks, first);
    assert.equal(renders, 1);
    assert.equal(callbacks.resize(20), 520);
    await act(() => root.render(createElement(Harness, { size: 500, locked: true })));
    assert.equal(callbacks.resize(20), null);
    assert.equal(renders, 1);
  } finally {
    await act(() => root.unmount());
  }
});

test('preview eligibility excludes documents and bounds nested summaries and custom styles', () => {
  assert.equal(isHeavyPreviewItem(item('document', 'document')), false);
  const column = item('column', 'column', {
    items: Array.from({ length: 100 }, (_, i) => item('note', `note-${i}`, { content: 'y'.repeat(1000) })),
  });
  assert.equal(getHeavyPreviewLines(column).length, 8);
  assert.equal(getHeavyPreviewLines(column)[0].length, 160);
  assert.equal(hasPreviewCustomCss(column), false);
  column.items[0].customCss = { enabled: true, css: '' };
  assert.equal(hasPreviewCustomCss(column), true);
  const cyclic = item('column', 'cyclic', { items: [] });
  cyclic.items.push(cyclic);
  assert.equal(hasPreviewCustomCss(cyclic), false);
});
