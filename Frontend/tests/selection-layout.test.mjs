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
const { getLayoutSelection, planArrangement, layoutUpdates, DEFAULT_ARRANGEMENT } = await server.ssrLoadModule(
  '/src/features/canvas/utils/selectionLayout.ts',
);
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { ITEM_WIDTH, noteModuleWidth } = await server.ssrLoadModule('/src/features/canvas/constants.ts');
const note = (id, x, y, extra = {}) => ({ ...createCanvasItem('note', x, y), id, ...extra });
const apply = (items, updates) => items.map((item) => updates.get(item.id)?.(item) ?? item);
const arrange = (items, options = {}) => {
  const selection = getLayoutSelection(
    items,
    items.map((item) => item.id),
  );
  assert.equal(selection.reason, undefined);
  return apply(
    items,
    layoutUpdates(
      items,
      selection.units,
      planArrangement(selection.units, { ...DEFAULT_ARRANGEMENT, ...options }),
      new Map(),
    ),
  );
};

test('default widths use note modules and creation preserves explicit saved widths', () => {
  assert.equal(ITEM_WIDTH.note, 320);
  assert.equal(noteModuleWidth(2), 656);
  assert.equal(noteModuleWidth(6), 2000);
  for (const type of [
    'note',
    'checklist',
    'dispenser',
    'image',
    'file',
    'text',
    'drawing',
    'board',
    'link',
    'section-title',
  ])
    assert.equal(ITEM_WIDTH[type], 320, type);
  for (const type of ['document', 'code', 'embed', 'column', 'frame']) assert.equal(ITEM_WIDTH[type], 656, type);
  for (const type of ['timeline', 'diagram', 'mindmap', 'database', 'kanban'])
    assert.equal(ITEM_WIDTH[type], 992, type);
  for (const type of Object.keys(ITEM_WIDTH).filter((type) => !['line', 'drawing'].includes(type)))
    assert.equal(createCanvasItem(type, 0, 0).width, ITEM_WIDTH[type], type);
  assert.equal(note('saved', 0, 0, { width: 217 }).width, 217);
});

test('swapping exchanges anchors without modifying dimensions, metadata or the originals', () => {
  const items = [note('a', -48, 32, { width: 320, todo: { done: true } }), note('b', 656, 400, { width: 656 })];
  const { units } = getLayoutSelection(items, ['a', 'b']);
  const updates = layoutUpdates(
    items,
    units,
    new Map([
      [units[0].id, units[1].rect],
      [units[1].id, units[0].rect],
    ]),
    new Map(),
  );
  const result = apply(items, updates);
  assert.deepEqual(
    result.map(({ x, y, width }) => ({ x, y, width })),
    [
      { x: 656, y: 400, width: 320 },
      { x: -48, y: 32, width: 656 },
    ],
  );
  assert.deepEqual(result[0].todo, { done: true });
  assert.equal(items[0].x, -48);
  assert.equal(updates.size, 2);
});

test('width mode packs mixed module widths, wraps, and keeps oversized items intact', () => {
  const items = [
    note('a', 3, 2),
    note('b', 350, 2, { width: 656 }),
    note('c', 1040, 2),
    note('d', 1400, 2, { width: 2000 }),
  ];
  const result = arrange(items);
  assert.deepEqual(
    result.map(({ x, y }) => [x, y]),
    [
      [0, 0],
      [336, 0],
      [0, 192],
      [0, 384],
    ],
  );
  assert.equal(result[3].width, 2000);
});

test('count mode reserves measured grid cells and configurable gaps in both axes', () => {
  const items = [
    note('a', -5, -6, { width: 221, height: 175 }),
    note('b', 500, -6, { width: 321, height: 195 }),
    note('c', 900, -6),
  ];
  const sizes = new Map([['a', { width: 223, height: 211 }]]);
  const { units } = getLayoutSelection(items, ['a', 'b', 'c'], sizes);
  const plan = planArrangement(units, { ...DEFAULT_ARRANGEMENT, mode: 'count', perRow: 2, gap: 2, fillGaps: false });
  assert.deepEqual(
    [...plan.values()],
    [
      { x: 0, y: 0 },
      { x: 256, y: 0 },
      { x: 0, y: 256 },
    ],
  );
});

test('invalid or excessive layout values fail before any mutation', () => {
  const { units } = getLayoutSelection([note('a', 0, 0), note('b', 500, 0)], ['a', 'b']);
  for (const gap of [0, -1, 1.5, NaN, Infinity, 1001])
    assert.throws(() => planArrangement(units, { ...DEFAULT_ARRANGEMENT, gap }), /whole numbers/);
  assert.throws(() => planArrangement(units, { ...DEFAULT_ARRANGEMENT, mode: 'invalid' }), /whole numbers/);
  assert.throws(
    () =>
      layoutUpdates(
        units.flatMap((unit) => unit.items),
        units,
        new Map([['a', { x: Infinity, y: 0 }]]),
        new Map(),
      ),
    /too large/,
  );
});

