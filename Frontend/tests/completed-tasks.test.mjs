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
  'HTMLDialogElement',
  'Element',
  'Node',
  'MouseEvent',
  'Event',
  'localStorage',
])
  globalThis[name] = name === 'window' ? browser : browser[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const calls = [];
let handler;
globalThis.fetch = async (url, options) => {
  const body = options.body ? JSON.parse(options.body) : undefined;
  calls.push({ url, body });
  return handler(url, body);
};
const server = await createServer({
  configFile: false,
  define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('http') },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { default: ChecklistBlock } = await server.ssrLoadModule('/src/features/blocks/checklist/ChecklistBlock.tsx');
const { default: KanbanBlock } = await server.ssrLoadModule('/src/features/blocks/kanban/KanbanBlock.tsx');
const { flattenItems } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { completeTaskItems } = await server.ssrLoadModule('/src/features/blocks/shared/completeTaskItems.ts');
const { ThemeProvider } = await server.ssrLoadModule('/src/app/providers/ThemeProvider.tsx');
await server.close();
const click = async (element) => act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const tick = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
const done = { id: 'done', text: 'Previously completed task', done: true };
const open = { id: 'open', text: 'Unfinished task', done: false };
const makeItem = (type) => ({
  id: '00000000-0000-4000-8000-000000000001',
  type,
  title: 'Tasks',
  hideCompleted: true,
  x: 0,
  y: 0,
  zIndex: 1,
  color: '#ffffff',
  taskSummary: {
    completedCount: 1,
    columns: { column: 1 },
    boardId: '00000000-0000-4000-8000-000000000002',
    revision: '3',
  },
  ...(type === 'checklist'
    ? { entries: [] }
    : { columns: [{ id: 'column', title: 'Column', color: '#ffffff', cards: [] }] }),
});
const json = (data) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });

