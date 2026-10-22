import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { act, createElement, useState } from 'react';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'localStorage'])
  globalThis[key] = key === 'window' ? browser : browser[key];
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
const { PublicStatusesProvider, ProjectStatusesProvider } = await server.ssrLoadModule(
  '/src/features/statuses/ProjectStatusesContext.tsx',
);
const { default: ItemCssScope } = await server.ssrLoadModule('/src/features/blocks/custom-css/ItemCssScope.tsx');
const { default: EditBar } = await server.ssrLoadModule('/src/features/blocks/editbar/EditBar.tsx');
const { default: ItemStatusSection } = await server.ssrLoadModule('/src/features/statuses/ItemStatusSection.tsx');
const { ThemeProvider } = await server.ssrLoadModule('/src/app/providers/ThemeProvider.tsx');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { flattenItems } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { validItemBorder, itemBorderRule } = await server.ssrLoadModule('/src/features/blocks/border/itemBorder.ts');
const { validateStatuses, validateStatusCss } = await server.ssrLoadModule('/src/features/statuses/statusModel.ts');
const { getBoardSearchResult } = await server.ssrLoadModule('/src/features/search/utils/itemSearch.ts');
const { authService, createWorkspaceServices } = await server.ssrLoadModule('/src/app/services.ts');
const { DEMO_USER_ID } = await server.ssrLoadModule('/src/entities/user/mockUsers.ts');
const id = crypto.randomUUID();
const status = {
  id,
  title: 'Done',
  description: 'Ready to ship',
  customCss: { enabled: true, source: 'border: 2px solid #22c55e;' },
};
const border = {
  width: 3,
  style: 'solid',
  color: '#123456',
  gradient: { from: '#123456', to: '#abcdef', angle: 90 },
  animation: 'pulse',
};
const note = () => ({
  ...createCanvasItem('note', 0, 0),
  content: 'Planning',
  statusId: id,
  customCss: { enabled: true, source: 'font-size: 22px;' },
  border,
});

