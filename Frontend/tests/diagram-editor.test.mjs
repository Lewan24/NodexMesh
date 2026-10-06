import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement, act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createServer } from 'vite';

const browser = new Window({ width: 1440, height: 1000, url: 'http://localhost' });
for (const name of [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'MouseEvent',
  'ResizeObserver',
  'DOMMatrixReadOnly',
]) {
  globalThis[name] = name === 'window' ? browser : browser[name];
}
globalThis.requestAnimationFrame = browser.requestAnimationFrame.bind(browser);
globalThis.cancelAnimationFrame = browser.cancelAnimationFrame.bind(browser);
globalThis.getComputedStyle = browser.getComputedStyle.bind(browser);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const server = await createServer({
  configFile: false,
  define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('mock') },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { ThemeProvider } = await server.ssrLoadModule('/src/app/providers/ThemeProvider.tsx');
const { default: DiagramBlock } = await server.ssrLoadModule('/src/features/blocks/diagram/DiagramBlock.tsx');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
await server.close();

test('creating a diagram, styling a connection and reopening retains saved settings in preview and editor', async () => {
  let saved = createCanvasItem('diagram', 0, 0);
  function Harness() {
    const [item, setItem] = useState(saved);
    return createElement(DiagramBlock, {
      item,
      onDelete() {},
      onUpdate(update) {
        setItem((current) => {
          saved = update(current);
          return saved;
        });
      },
    });
  }
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const click = async (element) => act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  const button = (text) =>
    [...document.querySelectorAll('button')].find((element) => element.textContent.trim() === text);
  try {
    await act(async () => root.render(createElement(ThemeProvider, null, createElement(Harness))));
    await click(button('Start with request flow'));
    assert.equal(saved.nodes.length, 6);
    assert.equal(saved.edges.length, 5);
    assert.ok(document.querySelector('[role="dialog"]'));
    await click(document.querySelector(`[data-id="${saved.nodes[1].id}"]`));
    await click(
      [...document.querySelectorAll('button')].find(
        (element) => element.textContent.includes('Process request') && element.textContent.includes('Yes'),
      ),
    );
    assert.ok(document.querySelector('[aria-label="Connection color"]'));
    const pattern = document.querySelector('[aria-label="Connection line pattern"]');
    await act(async () => {
      pattern.value = 'dashed';
      pattern.dispatchEvent(new browser.Event('change', { bubbles: true }));
    });
    const arrow = [...document.querySelectorAll('input[type="checkbox"]')].find((element) =>
      element.parentElement.textContent.includes('Show arrow'),
    );
    await click(arrow);
    const connection = saved.edges.find((edge) => edge.label === 'Yes');
    assert.equal(connection.lineStyle, 'dashed');
    assert.equal(connection.arrow, false);
    assert.equal(connection.color, '#0f766e');
    await click(button('Done editing'));
    assert.equal(document.querySelector('[role="dialog"]'), null);
    const preview = document.querySelector('svg[aria-label="Diagram preview"]');
    assert.ok(preview.querySelector('path[stroke="#0f766e"][stroke-dasharray="10 6"]'));
    assert.equal(preview.querySelector('path[stroke="#0f766e"]').hasAttribute('marker-end'), false);
    await click(button('Edit diagram'));
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.equal(saved.edges.find((edge) => edge.label === 'Yes').lineStyle, 'dashed');
  } finally {
    await act(async () => root.unmount());
    host.remove();
    await browser.happyDOM.close();
  }
});
