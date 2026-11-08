import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { Window } from 'happy-dom';
import { createElement, act } from 'react';
import { createRoot } from 'react-dom/client';

const browser = new Window({ url: 'http://localhost' });
for (const name of ['window', 'document', 'Element', 'HTMLElement', 'Node', 'MouseEvent', 'DOMParser', 'XMLSerializer'])
  globalThis[name] = name === 'window' ? browser : browser[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const server = await createServer({
  configFile: false,
  define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('mock') },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { createEmptySibling } = await server.ssrLoadModule('/src/features/canvas/utils/quickCreate.ts');
const { getBoardIcon } = await server.ssrLoadModule('/src/features/blocks/board/boardIcon.ts');
const { itemSchemas } = await server.ssrLoadModule('/src/entities/board/itemSchema.ts');
const { flattenItems } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { hasLibraryMedia, exportProjectJson, importProjectJson } = await server.ssrLoadModule(
  '/src/features/projects/services/projectJson.ts',
);
const { ThemeProvider } = await server.ssrLoadModule('/src/app/providers/ThemeProvider.tsx');
const { LibraryContext } = await server.ssrLoadModule('/src/features/library/LibraryContext.ts');
const { default: IconDialog } = await server.ssrLoadModule('/src/features/blocks/icon/IconDialog.tsx');
const { default: BoardBlock } = await server.ssrLoadModule('/src/features/blocks/board/BoardBlock.tsx');
const identity = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const card = () => ({ ...createCanvasItem('board', 0, 0), id: identity(1) });
const data = (boardIcon) => ({
  boardId: null,
  title: 'Research',
  description: '',
  icon: '',
  ...(boardIcon === undefined ? {} : { boardIcon }),
});
const valid = (boardIcon) => itemSchemas.board.validate(data(boardIcon));

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

test('new boards and empty siblings have no icon; existing dashboard and emoji icons remain compatible', () => {
  const item = card();
  assert.equal(getBoardIcon(item), null);
  assert.equal(
    getBoardIcon(createEmptySibling({ ...item, boardIcon: { iconMode: 'preset', source: 'star', label: 'Star' } })),
    null,
  );
  assert.equal(getBoardIcon({ ...item, icon: 'layout-dashboard' }).iconMode, 'preset');
  assert.equal(getBoardIcon({ ...item, icon: 'Legacy emoji' }).source, 'Legacy emoji');
});

test('board icons persist and archive roundtrip retains private library references', async () => {
  const source = `library://${identity(2)}/${identity(3)}`;
  const boardIcon = { iconMode: 'library', source, label: 'Research', color: '#123456' };
  const item = { ...card(), boardIcon };
  const project = { id: identity(2), name: 'Project', color: '#ffffff', items: [item] };
  assert.deepEqual(flattenItems([item], identity(4))[0].item.data.boardIcon, boardIcon);
  assert.equal(hasLibraryMedia(project), true);
  assert.deepEqual((await importProjectJson(exportProjectJson(project), identity(5))).items[0].boardIcon, boardIcon);
  assert.equal(valid(undefined), true);
  for (const iconMode of ['preset', 'emoji', 'svg', 'url', 'library']) {
    const sources = {
      preset: 'star',
      emoji: 'Hi',
      svg: '<svg viewBox="0 0 24 24"></svg>',
      url: 'https://example.com/icon.png',
      library: source,
    };
    assert.equal(valid({ ...boardIcon, iconMode, source: sources[iconMode] }), true, iconMode);
  }
});

test('board icon validation rejects active URL schemes, credentials, malformed library references and unknown fields', () => {
  for (const patch of [
    { iconMode: 'url', source: 'javascript:alert(1)' },
    { iconMode: 'url', source: 'data:image/svg+xml,<svg/>' },
    { iconMode: 'url', source: 'https://user:pass@example.com/a' },
    { iconMode: 'library', source: 'library://bad' },
    { iconMode: 'svg', source: '<script>alert(1)</script>' },
    { iconMode: 'unknown', source: 'star' },
    { iconMode: 'preset', source: '' },
    { iconMode: 'preset', source: 'star', color: 'red' },
    { iconMode: 'preset', source: 'star', admin: true },
    { iconMode: 'preset', source: 'star', label: 'x'.repeat(201) },
  ])
    assert.equal(valid({ label: 'Test', ...patch }), false, JSON.stringify(patch));
});

test('board CTA opens exactly once, unconnected cards stay disabled and title/description are editable fields', async () => {
  let opened = 0;
  const cleanup = await mount(
    createElement(BoardBlock, {
      item: { ...card(), boardId: identity(2) },
      onUpdate() {},
      onOpenBoard() {
        opened++;
      },
    }),
  );
  try {
    assert.equal(document.querySelectorAll('.board-block-icon').length, 0);
    assert.ok(document.querySelector('textarea[aria-label="Board block title"]'));
    const button = document.querySelector('.board-block-open');
    assert.equal(button.disabled, false);
    await act(async () => {
      button.click();
      button.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    assert.equal(opened, 1);
  } finally {
    await cleanup();
  }
  const cleanupPending = await mount(createElement(BoardBlock, { item: card(), onUpdate() {}, onOpenBoard() {} }));
  try {
    assert.equal(document.querySelector('.board-block-open').disabled, true);
  } finally {
    await cleanupPending();
  }
});

test('library option is below the icon source selector and uses the primary button style', async () => {
  const cleanup = await mount(
    createElement(
      LibraryContext.Provider,
      { value: identity(2) },
      createElement(IconDialog, {
        item: {
          ...createCanvasItem('icon', 0, 0),
          iconMode: 'library',
          source: `library://${identity(2)}/${identity(3)}`,
        },
        onClose() {},
        onSave() {},
      }),
    ),
  );
  try {
    const buttons = [...document.querySelectorAll('button')];
    const library = buttons.find((button) => button.textContent === 'Library');
    const choose = buttons.find((button) => button.textContent === 'Choose from project library');
    assert.ok(library.compareDocumentPosition(choose) & Node.DOCUMENT_POSITION_FOLLOWING);
    assert.equal(choose.classList.contains('btn-accent'), true);
    assert.equal(choose.disabled, false);
  } finally {
    await cleanup();
  }
});