for (const [type, Component] of [
  ['checklist', ChecklistBlock],
  ['kanban', KanbanBlock],
]) {
  test(`${type} turns off the saved filter, downloads completed tasks and includes them in edits`, async () => {
    calls.length = 0;
    let current = makeItem(type);
    let updates = 0;
    handler = () => json(type === 'checklist' ? { entries: [done] } : { columns: [{ id: 'column', cards: [done] }] });
    const host = document.createElement('div');
    document.body.append(host);
    const reactRoot = createRoot(host);
    const root = {
      render: (element) => reactRoot.render(createElement(ThemeProvider, null, element)),
      unmount: () => reactRoot.unmount(),
    };
    const render = () =>
      root.render(
        createElement(Component, {
          item: current,
          onDelete: () => {},
          onUpdate: (updater) => {
            updates++;
            current = updater(current);
            render();
          },
        }),
      );
    try {
      await act(async () => render());
      assert.match(host.textContent, /All tasks done/);
      assert.match(host.textContent, /1\/1/);
      await click([...host.querySelectorAll('button')].find((button) => button.textContent.includes('Show all tasks')));
      await tick();
      assert.match(host.textContent, /Previously completed task/);
      assert.equal(updates, 1);
      assert.equal(current.hideCompleted, false);
      assert.equal(calls.length, 1);
      assert.match(calls[0].url, /expectedRevision=3/);
      assert.ok(host.querySelector('[data-read-only-action]') === null);
      const toggle =
        type === 'checklist'
          ? host.querySelector('[role="checkbox"]')
          : host.querySelector('.group\\/card button.rounded-full');
      assert.ok(toggle);
      await click(toggle);
      assert.equal(updates, 2);
      const entries = type === 'checklist' ? current.entries : current.columns[0].cards;
      assert.equal(entries[0].done, false);
      assert.equal(current.taskSummary, undefined);
      assert.equal(
        flattenItems([current], '00000000-0000-4000-8000-000000000002')[0].item.preserveCompletedTasks,
        undefined,
      );
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
}

test('partial block edits flag hidden-task preservation and copy hydration retains every task', async () => {
  const item = { ...makeItem('checklist'), entries: [open] };
  const write = flattenItems([item], '00000000-0000-4000-8000-000000000002')[0].item;
  assert.equal(write.preserveCompletedTasks, true);
  assert.equal(write.data.taskSummary, undefined);
  handler = () => json({ entries: [done] });
  const [copy] = await completeTaskItems([item]);
  assert.deepEqual(copy.entries, [open, done]);
  assert.equal(copy.taskSummary, undefined);
});

test('a failed task download keeps partial tasks and exposes a retryable error', async () => {
  handler = () =>
    new Response(JSON.stringify({ code: 'revision_mismatch', detail: 'Tasks changed. Refresh and retry.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  const host = document.createElement('div');
  document.body.append(host);
  const reactRoot = createRoot(host);
  const root = {
    render: (element) => reactRoot.render(createElement(ThemeProvider, null, element)),
    unmount: () => reactRoot.unmount(),
  };
  try {
    await act(async () =>
      root.render(
        createElement(ChecklistBlock, {
          item: makeItem('checklist'),
          onUpdate: () => assert.fail('Must not save'),
          onDelete: () => {},
        }),
      ),
    );
    await click([...host.querySelectorAll('button')].find((button) => button.textContent.includes('Show all tasks')));
    await tick();
    assert.match(host.querySelector('[role="alert"]').textContent, /Refresh and retry/);
    assert.match(host.textContent, /Show all tasks/);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

test('loading completed tasks preserves edits made while the download was pending', async () => {
  let finish;
  handler = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  let current = { ...makeItem('checklist'), entries: [open] };
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  const render = () =>
    root.render(
      createElement(
        ThemeProvider,
        null,
        createElement(ChecklistBlock, {
          item: current,
          onUpdate: (updater) => {
            current = updater(current);
            render();
          },
          onDelete: () => {},
        }),
      ),
    );
  try {
    await act(async () => render());
    await click([...host.querySelectorAll('button')].find((button) => button.textContent.includes('Show all tasks')));
    current = { ...current, entries: [] };
    await act(async () => render());
    await act(async () => finish(json({ entries: [done] })));
    await tick();
    assert.match(host.textContent, /Previously completed task/);
    assert.doesNotMatch(host.textContent, /Unfinished task/);
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});

for (const [type, Component] of [
  ['checklist', ChecklistBlock],
  ['kanban', KanbanBlock],
]) {
  test(`${type} shows everything by default and saves the optional filter without deleting tasks`, async () => {
    let current = {
      ...makeItem(type),
      hideCompleted: undefined,
      taskSummary: undefined,
      ...(type === 'checklist'
        ? { entries: [open, done] }
        : { columns: [{ id: 'column', title: 'Column', color: '#ffffff', cards: [open, done] }] }),
    };
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    const render = () =>
      root.render(
        createElement(
          ThemeProvider,
          null,
          createElement(Component, {
            item: current,
            onDelete: () => {},
            onUpdate: (updater) => {
              current = updater(current);
              render();
            },
          }),
        ),
      );
    try {
      await act(async () => render());
      assert.match(host.textContent, /Previously completed task/);
      const toggle = [...host.querySelectorAll('button')].find((button) =>
        button.textContent.includes('Only unfinished tasks'),
      );
      assert.equal(toggle.getAttribute('aria-pressed'), 'false');
      await click(toggle);
      assert.equal(current.hideCompleted, true);
      assert.doesNotMatch(host.textContent, /Previously completed task/);
      assert.match(host.textContent, /Unfinished task/);
      assert.equal(flattenItems([current], '00000000-0000-4000-8000-000000000002')[0].item.data.hideCompleted, true);
      const checkbox =
        type === 'checklist'
          ? host.querySelector('[role="checkbox"]')
          : host.querySelector('.group\\/card button.rounded-full');
      await click(checkbox);
      const entries = type === 'checklist' ? current.entries : current.columns[0].cards;
      assert.equal(entries.length, 2);
      assert.ok(entries.every((entry) => entry.done));
      assert.match(host.textContent, /All tasks done/);
      await click([...host.querySelectorAll('button')].find((button) => button.textContent.includes('Show all tasks')));
      assert.equal(current.hideCompleted, false);
      assert.match(host.textContent, /Previously completed task/);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });

  test(`${type} viewers can show omitted tasks without saving`, async () => {
    handler = () => json(type === 'checklist' ? { entries: [done] } : { columns: [{ id: 'column', cards: [done] }] });
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    try {
      await act(async () =>
        root.render(
          createElement(
            ThemeProvider,
            null,
            createElement(Component, {
              item: makeItem(type),
              readOnly: true,
              onDelete: () => {},
              onUpdate: () => assert.fail('Viewer must not save'),
            }),
          ),
        ),
      );
      const toggle = [...host.querySelectorAll('button')].find((button) =>
        button.textContent.includes('Show all tasks'),
      );
      assert.ok(toggle.hasAttribute('data-read-only-action'));
      await click(toggle);
      await tick();
      assert.match(host.textContent, /Previously completed task/);
    } finally {
      await act(async () => root.unmount());
      host.remove();
    }
  });
}
