import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const { attachCanvasTouch } = await server.ssrLoadModule('/src/features/canvas/hooks/useCanvasTouch.ts');
const { useLineDrag } = await server.ssrLoadModule('/src/features/canvas/hooks/useLineDrag.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
await server.close();

class TouchSurface extends EventTarget {
  attributes = new Map();
  isConnected = true;
  scrollLeft = 0;
  scrollTop = 0;
  scrollWidth = 500;
  scrollHeight = 500;
  clientWidth = 100;
  clientHeight = 100;
  scrollable = false;
  handle = false;

  closest(selector) {
    if (selector.includes('[data-touch-drag]') && this.handle) return this;
    if (selector.includes('[data-wheel-scroll="true"]') && this.scrollable) return this;
    return selector === '[data-board-item]' ? this : null;
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  getBoundingClientRect() {
    return { left: 0, top: 0 };
  }
}

function setup(t, locked = false) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const original = {
    Element: globalThis.Element,
    MouseEvent: globalThis.MouseEvent,
    window: globalThis.window,
    document: globalThis.document,
  };
  globalThis.Element = TouchSurface;
  globalThis.MouseEvent = class extends Event {
    constructor(type, options) {
      super(type, options);
      for (const key of ['clientX', 'clientY', 'button', 'buttons', 'shiftKey']) this[key] = options[key];
    }
  };
  globalThis.window = new EventTarget();
  const frames = new Map();
  let nextFrame = 0;
  window.requestAnimationFrame = (callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  const renderFrame = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    for (const callback of callbacks) callback();
  };
  globalThis.document = new EventTarget();

  const surface = new TouchSurface();
  surface.setAttribute('data-movement-locked', String(locked));
  const mouseEvents = [];
  for (const type of ['mousedown', 'click', 'dblclick']) surface.addEventListener(type, () => mouseEvents.push(type));
  for (const type of ['mousemove', 'mouseup']) document.addEventListener(type, () => mouseEvents.push(type));
  const options = {
    containerRef: { current: surface },
    panRef: { current: { x: 0, y: 0 } },
    zoomRef: { current: 1 },
    selectedTool: 'select',
    selectionMode: false,
    onPanChange: t.mock.fn(),
    onZoomChange: t.mock.fn(),
  };
  const cleanup = attachCanvasTouch({ current: options });
  t.after(() => {
    cleanup();
    Object.assign(globalThis, original);
  });

  const touch = (type, points = [[0, 0]]) => {
    const event = new Event(type, { cancelable: true });
    event.touches = points.map(([clientX, clientY]) => ({ clientX, clientY }));
    surface.dispatchEvent(event);
  };
  return { surface, options, mouseEvents, touch, renderFrame, cleanup, frames };
}

test('quick swipe over a large item pans and cannot become a delayed item drag', (t) => {
  const { touch, options, mouseEvents } = setup(t);
  touch('touchstart');
  touch('touchmove', [[40, 20]]);
  t.mock.timers.tick(500);
  touch('touchmove', [[80, 30]]);
  touch('touchend', []);
  assert.deepEqual(options.panRef.current, { x: 80, y: 30 });
  assert.deepEqual(mouseEvents, []);
});

test('scrollable block content supports scrolling and hold-to-move', (t) => {
  const { touch, surface, options, mouseEvents } = setup(t);
  surface.scrollable = true;
  touch('touchstart', [[80, 80]]);
  touch('touchmove', [[30, 20]]);
  touch('touchend', []);
  assert.equal(surface.scrollLeft, 50);
  assert.equal(surface.scrollTop, 60);
  assert.deepEqual(mouseEvents, []);
  assert.equal(options.onPanChange.mock.callCount(), 0);

  touch('touchstart');
  t.mock.timers.tick(400);
  touch('touchmove', [[30, 20]]);
  touch('touchend', []);
  assert.deepEqual(mouseEvents, ['mousedown', 'mousemove', 'mouseup']);
  assert.equal(surface.scrollTop, 60);
});

test('a scroll container with no overflow still allows panning the board', (t) => {
  const { touch, surface, options } = setup(t);
  surface.scrollable = true;
  surface.scrollWidth = surface.clientWidth;
  surface.scrollHeight = surface.clientHeight;
  touch('touchstart');
  touch('touchmove', [[40, 20]]);
  touch('touchend', []);
  assert.deepEqual(options.panRef.current, { x: 40, y: 20 });
});

test('connection handle tap tolerates finger jitter and releases the mouse pipeline', (t) => {
  const { touch, surface, mouseEvents } = setup(t);
  surface.handle = true;
  touch('touchstart');
  t.mock.timers.tick(500);
  touch('touchmove', [[7, 3]]);
  touch('touchend', []);
  assert.deepEqual(mouseEvents, ['mousedown', 'mouseup', 'click']);
});

test('connection handle drag begins immediately after the touch threshold', (t) => {
  const { touch, surface, mouseEvents } = setup(t);
  surface.handle = true;
  touch('touchstart');
  touch('touchmove', [[25, 0]]);
  touch('touchend', []);
  assert.deepEqual(mouseEvents, ['mousedown', 'mousemove', 'mouseup']);
});

test('tapping a connection handle creates a sibling and attaches the line to it', (t) => {
  const { touch, surface } = setup(t);
  surface.handle = true;
  const source = createCanvasItem('note', 0, 0);
  const projectRef = { current: { items: [source] } };
  let gestures;
  function Harness() {
    gestures = useLineDrag({
      projectRef,
      zoomRef: { current: 1 },
      measuredSizes: new Map(),
      pushHistory() {},
      onAddItem(item) {
        projectRef.current.items.push(item);
      },
      onUpdateItem(id, update) {
        projectRef.current.items = projectRef.current.items.map((item) => (item.id === id ? update(item) : item));
      },
      onDeleteItem(id) {
        projectRef.current.items = projectRef.current.items.filter((item) => item.id !== id);
      },
      onSelectItems() {},
    });
    return null;
  }
  renderToStaticMarkup(createElement(Harness));
  surface.addEventListener('mousedown', (event) => gestures.handleQuickConnectStart(source.id, event, 'right'));
  touch('touchstart');
  touch('touchmove', [[7, 3]]);
  touch('touchend', []);
  const sibling = projectRef.current.items.find((item) => item.type === 'note' && item.id !== source.id);
  const line = projectRef.current.items.find((item) => item.type === 'line');
  assert.ok(sibling);
  assert.equal(line.startItemId, source.id);
  assert.equal(line.endItemId, sibling.id);
});

test('context menu is suppressed during a hold but remains available to the mouse', (t) => {
  const { touch, surface } = setup(t);
  touch('touchstart');
  const heldMenu = new Event('contextmenu', { cancelable: true });
  surface.dispatchEvent(heldMenu);
  assert.equal(heldMenu.defaultPrevented, true);
  touch('touchend', []);
  const mouseMenu = new Event('contextmenu', { cancelable: true });
  surface.dispatchEvent(mouseMenu);
  assert.equal(mouseMenu.defaultPrevented, false);
});

test('holding an unlocked item arms movement and then uses the existing drag pipeline', (t) => {
  const { touch, surface, options, mouseEvents } = setup(t);
  touch('touchstart');
  t.mock.timers.tick(400);
  assert.equal(surface.getAttribute('data-touch-move-ready'), 'true');
  touch('touchmove', [[30, 20]]);
  touch('touchend', []);
  assert.deepEqual(mouseEvents, ['mousedown', 'mousemove', 'mouseup']);
  assert.equal(options.onPanChange.mock.callCount(), 0);
  assert.equal(surface.getAttribute('data-touch-move-ready'), null);
});

test('holding a locked item still pans without starting an item drag', (t) => {
  const { touch, options, mouseEvents } = setup(t, true);
  touch('touchstart');
  t.mock.timers.tick(500);
  touch('touchmove', [[30, 20]]);
  touch('touchend', []);
  assert.deepEqual(options.panRef.current, { x: 30, y: 20 });
  assert.deepEqual(mouseEvents, []);
});

test('pinching cancels the pending hold and preserves camera-only interaction', (t) => {
  const { touch, surface, options, mouseEvents } = setup(t);
  touch('touchstart');
  touch('touchstart', [
    [0, 0],
    [100, 0],
  ]);
  t.mock.timers.tick(500);
  touch('touchmove', [
    [0, 0],
    [150, 0],
  ]);
  touch('touchend', []);
  assert.equal(surface.getAttribute('data-touch-move-ready'), null);
  assert.equal(options.zoomRef.current, 1.5);
  assert.deepEqual(mouseEvents, []);
});

test('a cancelled hold leaves no delayed drag or highlight', (t) => {
  const { touch, surface, mouseEvents } = setup(t);
  touch('touchstart');
  touch('touchcancel', []);
  t.mock.timers.tick(500);
  assert.equal(surface.getAttribute('data-touch-move-ready'), null);
  assert.deepEqual(mouseEvents, []);
});

test('two short taps produce a double-click for explicit editing', (t) => {
  const { touch, mouseEvents } = setup(t);
  touch('touchstart');
  touch('touchend', []);
  assert.deepEqual(mouseEvents, ['mousedown', 'mouseup', 'click']);
  touch('touchstart');
  touch('touchend', []);
  assert.equal(mouseEvents.filter((type) => type === 'dblclick').length, 1);
});

test('releasing a held item cannot open its editor or count as a tap', (t) => {
  const { touch, mouseEvents } = setup(t);
  touch('touchstart');
  touch('touchend', []);
  mouseEvents.length = 0;
  touch('touchstart');
  t.mock.timers.tick(400);
  touch('touchend', []);
  assert.deepEqual(mouseEvents, []);
  touch('touchstart');
  touch('touchend', []);
  assert.deepEqual(mouseEvents, ['mousedown', 'mouseup', 'click']);
});

test('a swipe between taps breaks the double-tap editing sequence', (t) => {
  const { touch, mouseEvents } = setup(t);
  touch('touchstart');
  touch('touchend', []);
  touch('touchstart');
  touch('touchmove', [[30, 10]]);
  touch('touchend', []);
  touch('touchstart');
  touch('touchend', []);
  assert.equal(mouseEvents.includes('dblclick'), false);
});

test('rapid camera moves publish once per frame and flush their final position on release', (t) => {
  const { touch, options, renderFrame } = setup(t);
  touch('touchstart');
  for (let x = 20; x <= 100; x += 20) touch('touchmove', [[x, 30]]);
  assert.equal(options.onPanChange.mock.callCount(), 0);
  renderFrame();
  assert.equal(options.onPanChange.mock.callCount(), 1);
  assert.deepEqual(options.onPanChange.mock.calls[0].arguments[0], { x: 100, y: 30 });
  touch('touchmove', [[120, 40]]);
  touch('touchend', []);
  assert.equal(options.onPanChange.mock.callCount(), 2);
  assert.deepEqual(options.onPanChange.mock.calls[1].arguments[0], { x: 120, y: 40 });
  renderFrame();
  assert.equal(options.onPanChange.mock.callCount(), 2);
});

test('pinch batches pan and zoom together and cancels queued updates on unmount', (t) => {
  const { touch, options, renderFrame, cleanup, frames } = setup(t);
  touch('touchstart', [
    [0, 0],
    [100, 0],
  ]);
  touch('touchmove', [
    [0, 0],
    [150, 0],
  ]);
  touch('touchmove', [
    [0, 0],
    [200, 0],
  ]);
  assert.equal(options.onZoomChange.mock.callCount(), 0);
  renderFrame();
  assert.equal(options.onZoomChange.mock.callCount(), 1);
  assert.equal(options.onZoomChange.mock.calls[0].arguments[0], 2);
  assert.deepEqual(options.onPanChange.mock.calls[0].arguments[0], { x: 0, y: 0 });
  touch('touchmove', [
    [0, 0],
    [250, 0],
  ]);
  cleanup();
  assert.equal(frames.size, 0);
  renderFrame();
  assert.equal(options.onZoomChange.mock.callCount(), 1);
});
