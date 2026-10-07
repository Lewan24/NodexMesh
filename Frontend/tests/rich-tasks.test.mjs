import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const originalFetch = globalThis.fetch;
let apiHandler;
globalThis.fetch = async (url, options) => {
  if (!apiHandler) throw new Error(`Unexpected API request: ${url}`);
  return apiHandler(url, options);
};
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { itemSchemas } = await server.ssrLoadModule('/src/entities/board/itemSchema.ts');
const { flattenItems, toProjectView } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { insertTask, createTaskChecklist } = await server.ssrLoadModule(
  '/src/features/canvas/hooks/useCrossItemDrop.ts',
);
const { default: TaskPreview } = await server.ssrLoadModule('/src/features/blocks/shared/TaskPreview.tsx');
const task = {
  id: 'task',
  text: 'Release',
  done: false,
  description: 'Details',
  deadline: '2026-10-31',
  categoryId: 'important',
  assigneeUserId: '01900000-0000-7000-8000-000000000001',
  subtasks: [
    { id: 'sub', text: 'Test', done: true },
    { id: 'sub2', text: 'Ship', done: false },
  ],
};
test('rich tasks validate and survive transfers and board reconstruction', () => {
  assert.equal(itemSchemas.checklist.validate({ title: 'Work', entries: [task] }), true);
  const checklist = createTaskChecklist(task, 0, 0);
  const boardId = '01900000-0000-7000-8000-000000000002';
  const flat = flattenItems([checklist], boardId);
  // Persisted data is the complete task, not a preview-specific projection.
  assert.deepEqual(flat[0].item.data.entries[0], task);
  const rebuilt = toProjectView({
    project: { id: boardId, name: 'Project' },
    board: {
      board: { id: boardId },
      items: flat.map((m) => ({ ...m.item, revision: '1', deletedAt: null })),
      comments: [],
      links: [],
      tags: [],
      itemTags: [],
    },
  });
  assert.deepEqual(rebuilt.items[0].entries[0], task);
  const kanban = {
    id: 'kanban',
    type: 'kanban',
    title: 'Work',
    columns: [{ id: 'column', title: 'Todo', color: '#123456', cards: [] }],
  };
  const moved = insertTask(kanban, task, 0, 'column');
  assert.deepEqual(moved.columns[0].cards[0], task);
  assert.equal(itemSchemas.kanban.validate({ title: moved.title, columns: moved.columns }), true);
});
test('task schema rejects invalid dates, oversized descriptions, and multiline subtasks', () => {
  for (const patch of [
    { deadline: '2026-02-30' },
    { description: 'x'.repeat(20001) },
    { subtasks: [{ id: 'sub', text: 'two\nlines', done: false }] },
  ]) {
    assert.equal(itemSchemas.checklist.validate({ title: 'Work', entries: [{ ...task, ...patch }] }), false);
  }
});
test('preview shows category, progress, description, assignee, and deadline after rendering', () => {
  const html = renderToStaticMarkup(createElement(TaskPreview, { task }));
  for (const value of ['Important', '#EF4444', '1', '2', '2026-10-31', 'Description', 'Assignee'])
    assert.ok(html.includes(value), value);
});
test.after(async () => {
  globalThis.fetch = originalFetch;
  await server.close();
});

