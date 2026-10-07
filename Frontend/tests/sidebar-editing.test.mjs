import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import jsQR from 'jsqr';
import { Window } from 'happy-dom';
import { createElement, act } from 'react';
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
  'PointerEvent',
  'KeyboardEvent',
])
  globalThis[name] = name === 'window' ? browser : browser[name];
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
const { default: Sidebar } = await server.ssrLoadModule('/src/layout/sidebar/Sidebar.tsx');
const { default: Modal } = await server.ssrLoadModule('/src/shared/components/dialogs/Modal.tsx');
const { default: KanbanColumnDialog } = await server.ssrLoadModule(
  '/src/features/blocks/kanban/KanbanColumnDialog.tsx',
);
const { default: ContentBlockShell } = await server.ssrLoadModule('/src/features/blocks/shared/ContentBlockShell.tsx');
const { default: AuthenticatorSetup } = await server.ssrLoadModule(
  '/src/features/auth/components/AuthenticatorSetup.tsx',
);
const { normalizeSidebarWidth } = await server.ssrLoadModule('/src/features/appearance/appearanceModel.ts');
await server.close();

async function mount(component) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(ThemeProvider, null, component)));
  return async () => {
    await act(async () => root.unmount());
    host.remove();
  };
}

const fire = async (target, event) => act(async () => target.dispatchEvent(event));

