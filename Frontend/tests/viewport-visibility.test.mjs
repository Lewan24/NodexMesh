import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { act, createElement } from 'react';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event'])
  globalThis[key] = key === 'window' ? browser : browser[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-viewport-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
const { isCanvasItemVisible } = await server.ssrLoadModule('/src/features/canvas/utils/viewportVisibility.ts');
const { useCanvasMeasurements } = await server.ssrLoadModule('/src/features/canvas/hooks/useCanvasMeasurements.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const viewport = { pan: { x: 0, y: 0 }, zoom: 1, width: 1000, height: 600 };
const fixedNote = { ...createCanvasItem('note', 3000, 0), height: 170 };
const empty = new Map();
const none = new Set();

test('viewport culling converts screen overscan through pan/zoom and keeps edge intersections', () => {
  const visible = (item, camera = viewport) => isCanvasItemVisible(item, camera, empty, empty, none);
  assert.equal(visible(fixedNote), false);
  assert.equal(visible({ ...fixedNote, x: 1319 }), true);
  assert.equal(visible({ ...fixedNote, x: 1321 }), false);
  assert.equal(visible({ ...fixedNote, x: -fixedNote.width - 320 }), true);
  assert.equal(visible(fixedNote, { ...viewport, pan: { x: -3000, y: 0 } }), true);
  assert.equal(visible(fixedNote, { ...viewport, zoom: 0.25 }), true);
  assert.equal(visible(fixedNote, { ...viewport, width: 0 }), true);
  assert.equal(visible(fixedNote, { ...viewport, zoom: NaN }), true);
});

test('activity retention, custom CSS, curves and stateful blocks take precedence over culling', () => {
  assert.equal(isCanvasItemVisible(fixedNote, viewport, empty, empty, new Set([fixedNote.id])), true);
  assert.equal(
    isCanvasItemVisible(
      { ...fixedNote, customCss: { enabled: true, source: 'opacity: .9;' } },
      viewport,
      empty,
      empty,
      none,
    ),
    true,
  );
  for (const type of [
    'line',
    'frame',
    'document',
    'code',
    'diagram',
    'mindmap',
    'database',
    'column',
    'checklist',
    'kanban',
    'section-title',
  ]) {
    const item = createCanvasItem(type, 10000, 10000);
    assert.equal(isCanvasItemVisible(item, viewport, empty, empty, none), true, type);
  }
});

test('unknown and changed auto-sized items are measured before culling; cached dimensions remain conservative', () => {
  const item = { ...fixedNote, height: undefined };
  assert.equal(isCanvasItemVisible(item, viewport, empty, empty, none), true);
  const sizes = new Map([[item.id, { width: 220, height: 170 }]]);
  const measured = new Map([[item.id, item]]);
  assert.equal(isCanvasItemVisible(item, viewport, sizes, measured, none), false);
  assert.equal(isCanvasItemVisible({ ...item, content: 'New remote content' }, viewport, sizes, measured, none), true);
  const tall = { ...item, x: 0, y: -1500 };
  assert.equal(
    isCanvasItemVisible(
      tall,
      viewport,
      new Map([[item.id, { width: 220, height: 2000 }]]),
      new Map([[item.id, tall]]),
      none,
    ),
    true,
  );
  assert.equal(
    isCanvasItemVisible(
      { ...fixedNote, x: -500 },
      viewport,
      new Map([[fixedNote.id, { width: 1, height: 1 }]]),
      empty,
      none,
    ),
    true,
  );
});

test('measurements publish fresh source identities even at unchanged size and prune deleted items', async () => {
  const frames = new Map();
  let frameId = 0;
  const original = {
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++frameId, callback);
    return frameId;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  const root = createRoot(document.createElement('div'));
  let measurements;
  const first = { ...fixedNote, height: undefined };
  const projectRef = { current: { items: [first] } };
  const suppressAutoLayout = { current: false };
  const updates = [];
  const onUpdateItem = (...args) => updates.push(args);
  function Harness() {
    measurements = useCanvasMeasurements({
      items: projectRef.current.items,
      projectRef,
      suppressAutoLayout,
      onUpdateItem,
    });
    return null;
  }
  const publish = async () =>
    act(async () => {
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback();
    });
  try {
    await act(async () => root.render(createElement(Harness)));
    measurements.handleItemResize(first.id, 220, 170);
    await publish();
    assert.equal(measurements.measuredItems.get(first.id), first);
    const changed = { ...first, content: 'A changed remote note with the same dimensions' };
    projectRef.current.items = [changed];
    await act(async () => root.render(createElement(Harness)));
    measurements.handleItemResize(first.id, 220, 170);
    await publish();
    assert.equal(measurements.measuredItems.get(first.id), changed);
    assert.equal(updates.length, 0);
    projectRef.current.items = [];
    await act(async () => root.render(createElement(Harness)));
    await publish();
    assert.equal(measurements.measuredItems.size, 0);
    assert.equal(measurements.measuredSizes.size, 0);
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, original);
  }
});

test('overflow observation batches layout reads across items and ignores its own attribute writes', async () => {
  const { observeWheelOverflow } = await server.ssrLoadModule('/src/features/canvas/utils/wheelOverflow.ts');
  const saved = Object.fromEntries(
    ['requestAnimationFrame', 'cancelAnimationFrame', 'ResizeObserver', 'MutationObserver', 'getComputedStyle'].map(
      (key) => [key, globalThis[key]],
    ),
  );
  const frames = new Map();
  const resizeCallbacks = [];
  const mutationCallbacks = [];
  const operations = [];
  let frameId = 0;
  globalThis.requestAnimationFrame = (callback) => {
    frames.set(++frameId, callback);
    return frameId;
  };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  globalThis.ResizeObserver = class {
    constructor(callback) {
      resizeCallbacks.push(callback);
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  globalThis.MutationObserver = class {
    constructor(callback) {
      mutationCallbacks.push(callback);
    }
    observe() {}
    disconnect() {}
  };
  globalThis.getComputedStyle = (element) => {
    operations.push(`read-${element.id}`);
    return { overflowY: 'auto', overflowX: 'hidden' };
  };
  const scroll = (id) => ({
    id,
    children: [],
    scrollHeight: 100,
    clientHeight: 100,
    scrollWidth: 100,
    clientWidth: 100,
    dataset: new Proxy(
      { wheelScroll: 'true' },
      {
        set(target, key, value) {
          operations.push(`write-${id}`);
          target[key] = value;
          return true;
        },
      },
    ),
  });
  const one = scroll('one');
  const two = scroll('two');
  const stops = [];
  try {
    stops.push(observeWheelOverflow({ querySelectorAll: () => [one] }));
    stops.push(observeWheelOverflow({ querySelectorAll: () => [two] }));
    resizeCallbacks[0]();
    resizeCallbacks[0]();
    resizeCallbacks[1]();
    assert.equal(operations.length, 0);
    assert.equal(frames.size, 1);
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback();
    assert.deepEqual(operations, ['read-one', 'read-two', 'write-one', 'write-two']);
    mutationCallbacks[0]([{ type: 'attributes', attributeName: 'data-wheel-scroll', target: one }]);
    assert.equal(frames.size, 0);
    one.dataset.wheelScroll = 'true';
    mutationCallbacks[0]([{ type: 'attributes', attributeName: 'data-wheel-scroll', target: one }]);
    assert.equal(frames.size, 1);
  } finally {
    for (const stop of stops) stop();
    assert.equal(frames.size, 0);
    for (const callback of resizeCallbacks) callback();
    assert.equal(frames.size, 0);
    Object.assign(globalThis, saved);
  }
});