test('task dialog saves details, supports cancellation, and disables read-only edits', async () => {
  const { Window } = await import('happy-dom');
  const browser = new Window({ url: 'http://localhost' });
  for (const name of ['document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'MouseEvent', 'Event'])
    globalThis[name] = browser[name];
  globalThis.window = browser;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { default: TaskDialog } = await server.ssrLoadModule('/src/features/blocks/shared/TaskDialog.tsx');
  const { ProjectTasksProvider } = await server.ssrLoadModule('/src/features/blocks/shared/ProjectTasksContext.tsx');
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let saved,
    closed = 0;
  const render = (readOnly = false) =>
    root.render(
      createElement(
        ProjectTasksProvider,
        { projectId: '', participants: [{ userId: task.assigneeUserId, displayName: 'Owner' }], readOnly },
        createElement(TaskDialog, {
          task,
          readOnly,
          onSave: (value) => {
            saved = value;
          },
          onClose: () => closed++,
        }),
      ),
    );
  try {
    await act(async () => render());
    const dialog = document.querySelector('[role="dialog"]');
    assert.equal(dialog.querySelector('textarea').value, task.description);
    assert.equal(dialog.querySelector('input[type="date"]').value, task.deadline);
    assert.equal(dialog.querySelectorAll('input[type="checkbox"]').length, 6);
    await act(async () => dialog.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    const { categoryId: _legacy, ...details } = task;
    assert.deepEqual(saved, { ...details, categoryIds: ['important'] });
    await act(async () => [...dialog.querySelectorAll('button')].find((b) => b.textContent === 'Cancel').click());
    assert.equal(closed, 2);
    await act(async () => render(true));
    assert.equal(document.querySelector('[role="dialog"] fieldset').disabled, true);
    assert.equal(
      [...document.querySelectorAll('[role="dialog"] button')].some((b) => b.textContent === 'Save task'),
      false,
    );
  } finally {
    await act(async () => root.unmount());
    host.remove();
    await browser.happyDOM.close();
  }
});

test('multiple category assignments validate, clear legacy values, and render every label', async () => {
  const { taskCategoryIds, normalizeTaskDetails } = await server.ssrLoadModule(
    '/src/features/blocks/shared/taskDetails.ts',
  );
  assert.deepEqual(taskCategoryIds(task), ['important']);
  assert.deepEqual(taskCategoryIds({ ...task, categoryIds: [] }), []);
  const multiple = normalizeTaskDetails({ ...task, categoryIds: ['important', 'medium', 'important'] });
  assert.deepEqual(multiple.categoryIds, ['important', 'medium']);
  assert.equal(Object.hasOwn(multiple, 'categoryId'), false);
  assert.equal(itemSchemas.checklist.validate({ title: 'Work', entries: [multiple] }), true);
  for (const categoryIds of [['important', 'important'], [''], Array(101).fill('important'), [null]]) {
    assert.equal(itemSchemas.checklist.validate({ title: 'Work', entries: [{ ...task, categoryIds }] }), false);
  }
  const html = renderToStaticMarkup(createElement(TaskPreview, { task: multiple }));
  assert.ok(html.includes('Important') && html.includes('Medium priority'));
});

test('outside clicks persist category selection and custom categories, wait for saves, and retain failed drafts', async () => {
  const { Window } = await import('happy-dom');
  const browser = new Window({ url: 'http://localhost' });
  for (const name of ['document', 'HTMLElement', 'HTMLInputElement', 'Element', 'Node', 'MouseEvent', 'Event'])
    globalThis[name] = browser[name];
  globalThis.window = browser;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { default: TaskDialog } = await server.ssrLoadModule('/src/features/blocks/shared/TaskDialog.tsx');
  const { ProjectTasksProvider } = await server.ssrLoadModule('/src/features/blocks/shared/ProjectTasksContext.tsx');
  const { registerSaveGuard } = await server.ssrLoadModule('/src/shared/api/pendingChanges.ts');
  const viewport = new browser.EventTarget();
  viewport.height = 440;
  viewport.offsetTop = 100;
  Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport });
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let saved,
    closed = 0,
    successful = false,
    releaseSave;
  const unregister = registerSaveGuard(async (retryFailedSaves) => {
    assert.equal(retryFailedSaves, true);
    await new Promise((resolve) => {
      releaseSave = resolve;
    });
    return successful;
  });
  const click = async (element) => act(async () => element.click());
  const outside = async () =>
    act(async () => {
      const backdrop = document.querySelector('[data-task-backdrop]');
      backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      backdrop.click();
      await Promise.resolve();
    });
  try {
    await act(async () =>
      root.render(
        createElement(
          ProjectTasksProvider,
          { projectId: '', participants: [], readOnly: false },
          createElement(TaskDialog, {
            task,
            onSave: (value) => {
              saved = value;
            },
            onClose: () => closed++,
          }),
        ),
      ),
    );
    assert.equal(
      document.querySelector('[data-task-backdrop]').style.getPropertyValue('--task-viewport-height'),
      '440px',
    );
    assert.equal(document.body.style.overflow, 'hidden');
    const categoryInputs = () => [...document.querySelectorAll('.task-category-option input')];
    await click(categoryInputs()[1]);
    await click(
      [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Edit project categories')),
    );
    await click([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Add category')));
    assert.equal(document.querySelectorAll('[aria-label="Category name"]').length, 4);
    assert.equal(document.querySelector('[role="dialog"]').contains(document.activeElement), true);
    await click(
      [...document.querySelectorAll('button')].find((button) => button.textContent.includes('Save categories')),
    );
    assert.equal(categoryInputs().length, 4);
    assert.equal(document.querySelector('[role="dialog"]').contains(document.activeElement), true);
    await click(categoryInputs()[3]);
    // A drag that starts inside the form and ends over the backdrop does not save.
    await act(async () => {
      document.querySelector('textarea').dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
      document.querySelector('[data-task-backdrop]').click();
    });
    assert.equal(saved, undefined);
    await outside();
    assert.equal(document.querySelector('[role="dialog"]').getAttribute('aria-busy'), 'true');
    assert.equal(closed, 0);
    assert.equal(saved.categoryIds.length, 3);
    assert.deepEqual(saved.categoryIds.slice(0, 2), ['important', 'medium']);
    await act(async () => releaseSave());
    assert.equal(closed, 0);
    assert.ok(document.querySelector('[role="alert"]').textContent.includes('Could not save'));
    assert.equal(categoryInputs()[1].checked, true);
    successful = true;
    await outside();
    assert.equal(closed, 0);
    await act(async () => releaseSave());
    assert.equal(closed, 1);
    viewport.height = 650;
    await act(async () => viewport.dispatchEvent(new Event('resize')));
    assert.equal(
      document.querySelector('[data-task-backdrop]').style.getPropertyValue('--task-viewport-height'),
      '650px',
    );
  } finally {
    unregister();
    await act(async () => root.unmount());
    assert.equal(document.body.style.overflow, '');
    host.remove();
    await browser.happyDOM.close();
  }
});

test('middle-button capture pans over checklist and kanban actions without opening or toggling tasks', async () => {
  const { Window } = await import('happy-dom');
  const browser = new Window({ url: 'http://localhost' });
  for (const name of ['document', 'HTMLElement', 'Element', 'Node', 'MouseEvent', 'Event'])
    globalThis[name] = browser[name];
  globalThis.window = browser;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { act } = await import('react');
  const { createRoot } = await import('react-dom/client');
  const { shouldCaptureMiddlePan } = await server.ssrLoadModule('/src/features/canvas/hooks/useCanvasMouse.ts');
  const { default: ChecklistEntryRow } = await server.ssrLoadModule(
    '/src/features/blocks/checklist/ChecklistEntryRow.tsx',
  );
  const { default: KanbanCardItem } = await server.ssrLoadModule('/src/features/blocks/kanban/KanbanCardItem.tsx');
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  let pans = 0,
    opens = 0,
    toggles = 0,
    drags = 0;
  const common = {
    isDragging: false,
    textColor: '#333333',
    accentColor: '#7C3AED',
    onToggle: () => toggles++,
    onDelete: () => {},
    onOpen: () => opens++,
    onDragHandleMouseDown: () => drags++,
  };
  const capture = (event) => {
    if (shouldCaptureMiddlePan(event)) {
      pans++;
      event.preventDefault();
      event.stopPropagation();
    }
  };
  try {
    await act(async () =>
      root.render(
        createElement(
          'div',
          { onMouseDownCapture: capture },
          createElement(ChecklistEntryRow, { ...common, entry: task }),
          createElement(KanbanCardItem, {
            ...common,
            card: task,
            mutedColor: '#888888',
            doneColor: '#888888',
            cardBackground: '#ffffff',
            cardBorder: '#dddddd',
            cardBorderHover: '#888888',
          }),
          createElement('div', { role: 'dialog' }, createElement('button', null, 'Modal control')),
        ),
      ),
    );
    const controls = [...host.querySelectorAll('button')].filter((button) => button.textContent !== 'Modal control');
    for (const control of controls)
      await act(async () =>
        control.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 1, cancelable: true })),
      );
    assert.equal(pans, controls.length);
    assert.equal(opens, 0);
    assert.equal(toggles, 0);
    assert.equal(drags, 0);
    await act(async () =>
      host
        .querySelector('[role="dialog"] button')
        .dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 1 })),
    );
    assert.equal(pans, controls.length);
    await act(async () => host.querySelector('.task-open-button').click());
    assert.equal(opens, 1);
  } finally {
    await act(async () => root.unmount());
    host.remove();
    await browser.happyDOM.close();
  }
});

