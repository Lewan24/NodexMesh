import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { act, createElement, useLayoutEffect } from 'react';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event'])
  globalThis[key] = key === 'window' ? browser : browser[key];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-camera-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
const { cameraNeedsContentRefresh, getGridTransform } = await server.ssrLoadModule(
  '/src/features/canvas/utils/cameraViewport.ts',
);
const { useCanvasCamera } = await server.ssrLoadModule('/src/features/canvas/hooks/useCanvasCamera.ts');
const initial = { pan: { x: 40, y: 40 }, zoom: 1 };
const viewport = { width: 1280, height: 800 };

test('content refreshes before the viewport leaves the culling safety margin or crosses a detail threshold', () => {
  assert.equal(cameraNeedsContentRefresh(initial, { ...initial, pan: { x: 140, y: 40 } }, viewport), false);
  assert.equal(cameraNeedsContentRefresh(initial, { ...initial, pan: { x: 201, y: 40 } }, viewport), true);
  assert.equal(cameraNeedsContentRefresh(initial, { ...initial, pan: { x: 40, y: -121 } }, viewport), true);
  assert.equal(cameraNeedsContentRefresh(initial, { ...initial, zoom: 0.87 }, viewport), true);
  assert.equal(cameraNeedsContentRefresh(initial, { ...initial, zoom: 1.13 }, viewport), true);
  assert.equal(cameraNeedsContentRefresh(initial, initial, { width: 0, height: 0 }), true);
  for (const threshold of [0.2, 0.25]) {
    assert.equal(
      cameraNeedsContentRefresh({ ...initial, zoom: threshold }, { ...initial, zoom: threshold + 0.001 }, viewport),
      true,
    );
  }
  for (const threshold of [0.3, 0.65]) {
    assert.equal(
      cameraNeedsContentRefresh({ ...initial, zoom: threshold }, { ...initial, zoom: threshold - 0.001 }, viewport),
      true,
    );
  }
  for (const zoom of [0.1, 0.2, 0.7, 1, 2, 3]) {
    for (let dx = -300; dx <= 300; dx += 20) {
      for (const ratio of [0.89, 1, 1.11]) {
        const previous = { pan: initial.pan, zoom };
        const next = { pan: { x: 40 + dx, y: 40 - dx }, zoom: zoom * ratio };
        if (cameraNeedsContentRefresh(previous, next, viewport)) continue;
        assert.ok(-next.pan.x / next.zoom >= (-previous.pan.x - 320) / previous.zoom);
        assert.ok(-next.pan.y / next.zoom >= (-previous.pan.y - 320) / previous.zoom);
        assert.ok((viewport.width - next.pan.x) / next.zoom <= (viewport.width - previous.pan.x + 320) / previous.zoom);
        assert.ok(
          (viewport.height - next.pan.y) / next.zoom <= (viewport.height - previous.pan.y + 320) / previous.zoom,
        );
      }
    }
  }
});

test('live presentation survives preupdated gesture refs, settles exactly and cancels pending work on unmount', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let state;
  function Harness({ pan, zoom }) {
    state = useCanvasCamera(pan, zoom);
    const { camera, snapshot } = state;
    useLayoutEffect(() => {
      camera.viewportRef.current = viewport;
      camera.present(snapshot);
    });
    return createElement(
      'div',
      { ref: camera.containerRef },
      createElement('div', { ref: camera.gridRef }),
      createElement(
        'div',
        { ref: camera.sceneRef },
        createElement('button', { 'data-camera-inverse-scale': true }),
        createElement('div', { 'data-camera-title-scale': true }),
      ),
      createElement('div', { 'data-camera-cursor': true, 'data-camera-x': 10, 'data-camera-y': 20 }),
    );
  }
  const render = async (camera) => act(() => root.render(createElement(Harness, camera)));
  try {
    await render(initial);
    const snapshot = state.snapshot;
    state.camera.panRef.current = { x: 60, y: 50 };
    await render({ pan: { x: 60, y: 50 }, zoom: 1 });
    assert.equal(state.snapshot, snapshot);
    assert.equal(state.isNavigating, true);
    assert.equal(state.camera.sceneRef.current.style.transform, 'translate(60px, 50px) scale(1)');
    assert.equal(host.querySelector('[data-camera-cursor]').style.transform, 'translate3d(70px, 70px, 0)');
    await render({ pan: { x: 60, y: 50 }, zoom: 0.99 });
    assert.equal(state.snapshot, snapshot);
    assert.equal(host.querySelector('button').style.transform, `scale(${1 / 0.99})`);
    await act(() => t.mock.timers.tick(120));
    assert.equal(state.isNavigating, false);
    assert.deepEqual(state.snapshot, { pan: { x: 60, y: 50 }, zoom: 0.99 });
    await render({ pan: { x: -5000, y: -4000 }, zoom: 0.5 });
    assert.deepEqual(state.snapshot, { pan: { x: -5000, y: -4000 }, zoom: 0.5 });
    await act(() => root.unmount());
    await act(() => t.mock.timers.tick(120));
  } finally {
    if (host.hasChildNodes()) await act(() => root.unmount());
    host.remove();
    t.mock.timers.reset();
  }
});

test('wrapped grid preserves world alignment and viewport coverage without pan-driven texture changes', () => {
  const padding = 320;
  for (const width of [320, 1280, 3840, 7680]) {
    for (const baseZoom of [0.1, 0.7, 1, 3]) {
      for (const scale of [0.9, 0.99, 1, 1.1]) {
        for (const x of [-4000, -64, 0, 40, 4000]) {
          const previous = { pan: { x, y: 40 }, zoom: baseZoom };
          const next = {
            pan: { x: x * scale + ((1 - scale) * width) / 2, y: 40 * scale + (1 - scale) * 400 },
            zoom: baseZoom * scale,
          };
          if (cameraNeedsContentRefresh(previous, next, { width, height: 800 })) continue;
          const grid = getGridTransform(next, baseZoom, { width, height: 800 });
          const period = 64 * next.zoom;
          for (const [offset, pan, center] of [
            [grid.x, next.pan.x, width / 2],
            [grid.y, next.pan.y, 400],
          ]) {
            const phase = (offset + (1 - grid.scale) * center - pan) / period;
            assert.ok(Math.abs(phase - Math.round(phase)) < 1e-8);
            assert.ok(-grid.scale * padding + (1 - grid.scale) * center + offset <= 1e-8);
            assert.ok(grid.scale * (2 * center + padding) + (1 - grid.scale) * center + offset >= 2 * center - 1e-8);
          }
        }
      }
    }
  }
  const base = getGridTransform({ pan: { x: 40, y: 40 }, zoom: 1 }, 1, viewport);
  for (const tiles of [-1000, -1, 0, 1, 1000]) {
    assert.deepEqual(getGridTransform({ pan: { x: 40 + tiles * 64, y: 40 + tiles * 64 }, zoom: 1 }, 1, viewport), base);
  }
});