test('sidebar exposes its default, supports keyboard resizing, clamps limits and resets', async () => {
  const cleanup = await mount(createElement(Sidebar, { selectedTool: 'select', onSelectTool() {} }));
  try {
    const separator = document.querySelector('[role="separator"]');
    assert.equal(separator.getAttribute('aria-valuenow'), '235');
    await fire(separator, new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    assert.equal(document.querySelector('aside.tool-sidebar').style.width, '243px');
    for (let i = 0; i < 40; i++)
      await fire(separator, new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    assert.equal(separator.getAttribute('aria-valuenow'), '160');
    await fire(separator, new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    assert.equal(separator.getAttribute('aria-valuenow'), '235');
    assert.equal(normalizeSidebarWidth(Infinity), 235);
    assert.equal(normalizeSidebarWidth(-1), 160);
    assert.equal(normalizeSidebarWidth(999), 400);
  } finally {
    await cleanup();
  }
});

test('sidebar pointer dragging updates width and cancellation restores saved width', async () => {
  const cleanup = await mount(createElement(Sidebar, { selectedTool: 'select', onSelectTool() {} }));
  try {
    const separator = document.querySelector('[role="separator"]');
    let captured = false;
    separator.setPointerCapture = () => {
      captured = true;
    };
    separator.hasPointerCapture = () => captured;
    separator.releasePointerCapture = () => {
      captured = false;
    };
    await fire(separator, new PointerEvent('pointerdown', { button: 0, pointerId: 1, bubbles: true }));
    await fire(separator, new PointerEvent('pointermove', { clientX: 320, pointerId: 1, bubbles: true }));
    assert.equal(separator.getAttribute('aria-valuenow'), '320');
    await fire(separator, new PointerEvent('pointerup', { clientX: 320, pointerId: 1, bubbles: true }));
    assert.equal(separator.getAttribute('aria-valuenow'), '320');
    await fire(separator, new PointerEvent('pointerdown', { button: 0, pointerId: 2, bubbles: true }));
    await fire(separator, new PointerEvent('pointermove', { clientX: 400, pointerId: 2, bubbles: true }));
    assert.equal(separator.getAttribute('aria-valuenow'), '400');
    await fire(separator, new PointerEvent('pointercancel', { pointerId: 2, bubbles: true }));
    assert.equal(separator.getAttribute('aria-valuenow'), '320');
  } finally {
    await cleanup();
  }
});

test('editor modal closes on backdrop and keeps inside clicks in editing mode', async () => {
  let closed = 0;
  const cleanup = await mount(
    createElement(
      Modal,
      { centered: true, closeOnBackdrop: true, onClose: () => closed++ },
      createElement('div', { id: 'editor-content' }, 'Draft saved'),
    ),
  );
  try {
    await fire(document.querySelector('#editor-content'), new MouseEvent('click', { bubbles: true }));
    assert.equal(closed, 0);
    await fire(document.querySelector('dialog'), new MouseEvent('click', { bubbles: true }));
    assert.equal(closed, 1);
  } finally {
    await cleanup();
  }
});

test('outside-block completion ignores input and nested dialogs', async () => {
  let completed = 0;
  const item = { id: 'block', type: 'timeline', x: 0, y: 0, width: 400, height: 200, color: '#ffffff' };
  const cleanup = await mount(
    createElement(
      ContentBlockShell,
      { item, title: 'Timeline', onDelete() {}, onOutsideClick: () => completed++ },
      createElement('input', { id: 'block-input' }),
    ),
  );
  const nested = document.createElement('div');
  nested.setAttribute('role', 'dialog');
  document.body.append(nested);
  try {
    await fire(document.querySelector('#block-input'), new PointerEvent('pointerdown', { bubbles: true }));
    await fire(nested, new PointerEvent('pointerdown', { bubbles: true }));
    assert.equal(completed, 0);
    await fire(document.body, new PointerEvent('pointerdown', { bubbles: true }));
    assert.equal(completed, 1);
  } finally {
    nested.remove();
    await cleanup();
  }
});

test('Kanban column backdrop commits a valid draft through its save handler', async () => {
  const saved = [];
  const cleanup = await mount(
    createElement(KanbanColumnDialog, {
      column: { id: 'column', title: 'Draft title', color: '#abcdef' },
      share: 0.5,
      singleColumn: false,
      onSave: (value) => saved.push(value),
      onClose() {},
    }),
  );
  try {
    const dialog = document.querySelector('[role="dialog"]');
    await fire(dialog, new MouseEvent('click', { bubbles: true }));
    assert.equal(saved.length, 0);
    await fire(dialog.parentElement, new MouseEvent('click', { bubbles: true }));
    assert.deepEqual(saved, [{ title: 'Draft title', color: '#abcdef', share: 0.5 }]);
  } finally {
    await cleanup();
  }
});

test('authenticator QR scans to the exact provisioning URI and retains manual setup', async () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const uri = `otpauth://totp/${encodeURIComponent('NodexMesh:person+phone@example.com')}?secret=${secret}&issuer=NodexMesh&algorithm=SHA1&digits=6&period=30`;
  const cleanup = await mount(createElement(AuthenticatorSetup, { secret, uri }));
  try {
    const svg = document.querySelector('svg[aria-label="Authenticator setup QR code"]');
    assert.ok(svg);
    assert.equal(svg.getAttribute('width'), '240');
    const modules = Number(svg.getAttribute('viewBox').split(' ')[2]);
    const scale = 8;
    const size = modules * scale;
    const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
    const path = svg.querySelector('path[fill="#000000"]').getAttribute('d');
    // Rasterize the SVG's horizontal module runs, then scan with an independent decoder.
    const runs = [...path.matchAll(/M(\d+)[ ,](\d+)\s*h(\d+)v1H\d+z/g)];
    assert.ok(runs.length > 0);
    for (const run of runs) {
      const x = Number(run[1]) * scale;
      const y = Number(run[2]) * scale;
      const width = Number(run[3]) * scale;
      for (let row = y; row < y + scale; row++) {
        for (let column = x; column < x + width; column++) {
          const offset = (row * size + column) * 4;
          pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0;
        }
      }
    }
    const decoded = jsQR(pixels, size, size);
    assert.ok(decoded, 'the displayed QR must be scannable');
    assert.equal(decoded.data, uri);
    assert.equal(document.querySelector('code').textContent, secret);
    assert.equal(document.querySelector('a').getAttribute('href'), uri);
    assert.equal(document.querySelectorAll('img').length, 0);
  } finally {
    await cleanup();
  }
});

test('manual authenticator setup remains available when the server supplies no URI', async () => {
  const cleanup = await mount(createElement(AuthenticatorSetup, { secret: 'MANUAL-SECRET' }));
  try {
    assert.equal(document.querySelector('code').textContent, 'MANUAL-SECRET');
    assert.equal(document.querySelector('svg'), null);
    assert.equal(document.querySelector('a'), null);
  } finally {
    await cleanup();
  }
});

test('desktop sidebar collapses to accessible icons and restores saved width', async () => {
  const cleanup = await mount(createElement(Sidebar, { selectedTool: 'select', onSelectTool() {} }));
  try {
    const width = document.querySelector('aside.tool-sidebar').style.width;
    await fire(document.querySelector('[aria-label="Collapse sidebar"]'), new MouseEvent('click', { bubbles: true }));
    assert.equal(document.querySelector('aside.tool-sidebar').style.width, '76px');
    assert.equal(document.querySelector('[aria-label="Resize sidebar"]'), null);
    const documentTool = document.querySelector('[data-tool="document"]');
    assert.equal(documentTool.getAttribute('aria-label'), 'Document');
    assert.ok(documentTool.title.includes('drag'));
    await fire(document.querySelector('[aria-label="Expand sidebar"]'), new MouseEvent('click', { bubbles: true }));
    assert.equal(document.querySelector('aside.tool-sidebar').style.width, width);
  } finally {
    await cleanup();
  }
});

test('auto-fit rounds natural document height up to the grid and shrinks after content removal', async () => {
  const previousObserver = globalThis.ResizeObserver;
  const previousHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
  let naturalHeight = 259;
  let resized;
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, get: () => naturalHeight });
  globalThis.ResizeObserver = class {
    constructor(callback) {
      resized = callback;
    }
    observe() {}
    disconnect() {}
  };
  const cleanup = await mount(
    createElement(
      ContentBlockShell,
      { item: { id: 'document', width: 480 }, title: 'Document', autoHeight: true, minHeight: 240, onDelete() {} },
      'Body',
    ),
  );
  try {
    assert.equal(document.querySelector('.content-block-shell').style.height, '272px');
    naturalHeight = 242;
    await act(async () => resized());
    assert.equal(document.querySelector('.content-block-shell').style.height, '256px');
  } finally {
    await cleanup();
    globalThis.ResizeObserver = previousObserver;
    if (previousHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', previousHeight);
    else delete HTMLElement.prototype.offsetHeight;
  }
});

test('mobile tools retain labels and full width without a collapse control', async () => {
  const previousMatchMedia = window.matchMedia;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  const cleanup = await mount(createElement(Sidebar, { selectedTool: 'select', onSelectTool() {} }));
  try {
    await fire(document.querySelector('.mobile-panel-trigger-tools'), new MouseEvent('click', { bubbles: true }));
    const sidebar = document.querySelector('aside.tool-sidebar');
    assert.equal(sidebar.dataset.collapsed, 'false');
    assert.equal(sidebar.style.width, '');
    assert.equal(document.querySelector('[aria-label="Collapse sidebar"]'), null);
    assert.equal(document.querySelector('[aria-label="Resize sidebar"]'), null);
    assert.ok(document.querySelector('[data-tool="document"]').textContent.includes('Document'));
  } finally {
    await cleanup();
    window.matchMedia = previousMatchMedia;
  }
});