const click = async (node) => act(async () => node.dispatchEvent(new MouseEvent('click', { bubbles: true })));
test('status CSS is a separate dynamic layer, is not duplicated and disappears without changing item CSS', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const item = note();
  const original = structuredClone(item);
  const render = async (statuses, next = item) =>
    act(() =>
      root.render(
        createElement(
          PublicStatusesProvider,
          { statuses },
          createElement(ItemCssScope, { item: next }, createElement('section', null, 'Content')),
        ),
      ),
    );
  try {
    await render([status]);
    assert.equal(host.querySelectorAll('[data-status-css]').length, 1);
    assert.match(host.textContent, /font-size: 22px/);
    assert.match(host.querySelector('[data-status-css]').textContent, /border: 2px solid #22c55e/);
    await render([status]);
    assert.equal(host.querySelectorAll('[data-status-css]').length, 1);
    await render([{ ...status, customCss: { enabled: true, source: 'color: #ff0000;' } }]);
    assert.match(host.querySelector('[data-status-css]').textContent, /color: #ff0000/);
    assert.doesNotMatch(host.querySelector('[data-status-css]').textContent, /#22c55e/);
    await render([], item);
    assert.equal(host.querySelectorAll('[data-status-css]').length, 0);
    assert.match(host.textContent, /font-size: 22px/);
    assert.deepEqual(item, original);
    const write = flattenItems([item], crypto.randomUUID())[0].item;
    assert.equal(write.appearance.statusId, id);
    assert.deepEqual(write.appearance.border, border);
    assert.equal(write.appearance.customCss.source, 'font-size: 22px;');
    assert.equal(write.data.statusId, undefined);
  } finally {
    await act(() => root.unmount());
    host.remove();
  }
});

test('border data is bounded, rejects injected CSS, preserves geometry and respects reduced motion', () => {
  assert.equal(validItemBorder(border), true);
  for (const invalid of [
    { ...border, width: -1 },
    { ...border, width: 21 },
    { ...border, color: 'red;position:fixed' },
    { ...border, gradient: { ...border.gradient, angle: Infinity } },
    { ...border, style: 'dashed' },
  ])
    assert.equal(validItemBorder(invalid), false);
  assert.equal(itemBorderRule({ ...border, color: 'red;position:fixed' }, 'safe'), '');
  assert.equal(itemBorderRule(border, 'unsafe"] body'), '');
  const css = itemBorderRule(border, 'safe');
  assert.match(css, /position: absolute/);
  assert.match(css, /mask-composite: exclude/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /pointer-events: none/);
});

test('search matches item statuses, descriptions and nested items while preserving comment filters', () => {
  const item = note();
  const column = { ...createCanvasItem('column', 0, 0), items: [item] };
  for (const query of ['status:done', 'item-status:done', 'Ready to ship']) {
    const result = getBoardSearchResult([column], query, [status]);
    assert.equal(result.nestedColumnMatches.get(column.id).has(item.id), true);
    assert.equal(
      result.targets.some((target) => target.item.id === item.id),
      true,
    );
  }
  assert.equal(getBoardSearchResult([item], 'status:unknown', [status]).matchingIds.size, 0);
  assert.equal(getBoardSearchResult([item], 'status:done', []).matchingIds.size, 0);
  const commented = { ...item, comments: [{ id: 'comment', status: 'resolved' }] };
  assert.equal(getBoardSearchResult([commented], 'comment-status:resolved', [status]).matchingIds.has(item.id), true);
});

test('status CSS cannot escape into markup or load resources and definitions have unique titles', () => {
  for (const source of [
    'background:url(https://evil.test);',
    '@import "x";',
    'color:red;</style>',
    'background:u\\72l(x);',
  ])
    assert.throws(() => validateStatusCss(source));
  assert.throws(() => validateStatuses([status, { ...status, id: crypto.randomUUID(), title: ' done ' }]));
  validateStatuses([status]);
});

test('multi-selection border controls apply independent appearance to each selected item', async () => {
  const host = document.createElement('div');
  const root = createRoot(host);
  let items = [createCanvasItem('note', 0, 0), createCanvasItem('note', 100, 100)];
  function Harness() {
    const [state, setState] = useState(items);
    items = state;
    const noop = () => {};
    return createElement(EditBar, {
      selectedItems: state,
      onUpdateItem: (id, update) =>
        setState((previous) => previous.map((item) => (item.id === id ? update(item) : item))),
      onDeleteItems: noop,
      onGroupItems: noop,
      onFitFrame: noop,
      onClose: noop,
      onBringForward: noop,
      onSendBackward: noop,
      onBringToFront: noop,
      onSendToBack: noop,
    });
  }
  try {
    await act(() => root.render(createElement(ThemeProvider, null, createElement(Harness))));
    const appearance = [...host.querySelectorAll('[role="tab"]')].find((button) => button.textContent === 'Appearance');
    assert.ok(appearance);
    await click(appearance);
    await click([...host.querySelectorAll('button')].find((button) => button.textContent === 'Add border'));
    assert.equal(
      items.every((item) => item.border.width === 2),
      true,
    );
    await click(host.querySelector('[aria-label="Remove border"]'));
    assert.equal(
      items.every((item) => item.border === undefined),
      true,
    );
  } finally {
    await act(() => root.unmount());
  }
});

test('inspector bulk status assignment replaces one reference and is disabled for viewers', async () => {
  await authService.login({ username: 'demo', password: 'demo123' });
  const api = createWorkspaceServices(DEMO_USER_ID);
  const snapshot = await api.projects.create({
    id: crypto.randomUUID(),
    name: 'Status test',
    color: '#123456',
    clientMutationId: crypto.randomUUID(),
  });
  await api.statuses.save(snapshot.project.id, snapshot.project.revision, [status]);
  const host = document.createElement('div');
  const root = createRoot(host);
  let items = [note(), { ...note(), id: crypto.randomUUID(), statusId: undefined }];
  function Harness({ readOnly }) {
    const [state, setState] = useState(items);
    items = state;
    return createElement(
      ProjectStatusesProvider,
      { projectId: snapshot.project.id, userId: DEMO_USER_ID, readOnly },
      createElement(ItemStatusSection, {
        items: state,
        readOnly,
        onUpdateAll: (update) => setState((previous) => previous.map(update)),
      }),
    );
  }
  try {
    await act(async () => root.render(createElement(Harness, { readOnly: false })));
    const select = host.querySelector('select');
    assert.equal(select.disabled, false);
    assert.equal(select.value, '__mixed');
    await act(() => {
      select.value = id;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(
      items.every((item) => item.statusId === id),
      true,
    );
    assert.equal(
      items.every((item) => item.customCss.source === 'font-size: 22px;'),
      true,
    );
    await act(() => {
      select.value = '';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    assert.equal(
      items.every((item) => item.statusId === undefined),
      true,
    );
    await act(() => root.render(createElement(Harness, { readOnly: true })));
    assert.equal(host.querySelector('select').disabled, true);
    assert.equal(host.querySelector('[aria-label="Manage project statuses"]'), null);
  } finally {
    await act(() => root.unmount());
  }
});
