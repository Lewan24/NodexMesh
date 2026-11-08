import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const browser = new Window();
globalThis.Element = browser.Element;
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
const { expandGroupSelection, isSingleGroup } = await server.ssrLoadModule('/src/features/canvas/utils/itemGroups.ts');
const { cloneItems } = await server.ssrLoadModule('/src/features/canvas/utils/cloneItems.ts');
const { flattenItems, toProjectView, renewProjectIds } = await server.ssrLoadModule(
  '/src/features/projects/services/boardAdapter.ts',
);
const { exportProjectJson, importProjectJson } = await server.ssrLoadModule(
  '/src/features/projects/services/projectJson.ts',
);
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { installSpacePan } = await server.ssrLoadModule('/src/features/canvas/hooks/useSpacePan.ts');
const { default: ItemTodo, TodoDisplayContext } = await server.ssrLoadModule(
  '/src/features/blocks/shared/ItemTodo.tsx',
);
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const uuid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const note = (n, extra = {}) => ({ ...createCanvasItem('note', 16 * n, 32), id: uuid(n), ...extra });

test('logical groups select all siblings, independently of spatial frame membership', () => {
  const items = [note(1, { groupId: uuid(10), frameId: uuid(20) }), note(2, { groupId: uuid(10) }), note(3)];
  assert.deepEqual(expandGroupSelection(items, [uuid(2)]), [uuid(2), uuid(1)]);
  assert.deepEqual(expandGroupSelection(items, []), []);
  assert.ok(isSingleGroup(items.slice(0, 2)));
  assert.equal(isSingleGroup(items), false);
});

test('copying and importing renew group identities without joining the originals', () => {
  const items = [note(1, { groupId: uuid(10), todo: { done: true } }), note(2, { groupId: uuid(10) })];
  const copies = cloneItems(items, 32, 48, 10);
  assert.notEqual(copies[0].groupId, items[0].groupId);
  assert.equal(copies[0].groupId, copies[1].groupId);
  assert.deepEqual(copies[0].todo, { done: true });
  const imported = renewProjectIds({ id: uuid(30), name: 'Project', color: '#ffffff', ownerId: uuid(40), items });
  assert.notEqual(imported.items[0].groupId, items[0].groupId);
  assert.equal(imported.items[0].groupId, imported.items[1].groupId);
});

test('groups and TODO survive the persistence adapter for root and nested items', () => {
  const items = [
    note(1, { groupId: uuid(10), todo: { done: true } }),
    { ...createCanvasItem('column', 200, 100), id: uuid(3), items: [note(2, { todo: { done: false } })] },
  ];
  const writes = flattenItems(items, uuid(100));
  assert.deepEqual(writes[0].item.appearance.todo, { done: true });
  assert.equal(writes[0].item.appearance.groupId, uuid(10));
  const view = toProjectView({
    project: { id: uuid(101), name: 'Test', color: '#ffffff', todoDisplay: 'strike' },
    board: {
      board: { id: uuid(100) },
      items: writes.map(({ item }) => item),
      comments: [],
      links: [],
      tags: [],
      itemTags: [],
    },
  });
  assert.deepEqual(view.items[0].todo, { done: true });
  assert.equal(view.items[0].groupId, uuid(10));
  assert.deepEqual(view.items[1].items[0].todo, { done: false });
  assert.equal(view.todoDisplay, 'strike');
  for (const invalid of [{ done: 'yes' }, {}, { done: false, script: 'evil' }, null])
    assert.throws(() => flattenItems([note(1, { todo: invalid })], uuid(100)));
  assert.throws(() => flattenItems([note(1, { groupId: 'invalid' })], uuid(100)));
});

test('TODO renders internal completion overlays without interactive controls in every view', () => {
  for (const display of ['checkbox', 'checkmark', 'strike']) {
    const html = renderToStaticMarkup(
      createElement(
        TodoDisplayContext.Provider,
        { value: display },
        createElement(ItemTodo, { item: note(1, { todo: { done: true } }), readOnly: true, onUpdate() {} }, 'content'),
      ),
    );
    assert.doesNotMatch(html, /<button|role="checkbox"|item-todo-toggle/);
    assert.match(html, /data-todo-done="true"/);
    assert.equal(html.includes('item-todo-checkmark'), display !== 'strike');
    assert.equal(html.includes('item-todo-strike'), display === 'strike');
  }
});

function spaceSetup(t, tag = 'button') {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] });
  const active = [];
  const host = new browser.EventTarget();
  const target = browser.document.createElement(tag);
  const cleanup = installSpacePan((value) => active.push(value), host);
  t.after(cleanup);
  const key = (type, repeat = false) => {
    const event = new browser.KeyboardEvent(type, { code: 'Space', key: ' ', repeat, cancelable: true });
    Object.defineProperty(event, 'target', { value: target });
    host.dispatchEvent(event);
    return event;
  };
  return { host, active, key };
}

test('short Space keeps native activation but holding it cancels keyup and repetition', (t) => {
  const { key, active } = spaceSetup(t);
  assert.equal(key('keydown').defaultPrevented, false);
  assert.equal(key('keyup').defaultPrevented, false);
  assert.deepEqual(active, [true, false]);
  key('keydown');
  t.mock.timers.tick(300);
  assert.equal(key('keydown', true).defaultPrevented, true);
  assert.equal(key('keyup').defaultPrevented, true);
  assert.equal(active.at(-1), false);
});

test('Space plus mouse cancels activation even before the holding threshold', (t) => {
  const { host, key } = spaceSetup(t);
  key('keydown');
  host.dispatchEvent(new browser.MouseEvent('mousedown'));
  const click = new browser.MouseEvent('click', { cancelable: true });
  host.dispatchEvent(click);
  assert.equal(click.defaultPrevented, true);
  assert.equal(key('keyup').defaultPrevented, true);
});

test('typing spaces in text fields never enables panning and blur resets an active gesture', (t) => {
  const { key, active } = spaceSetup(t, 'textarea');
  key('keydown');
  t.mock.timers.tick(400);
  assert.equal(key('keyup').defaultPrevented, false);
  assert.deepEqual(active, []);
});

test('project export/import retains TODO state and presentation and remaps its logical groups', async () => {
  const source = {
    id: uuid(30),
    name: 'Tasks',
    color: '#ffffff',
    ownerId: uuid(40),
    todoDisplay: 'checkmark',
    items: [note(1, { groupId: uuid(10), todo: { done: true } }), note(2, { groupId: uuid(10) })],
  };
  const imported = await importProjectJson(exportProjectJson(source), uuid(41));
  assert.equal(imported.todoDisplay, 'checkmark');
  assert.deepEqual(imported.items[0].todo, { done: true });
  assert.notEqual(imported.items[0].groupId, source.items[0].groupId);
  assert.equal(imported.items[0].groupId, imported.items[1].groupId);
});

test('window blur clears the held Space state even without keyup', (t) => {
  const { host, key, active } = spaceSetup(t);
  key('keydown');
  t.mock.timers.tick(300);
  host.dispatchEvent(new browser.Event('blur'));
  assert.equal(active.at(-1), false);
  assert.equal(key('keyup').defaultPrevented, false);
  assert.equal(key('keydown').defaultPrevented, false);
});
