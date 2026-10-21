import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement, act } from 'react';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const name of [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'localStorage',
  'ResizeObserver',
]) {
  globalThis[name] = name === 'window' ? browser : browser[name];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { useBoardView } = await server.ssrLoadModule('/src/features/board/hooks/useBoardView.ts');
const { viewportKey, readViewport } = await server.ssrLoadModule('/src/features/board/hooks/boardViewport.ts');
const { default: Controls } = await server.ssrLoadModule('/src/features/canvas/components/CanvasControls.tsx');
const { default: Fields } = await server.ssrLoadModule('/src/features/blocks/shared/TaskDetailsFields.tsx');
const { useItemResize } = await server.ssrLoadModule('/src/features/canvas/hooks/useItemResize.ts');
await server.close();

test('resize callbacks respect collaboration lock changes with otherwise stable inputs', async () => {
  const root = createRoot(document.createElement('div'));
  let resize;
  let starts = 0;
  const options = {
    projectRef: { current: { items: [{ id: 'note', type: 'note', x: 0, y: 0, width: 220, height: 120 }] } },
    zoomRef: { current: 1 },
    measuredSizes: new Map(),
    snapValue: (value) => value,
    pushHistory() {},
    onUpdateItem() {},
    onResizeStart() {
      starts++;
    },
  };
  function Harness({ lockedIds }) {
    resize = useItemResize({ ...options, collaboratorLockedIds: lockedIds }).handleItemResize;
    return null;
  }
  const event = { button: 0, clientX: 220, clientY: 120, preventDefault() {}, stopPropagation() {} };
  try {
    for (const lockedIds of [new Set(), new Set(['note']), new Set()]) {
      await act(async () => root.render(createElement(Harness, { lockedIds })));
      resize('note', event, 'se');
      document.dispatchEvent(new browser.MouseEvent('mouseup'));
    }
    assert.equal(starts, 2);
  } finally {
    await act(async () => root.unmount());
  }
});

test('restores independent board cameras on navigation, remount, and account changes', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  let view;
  function Harness({ user, project, board }) {
    view = useBoardView(user, project, board);
    return null;
  }
  const render = (user, project, board) =>
    act(async () => root.render(createElement(Harness, { user, project, board })));
  await render('alice', 'project', 'main');
  await act(async () => {
    view.setPan({ x: -920, y: 410 });
    view.setZoom(0.5);
  });
  await render('alice', 'project', 'nested');
  assert.deepEqual(view.pan, { x: 0, y: 0 });
  await act(async () => {
    view.setPan({ x: 123, y: -45 });
    view.setZoom(2);
    view.resetBoardView();
  });
  await render('alice', 'project', 'main');
  assert.deepEqual(view.pan, { x: -920, y: 410 });
  assert.equal(view.zoom, 0.5);
  await render('bob', 'project', 'main');
  assert.equal(view.zoom, 1);
  await render('alice', 'other-project', 'main');
  assert.equal(view.zoom, 1);
  await render('alice', 'project', 'nested');
  assert.equal(view.zoom, 2);
  await act(async () => root.unmount());
  assert.deepEqual(readViewport(viewportKey('alice', 'project', 'nested')), { pan: { x: 123, y: -45 }, zoom: 2 });
});

test('rejects malformed or out-of-range local camera data and tolerates blocked storage', () => {
  const key = viewportKey('alice', 'project', 'main');
  for (const raw of ['{', 'null', '{}', '{"pan":{"x":1e99,"y":0},"zoom":1}', '{"pan":{"x":0,"y":0},"zoom":99}']) {
    localStorage.setItem(key, raw);
    assert.deepEqual(readViewport(key), { pan: { x: 0, y: 0 }, zoom: 1 });
  }
  const storage = globalThis.localStorage;
  globalThis.localStorage = {
    getItem() {
      throw new Error('blocked');
    },
  };
  try {
    assert.equal(readViewport(key).zoom, 1);
  } finally {
    globalThis.localStorage = storage;
  }
});

test('zoom picker selects common percentages without resetting pan', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  const calls = [];
  await act(async () => root.render(createElement(Controls, { zoom: 0.83, onZoomChange: (zoom) => calls.push(zoom) })));
  const select = host.querySelector('select');
  assert.equal(select.value, '0.83');
  assert.ok([...select.options].some((option) => option.textContent === '25%'));
  await act(async () => {
    select.value = '0.25';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.deepEqual(calls, [0.25]);
  await act(async () => root.unmount());
});

test('task title and description are multiline and resize to loaded content', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  const draft = { id: 'task', text: 'Long title\nsecond line', description: 'Details\nmore details', done: false };
  await act(async () =>
    root.render(createElement(Fields, { draft, patch() {}, disabled: false, onManageCategories() {} })),
  );
  const title = host.querySelector('[name="taskName"]');
  assert.equal(title.tagName, 'TEXTAREA');
  assert.equal(title.value, draft.text);
  Object.defineProperty(title, 'scrollHeight', { configurable: true, value: 200 });
  await act(async () =>
    root.render(
      createElement(Fields, {
        draft: { ...draft, text: draft.text + '\nthird line' },
        patch() {},
        disabled: false,
        onManageCategories() {},
      }),
    ),
  );
  assert.equal(title.style.height, '202px');
  await act(async () => root.unmount());
});