test('saving a task omitted after completion reloads its details and preserves the partial-write flag', async () => {
  const { saveTaskDetails } = await server.ssrLoadModule('/src/features/blocks/shared/saveTaskDetails.ts');
  const boardId = '01900000-0000-7000-8000-000000000002';
  const edited = { ...task, done: true, description: 'Updated after completion', categoryIds: ['important', 'medium'] };
  const checklist = {
    ...createTaskChecklist(task, 0, 0),
    entries: [],
    hideCompleted: true,
    taskSummary: { boardId, revision: '7', completedCount: 1, columns: {} },
  };
  const kanban = {
    ...checklist,
    type: 'kanban',
    columns: [{ id: 'todo', title: 'Todo', color: '#123456', cards: [] }],
    taskSummary: { ...checklist.taskSummary, columns: { todo: 1 } },
  };
  delete kanban.entries;
  for (const source of [checklist, kanban]) {
    let current = source;
    const calls = [];
    apiHandler = (url) => {
      calls.push(url);
      return new Response(
        JSON.stringify(
          source.type === 'checklist'
            ? { entries: [{ ...task, done: true }] }
            : { columns: [{ id: 'todo', cards: [{ ...task, done: true }] }] },
        ),
        { headers: { 'Content-Type': 'application/json' } },
      );
    };
    await saveTaskDetails(source, edited, (update) => {
      current = update(current);
    });
    assert.equal(calls.length, 1);
    assert.ok(calls[0].endsWith('/completed-tasks?expectedRevision=7'));
    assert.deepEqual(current.type === 'checklist' ? current.entries[0] : current.columns[0].cards[0], edited);
    assert.equal(current.taskSummary.completedCount, 0);
    assert.equal(flattenItems([current], boardId)[0].item.preserveCompletedTasks, true);
    apiHandler = () =>
      new Response(
        JSON.stringify(source.type === 'checklist' ? { entries: [] } : { columns: [{ id: 'todo', cards: [] }] }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    await assert.rejects(
      () =>
        saveTaskDetails(source, edited, (update) => {
          current = update(current);
        }),
      /removed/,
    );
  }
  apiHandler = undefined;
});
