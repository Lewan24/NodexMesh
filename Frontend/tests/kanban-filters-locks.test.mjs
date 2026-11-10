import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
const { EMPTY_KANBAN_FILTERS, hasKanbanFilters, matchesKanbanFilters, moveFilteredKanbanCard } =
  await server.ssrLoadModule('/src/features/blocks/kanban/utils/kanbanFilters.ts');
const { applyItemLocks } = await server.ssrLoadModule('/src/features/canvas/utils/itemLocks.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { growsAutomatically } = await server.ssrLoadModule('/src/features/canvas/utils/autoGrowthLayout.ts');
const card = (id, extra = {}) => ({ id, text: id, done: false, ...extra });
const filters = (patch) => ({ ...EMPTY_KANBAN_FILTERS, ...patch });

test('title-only tasks, all/selected/no assignees and unassigned inclusion are independent', () => {
  const empty = card('No details');
  const anna = card('Anna', { assigneeUserId: 'anna' });
  const bob = card('Bob', { assigneeUserId: 'bob' });
  assert.equal(hasKanbanFilters(EMPTY_KANBAN_FILTERS), false);
  for (const task of [empty, anna, bob]) assert.equal(matchesKanbanFilters(task, EMPTY_KANBAN_FILTERS), true);
  assert.equal(matchesKanbanFilters(empty, filters({ assigneeIds: ['anna'] })), true);
  assert.equal(matchesKanbanFilters(empty, filters({ assigneeIds: ['anna'], includeUnassigned: false })), false);
  assert.equal(matchesKanbanFilters(anna, filters({ assigneeIds: ['anna'], includeUnassigned: false })), true);
  assert.equal(matchesKanbanFilters(bob, filters({ assigneeIds: ['anna'] })), false);
  assert.equal(matchesKanbanFilters(empty, filters({ assigneeIds: [] })), true);
  assert.equal(matchesKanbanFilters(anna, filters({ assigneeIds: [] })), false);
  assert.equal(matchesKanbanFilters(bob, filters({ includeUnassigned: false })), true);
  assert.equal(hasKanbanFilters(filters({ includeUnassigned: false })), true);
});

test('categories use OR including legacy fields, while different facets use AND and strict date bounds', () => {
  const task = card('Review', {
    assigneeUserId: 'anna',
    categoryIds: ['important', 'medium'],
    deadline: '2026-11-09',
    description: 'Polish text',
  });
  assert.equal(matchesKanbanFilters(task, filters({ categoryIds: ['low', 'medium'] })), true);
  assert.equal(matchesKanbanFilters(task, filters({ categoryIds: ['low'] })), false);
  assert.equal(
    matchesKanbanFilters(card('Legacy', { categoryId: 'important' }), filters({ categoryIds: ['important'] })),
    true,
  );
  assert.equal(
    matchesKanbanFilters(
      card('Cleared', { categoryId: 'important', categoryIds: [] }),
      filters({ categoryIds: ['important'] }),
    ),
    false,
  );
  assert.equal(matchesKanbanFilters(task, filters({ assigneeIds: ['bob'], categoryIds: ['important'] })), false);
  assert.equal(matchesKanbanFilters(task, filters({ deadlineBefore: '2026-11-10' })), true);
  assert.equal(matchesKanbanFilters(task, filters({ deadlineBefore: '2026-11-09' })), false);
  assert.equal(matchesKanbanFilters(card('No date'), filters({ deadlineBefore: '2026-11-10' })), false);
  assert.equal(
    matchesKanbanFilters(card('No date'), filters({ deadlineBefore: '2026-11-10', includeWithoutDeadline: true })),
    true,
  );
  assert.equal(matchesKanbanFilters(task, filters({ query: ' POLISH ' })), true);
});

test('filtering never restores completed tasks omitted by the visibility layer or modifies metadata', () => {
  const tasks = [
    card('Open', { categoryIds: ['important'] }),
    card('Done', { done: true, categoryIds: ['important'] }),
  ];
  const snapshot = structuredClone(tasks);
  const visible = tasks.filter((task) => !task.done);
  assert.deepEqual(
    visible
      .filter((task) => matchesKanbanFilters(task, filters({ categoryIds: ['important'] })))
      .map((task) => task.id),
    ['Open'],
  );
  assert.deepEqual(tasks, snapshot);
});

test('filtered drag preserves hidden cards when moving within or between columns', () => {
  const a = card('a'),
    hidden = card('hidden', { done: true }),
    b = card('b'),
    c = card('c'),
    other = card('other');
  const columns = [
    { id: 'one', cards: [a, hidden, b, c] },
    { id: 'two', cards: [other] },
  ];
  const same = moveFilteredKanbanCard(columns, 'one', 'one', 'a', [a, b, c], 2);
  assert.deepEqual(
    same[0].cards.map((task) => task.id),
    ['hidden', 'b', 'a', 'c'],
  );
  const moved = moveFilteredKanbanCard(columns, 'one', 'two', 'b', [other], 0);
  assert.deepEqual(
    moved[0].cards.map((task) => task.id),
    ['a', 'hidden', 'c'],
  );
  assert.deepEqual(
    moved[1].cards.map((task) => task.id),
    ['b', 'other'],
  );
  assert.equal(moved[0].cards[1], hidden);
  assert.equal(columns[0].cards.length, 4);
});

test('locking snapshots measured height, rejects auto-fit while locked and keeps edits', () => {
  const note = { ...createCanvasItem('note', 10, 20), content: 'Original', height: undefined };
  const locked = applyItemLocks([note], [{ ...note, locked: true }], () => 237)[0];
  assert.equal(locked.height, 237);
  assert.equal(growsAutomatically(locked), false);
  const edited = applyItemLocks([locked], [{ ...locked, content: 'More text', height: undefined }], () => 900)[0];
  assert.equal(edited.height, 237);
  assert.equal(edited.content, 'More text');
  assert.equal(edited.x, 10);
  const unlocked = applyItemLocks([edited], [{ ...edited, locked: false, height: undefined }], () => 900)[0];
  assert.equal(unlocked.height, undefined);
  assert.equal(growsAutomatically(unlocked), true);
});

test('locks cover nested items, auto-height documents and existing legacy locks', () => {
  const document = { ...createCanvasItem('document', 0, 0), autoHeight: true };
  const column = { ...createCanvasItem('column', 0, 0), items: [document] };
  const next = { ...column, items: [{ ...document, locked: true }] };
  const result = applyItemLocks([column], [next], () => 350)[0].items[0];
  assert.equal(result.height, 350);
  assert.equal(result.autoHeight, false);
  const legacy = { ...createCanvasItem('note', 0, 0), locked: true };
  const fixed = applyItemLocks([legacy], [{ ...legacy, content: 'New' }], () => 184)[0];
  assert.equal(fixed.height, 184);
  const stable = applyItemLocks([result], [result], () => {
    throw new Error('No remeasurement');
  });
  assert.equal(stable[0], result);
});
