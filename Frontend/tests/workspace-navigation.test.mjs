import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { act, createElement, useState } from 'react';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const key of [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'localStorage',
  'ResizeObserver',
  'MutationObserver',
])
  globalThis[key] = key === 'window' ? browser : browser[key];
globalThis.requestAnimationFrame = browser.requestAnimationFrame.bind(browser);
globalThis.cancelAnimationFrame = browser.cancelAnimationFrame.bind(browser);
globalThis.getComputedStyle = browser.getComputedStyle.bind(browser);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({
  configFile: false,
  define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('mock') },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { useWorkspaceHistory } = await server.ssrLoadModule('/src/features/board/hooks/useWorkspaceHistory.ts');
const { upgradeDefaultPalette, newPreferences } = await server.ssrLoadModule(
  '/src/features/appearance/appearanceModel.ts',
);
const { ThemeProvider } = await server.ssrLoadModule('/src/app/providers/ThemeProvider.tsx');
const { default: ReadOnlyBoard } = await server.ssrLoadModule('/src/features/projects/components/ReadOnlyBoard.tsx');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');

const location = (projectId, boardId) => ({ projectId, boardId, trail: [] });
test('Mouse 4/5 restore projects and boards, branch history, handle denied visits and clean up', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  let select;
  const visits = [];
  const errors = [];
  let denied = false;
  const go = [];
  const originalGo = window.history.go;
  window.history.go = (delta) => go.push(delta);
  const states = [];
  function Harness() {
    const [current, setCurrent] = useState(location('p1', 'main'));
    select = setCurrent;
    useWorkspaceHistory(
      current,
      async (next) => {
        if (denied) throw new Error('Forbidden');
        visits.push(next);
        setCurrent(next);
      },
      () => errors.push('failed'),
    );
    return null;
  }
  const mouse = async (button) => {
    const event = new MouseEvent('mouseup', { button, bubbles: true, cancelable: true });
    await act(() => window.dispatchEvent(event));
    assert.equal(event.defaultPrevented, true);
  };
  const pop = async (state) => act(async () => window.dispatchEvent(new browser.PopStateEvent('popstate', { state })));
  try {
    await act(() => root.render(createElement(Harness)));
    states.push(window.history.state);
    await mouse(3);
    assert.deepEqual(go, []);
    await act(() => select(location('p1', 'child')));
    states.push(window.history.state);
    await act(() => select(location('p2', 'main2')));
    states.push(window.history.state);
    await mouse(3);
    assert.deepEqual(go, [-1]);
    await pop(states[1]);
    assert.deepEqual(visits.at(-1), location('p1', 'child'));
    await mouse(4);
    assert.equal(go.at(-1), 1);
    await pop(states[2]);
    assert.deepEqual(visits.at(-1), location('p2', 'main2'));
    denied = true;
    await pop(states[1]);
    assert.equal(errors.length, 1);
    assert.equal(go.at(-1), 1);
    await pop(states[2]);
    denied = false;
    await pop(states[1]);
    await act(() => select(location('p3', 'branch')));
    const count = go.length;
    await mouse(4);
    assert.equal(go.length, count);
    await act(() => root.unmount());
    const event = new MouseEvent('mouseup', { button: 3, cancelable: true });
    window.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false);
  } finally {
    window.history.go = originalGo;
    host.remove();
  }
});

test('old dark defaults upgrade globally and per project while custom colors and gradients survive', () => {
  const previous = newPreferences();
  previous.paletteVersion = 2;
  previous.defaults.dark.canvas = '#0b0b0c';
  previous.defaults.dark.default = '#18181b';
  previous.projects.old = structuredClone(previous.defaults);
  previous.projects.custom = structuredClone(previous.defaults);
  previous.projects.custom.dark.canvas = '#123456';
  previous.projects.custom.dark.gradients.default = { from: '#000000', to: '#ffffff', kind: 'linear', angle: 45 };
  const next = upgradeDefaultPalette(previous);
  assert.equal(next.defaults.dark.canvas, '#1F1F22');
  assert.equal(next.defaults.dark.default, '#25252A');
  assert.equal(next.projects.old.dark.canvas, '#1F1F22');
  assert.equal(next.projects.old.dark.default, '#25252A');
  assert.equal(next.projects.custom.dark.canvas, '#123456');
  assert.deepEqual(next.projects.custom.dark.gradients, previous.projects.custom.dark.gradients);
  assert.equal(previous.defaults.dark.canvas, '#0b0b0c');
  assert.equal(next.paletteVersion, 3);
  assert.deepEqual(upgradeDefaultPalette(next), next);
});

test('viewers can open and close a file preview by mouse and keyboard without file editing controls', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const file = {
    ...createCanvasItem('file', 0, 0),
    source: 'library:project:asset',
    fileName: 'readme.txt',
    contentType: 'text/plain',
    size: 12,
  };
  try {
    await act(async () =>
      root.render(createElement(ThemeProvider, null, createElement(ReadOnlyBoard, { items: [file] }))),
    );
    for (const kind of ['click', 'keydown']) {
      const body = host.querySelector('.file-block-body');
      assert.ok(body);
      assert.equal(host.querySelector('.file-block-change'), null);
      await act(async () =>
        body.dispatchEvent(
          kind === 'click'
            ? new MouseEvent('click', { bubbles: true })
            : new browser.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        ),
      );
      const dialog = document.querySelector('dialog[aria-label="File preview"]');
      assert.ok(dialog);
      const close = dialog.querySelector('button[aria-label="Close"]');
      assert.ok(close);
      await act(async () => close.dispatchEvent(new MouseEvent('click', { bubbles: true })));
      assert.equal(document.querySelector('dialog[aria-label="File preview"]'), null);
    }
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});
