import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const { attachCanvasTouch } = await server.ssrLoadModule('/src/features/canvas/hooks/useCanvasTouch.ts');
await server.close();

class TouchSurface extends EventTarget {
  attributes = new Map();
  isConnected = true;

  closest(selector) {
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
    }
  };
  globalThis.window = new EventTarget();
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
  return { surface, options, mouseEvents, touch };
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