test('groups and nested frame contents move once as rigid units', () => {
  const frame = { ...createCanvasItem('frame', 100, 100), id: 'frame' };
  const inner = { ...createCanvasItem('frame', 120, 130), id: 'inner', frameId: 'frame', width: 400, height: 200 };
  const child = note('child', 140, 150, { frameId: 'inner' });
  const peer = note('peer', 800, 150, { groupId: 'group' });
  const grouped = note('grouped', 900, 180, { groupId: 'group' });
  const items = [frame, inner, child, peer, grouped];
  const { units, reason } = getLayoutSelection(items, ['frame', 'child', 'peer']);
  assert.equal(reason, undefined);
  assert.equal(units.length, 2);
  const result = apply(
    items,
    layoutUpdates(
      items,
      units,
      planArrangement(units, { ...DEFAULT_ARRANGEMENT, mode: 'count', perRow: 1 }),
      new Map(),
    ),
  );
  assert.equal(result[2].x - result[0].x, 40);
  assert.equal(result[2].y - result[0].y, 50);
  assert.equal(result[2].frameId, 'inner');
  assert.equal(result[1].frameId, 'frame');
  assert.equal(result[4].x - result[3].x, 100);
  assert.equal(result[4].y - result[3].y, 30);
  assert.match(getLayoutSelection(items, ['peer', 'grouped']).reason, /independent/);
});

test('locked ancestors, descendants, nested column items and remote editing block mutation', () => {
  const a = note('a', 0, 0),
    b = note('b', 500, 0);
  assert.match(getLayoutSelection([{ ...a, locked: true }, b], ['a', 'b']).reason, /Unlock/);
  assert.match(getLayoutSelection([a, b], ['a', 'b'], new Map(), new Set(['b'])).reason, /Unlock/);
  const frame = { ...createCanvasItem('frame', 0, 0), id: 'frame', locked: true };
  assert.match(getLayoutSelection([frame, { ...a, frameId: 'frame' }, b], ['a', 'b']).reason, /Unlock/);
  assert.match(
    getLayoutSelection([{ ...frame, locked: false }, { ...a, locked: true, frameId: 'frame' }, b], ['frame', 'b'])
      .reason,
    /Unlock/,
  );
  const column = { ...createCanvasItem('column', 0, 0), id: 'column', items: [{ ...a, locked: true }] };
  assert.match(getLayoutSelection([column, b], ['column', 'b']).reason, /Unlock/);
  assert.match(getLayoutSelection([a, b], ['a', 'missing']).reason, /selection changed/);
});

test('free lines translate both endpoints, including negative direction; connected lines require rigid endpoints', () => {
  const line = { ...createCanvasItem('line', 200, 100), id: 'line', x2: 0, y2: 0 };
  const b = note('b', 500, 0);
  const result = arrange([line, b], { mode: 'count', perRow: 1 });
  assert.equal(result[0].x - result[0].x2, 200);
  assert.equal(result[0].y - result[0].y2, 100);
  assert.match(getLayoutSelection([{ ...line, startItemId: 'b' }, b], ['line', 'b']).reason, /Attached lines/);
});

test('swapped items leave their old frame and acquire their new containing frame', () => {
  const frame = { ...createCanvasItem('frame', 0, 0), id: 'frame', width: 656, height: 600 };
  const items = [frame, note('a', 32, 32, { frameId: 'frame' }), note('b', 1000, 0)];
  const { units } = getLayoutSelection(items, ['a', 'b']);
  const result = apply(
    items,
    layoutUpdates(
      items,
      units,
      new Map([
        [units[0].id, units[1].rect],
        [units[1].id, units[0].rect],
      ]),
      new Map(),
    ),
  );
  assert.equal(result[1].frameId, null);
  assert.equal(result[2].frameId, 'frame');
});

test('gap filling is enabled by default and backfills below a short middle item', () => {
  assert.equal(DEFAULT_ARRANGEMENT.fillGaps, true);
  const items = [
    note('left', 0, 0, { height: 640 }),
    note('middle', 400, 0, { height: 160 }),
    note('right', 800, 0, { height: 640 }),
    note('small', 1200, 0, { height: 176 }),
  ];
  const compact = arrange(items);
  assert.deepEqual(
    compact.map(({ x, y }) => [x, y]),
    [
      [0, 0],
      [336, 0],
      [672, 0],
      [336, 176],
    ],
  );
  const regular = arrange(items, { fillGaps: false });
  assert.deepEqual([regular[3].x, regular[3].y], [0, 656]);
  const counted = arrange(items, { mode: 'count', perRow: 3 });
  assert.deepEqual([counted[3].x, counted[3].y], [336, 176]);
});

test('compact mixed-size layouts keep grid gaps, maximum width and rigid rectangles', () => {
  const items = Array.from({ length: 40 }, (_, index) =>
    note(String(index), index * 2000, 0, { width: index % 4 === 0 ? 656 : 320, height: 80 + (index % 5) * 80 }),
  );
  for (const mode of ['width', 'count']) {
    const result = arrange(items, { mode, gap: 2, perRow: 3 });
    for (const [index, a] of result.entries()) {
      assert.equal(a.x % 16, 0);
      assert.equal(a.y % 16, 0);
      if (mode === 'width') assert.ok(a.x + a.width <= noteModuleWidth(3));
      for (const b of result.slice(index + 1)) {
        assert.ok(
          a.x + a.width + 32 <= b.x ||
            b.x + b.width + 32 <= a.x ||
            a.y + a.height + 32 <= b.y ||
            b.y + b.height + 32 <= a.y,
        );
      }
    }
  }
});
