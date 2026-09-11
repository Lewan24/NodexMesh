import test from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { createServer } from "vite"

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-block-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: {
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  },
  server: { middlewareMode: true, watch: null },
})
const { createCanvasItem } = await server.ssrLoadModule(
  "/src/features/canvas/utils/createCanvasItem.ts",
)
const { createEmptySibling } = await server.ssrLoadModule(
  "/src/features/canvas/utils/quickCreate.ts",
)
const { resolveLineItem } = await server.ssrLoadModule(
  "/src/features/canvas/utils/lineGeometry.ts",
)
const { getEmbedUrl } = await server.ssrLoadModule(
  "/src/features/blocks/embed/embedUrl.ts",
)
const { getSearchableText } = await server.ssrLoadModule(
  "/src/features/search/utils/itemSearch.ts",
)
const { dateDay, taskRange, shiftTask, scheduleRange, reorderTasks } = await server.ssrLoadModule('/src/features/blocks/timeline/timelineUtils.ts')
const { cloneItems, copyOrigin } = await server.ssrLoadModule('/src/features/canvas/utils/cloneItems.ts')
const { diagramTemplate, layoutDiagram, removeDiagramNodes } = await server.ssrLoadModule('/src/features/blocks/diagram/diagramUtils.ts')
const { loadProjects, saveProjects } = await server.ssrLoadModule('/src/features/projects/storage/projectStorage.ts')
const { createDrawing, drawingPath, drawingOutline, smoothDrawing, penPressure, joinDrawings, drawingStrokes } = await server.ssrLoadModule('/src/features/blocks/drawing/drawingUtils.ts')
const { insertTask, createTaskChecklist } = await server.ssrLoadModule('/src/features/canvas/hooks/useCrossItemDrop.ts')
const { changeItemLayer } = await server.ssrLoadModule('/src/features/projects/hooks/useProjectItems.ts')
const { getArrowHeadPoints } = await server.ssrLoadModule('/src/features/blocks/line/utils/lineRenderGeometry.ts')
const { isFrameMovementLocked } = await server.ssrLoadModule('/src/features/canvas/utils/frameGeometry.ts')
const { ItemHistory } = await server.ssrLoadModule('/src/features/canvas/utils/itemHistory.ts')
const { resolveCardColor } = await server.ssrLoadModule('/src/features/blocks/shared/cardAppearance.ts')
const { autoGrowthLayout, growsAutomatically } = await server.ssrLoadModule('/src/features/canvas/utils/autoGrowthLayout.ts')
const { ITEM_WIDTH, CANVAS_GRID_SIZE } = await server.ssrLoadModule('/src/features/canvas/constants.ts')
await server.close()

test("new blocks survive JSON persistence and have usable default dimensions", () => {
  for (const type of ["document", "embed", "code", "dispenser", "timeline", "diagram"]) {
    const item = createCanvasItem(type, -32, 64)
    assert.equal(item.type, type)
    const restored = JSON.parse(JSON.stringify(item))
    assert.equal(restored.id, item.id)
    assert.equal(restored.type, type)
    assert.equal(restored.x, -32)
    assert.ok(item.width >= 240 && item.height >= 200)
  }
})

test("divider snaps both endpoints and cannot resolve item attachments", () => {
  const divider = createCanvasItem("divider", 23, -23)
  for (const key of ["x", "y", "x2", "y2"])
    assert.equal(Math.abs(divider[key] % 16), 0)
  assert.equal(divider.arrowEnd, false)
  const note = createCanvasItem("note", 200, 200)
  const resolved = resolveLineItem(
    { ...divider, startItemId: note.id, endItemId: note.id, arrowEnd: true },
    [note],
  )
  assert.equal(resolved.x, divider.x)
  assert.equal(resolved.startItemId, undefined)
  assert.equal(resolved.endItemId, undefined)
  assert.equal(resolved.arrowEnd, false)
})

test("quick creation preserves style but clears content and private metadata", () => {
  const source = {
    ...createCanvasItem("note", 0, 0),
    content: "Do not copy",
    color: "#abcdef",
    comments: [{ id: "c", text: "Discussion" }],
    tags: ["todo"],
    dispenserId: "stack",
  }
  const copy = createEmptySibling(source)
  assert.notEqual(copy.id, source.id)
  assert.equal(copy.color, source.color)
  assert.equal(copy.content, "")
  assert.equal(copy.comments, undefined)
  assert.equal(copy.tags, undefined)
  assert.equal(copy.dispenserId, undefined)
  assert.equal(source.content, "Do not copy")
})

test("kanban copies retain independent empty columns; media copies clear sources", () => {
  const board = createCanvasItem("kanban", 0, 0)
  board.columns[0].cards.push({ id: "card", text: "Task", done: true })
  const copy = createEmptySibling(board)
  assert.equal(copy.columns.length, board.columns.length)
  assert.equal(copy.columns[0].title, board.columns[0].title)
  assert.notEqual(copy.columns[0].id, board.columns[0].id)
  assert.deepEqual(copy.columns[0].cards, [])
  for (const type of ["image", "embed", "link"]) {
    const sibling = createEmptySibling({
      ...createCanvasItem(type, 0, 0),
      url: "https://example.com",
    })
    assert.equal(sibling.url, "")
  }
  for (const type of ["frame", "line", "dispenser"])
    assert.equal(createEmptySibling(createCanvasItem(type, 0, 0)), null)
})

test("dispenser creates centered flashcards without forcing a placement lattice", () => {
  const first = createCanvasItem("note", 16, 32, {
    color: "#fde68a",
    dispenserId: "stack",
  })
  assert.equal(first.height, 160)
  assert.equal(first.typography.textAlign, 'center')
  assert.equal(first.typography.verticalAlign, 'middle')
  const second = createCanvasItem('note', 43, 87, { color: '#fde68a', dispenserId: 'stack' })
  assert.equal(second.x, 43)
  assert.equal(second.y, 87)
})

test('documents start at one and a half note widths and grow from 600px', () => {
  const document = createCanvasItem('document', 0, 0)
  const note = createCanvasItem('note', 0, 0)
  assert.equal(document.width, note.width * 1.5)
  assert.equal(document.height, 600)
  assert.equal(document.autoHeight, true)
})

test("embed URL conversion isolates videos and rejects executable URLs", () => {
  for (const value of [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=20",
    "https://youtube.com/shorts/dQw4w9WgXcQ",
  ]) {
    assert.equal(
      getEmbedUrl(value),
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    )
  }
  assert.equal(
    getEmbedUrl("https://vimeo.com/123456"),
    "https://player.vimeo.com/video/123456",
  )
  assert.equal(
    getEmbedUrl("https://example.com/app"),
    "https://example.com/app",
  )
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "invalid",
    "https://youtube.com/watch?v=bad",
  ])
    assert.equal(getEmbedUrl(value), null)
})

test("new block content participates in board search", () => {
  assert.match(
    getSearchableText({
      ...createCanvasItem("document", 0, 0),
      content: "<h1>Project plan</h1>",
    }),
    /Project plan/,
  )
  assert.match(
    getSearchableText({
      ...createCanvasItem("code", 0, 0),
      content: "const answer = 42;",
    }),
    /answer/,
  )
  assert.match(
    getSearchableText({
      ...createCanvasItem("embed", 0, 0),
      url: "https://example.com",
    }),
    /example.com/,
  )
})

test('timeline dates reject invalid days and remain stable across DST and year boundaries', () => {
  assert.equal(dateDay('2026-02-30'), null)
  const task = { start: '2026-03-28', end: '2026-03-30' }
  assert.equal(taskRange(task).end - taskRange(task).start, 2)
  assert.deepEqual(shiftTask(task, -3), { start: '2026-03-25', end: '2026-03-27' })
  assert.deepEqual(shiftTask(task, -10, true), { start: '2026-03-28', end: '2026-03-28' })
  assert.deepEqual(shiftTask({ start: '2026-12-31', end: '2026-12-31' }, 1), { start: '2027-01-01', end: '2027-01-01' })
  const range = scheduleRange([task])
  assert.equal(new Date(range.start * 86400000).getUTCDay(), 1)
  assert.ok(range.start <= taskRange(task).start && range.start + range.days > taskRange(task).end)
})

test('diagram removal clears incident edges and layout handles cycles without losing nodes', () => {
  const graph = diagramTemplate()
  const removed = graph.nodes[1].id
  const next = removeDiagramNodes(graph.nodes, graph.edges, new Set([removed]))
  assert.equal(next.nodes.length, graph.nodes.length - 1)
  assert.ok(next.edges.every(edge => edge.source !== removed && edge.target !== removed))
  const cyclic = [...graph.edges, { id: 'cycle', source: graph.nodes[4].id, target: graph.nodes[0].id }]
  const laidOut = layoutDiagram(graph.nodes, cyclic)
  assert.equal(laidOut.length, graph.nodes.length)
  assert.equal(new Set(laidOut.map(node => JSON.stringify(node.position))).size, graph.nodes.length)
  assert.deepEqual(laidOut.map(node => node.id), graph.nodes.map(node => node.id))
})

test('project storage retains trashed content and an intentionally empty project list', () => {
  const values = new Map()
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } })
  try {
    const project = { id: 'p', name: 'Archived plan', ownerId: 'qa', color: '#7c3aed', deletedAt: '2026-09-09T00:00:00Z', items: [createCanvasItem('timeline', 0, 0)] }
    saveProjects('qa', [project])
    assert.deepEqual(loadProjects('qa'), JSON.parse(JSON.stringify([project])))
    saveProjects('qa', [])
    assert.deepEqual(loadProjects('qa'), [])
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else delete globalThis.localStorage
  }
})

test('planning block quick copies are empty and search includes nested content', () => {
  const timeline = { ...createCanvasItem('timeline', 0, 0), tasks: [{ id: 't', title: 'Release', start: '2026-10-01', end: '2026-10-02', done: false, color: '#7c3aed', checklist: [{ id: 'c', text: 'Deploy API', done: false }] }] }
  assert.match(getSearchableText(timeline), /Deploy API/)
  assert.deepEqual(createEmptySibling(timeline).tasks, [])
  const diagram = { ...createCanvasItem('diagram', 0, 0), ...diagramTemplate() }
  assert.match(getSearchableText(diagram), /Valid request/)
  assert.deepEqual(createEmptySibling(diagram).nodes, [])
  assert.deepEqual(createEmptySibling(diagram).edges, [])
})

test('copying a connected selection remaps identities and detaches external connections', () => {
  const note = { ...createCanvasItem('note', 32, 48), id: 'a', content: 'Keep content' }
  const other = { ...createCanvasItem('note', 320, 48), id: 'b' }
  const internal = { ...createCanvasItem('line', 32, 48), id: 'edge', startItemId: 'a', endItemId: 'b', x2: 320, y2: 48 }
  const external = { ...internal, id: 'external', endItemId: 'outside' }
  const original = structuredClone([note, other, internal, external])
  const clones = cloneItems(original, 64, 80, 10)
  assert.equal(clones[0].content, 'Keep content')
  assert.equal(clones[0].x, 96)
  assert.equal(clones[0].y, 128)
  assert.equal(clones[2].startItemId, clones[0].id)
  assert.equal(clones[2].endItemId, clones[1].id)
  assert.equal(clones[3].endItemId, undefined)
  assert.equal(clones[2].x2, 384)
  assert.equal(new Set(clones.map(item => item.id)).size, 4)
  assert.deepEqual(clones.map(item => item.zIndex), [10, 11, 12, 13])
  assert.deepEqual(original, [note, other, internal, external])
  assert.deepEqual(copyOrigin([{ ...internal, x: 200, x2: -10, y: 30, y2: -40 }]), { x: -10, y: -40 })
})

test('duplicating nested content retains local positions and remaps graph and checklist IDs', () => {
  const graph = { ...createCanvasItem('diagram', 0, 0), ...diagramTemplate() }
  const column = { ...createCanvasItem('column', 100, 200), items: [graph, { ...createCanvasItem('checklist', 0, 0), entries: [{ id: 'check', text: 'Ship', done: true }] }] }
  const [copy] = cloneItems([column], 32, 32, 1)
  assert.equal(copy.items[0].x, 0)
  assert.notEqual(copy.items[0].nodes[0].id, graph.nodes[0].id)
  assert.equal(copy.items[0].edges[0].source, copy.items[0].nodes[0].id)
  assert.notEqual(copy.items[1].entries[0].id, 'check')
  copy.items[1].entries[0].text = 'Changed'
  assert.equal(column.items[1].entries[0].text, 'Ship')
})

test('timeline reordering preserves dates, checklists and task identities', () => {
  const tasks = [{ id: 'a', start: '2026-09-10', checklist: [{ id: 'c', done: true }] }, { id: 'b' }, { id: 'c' }]
  const reordered = reorderTasks(tasks, 'c', 'a')
  assert.deepEqual(reordered.map(task => task.id), ['c', 'a', 'b'])
  assert.equal(reordered[1], tasks[0])
  assert.equal(reorderTasks(tasks, 'missing', 'a'), tasks)
  assert.deepEqual(tasks.map(task => task.id), ['a', 'b', 'c'])
})


test("freehand strokes preserve geometry across negative positions, persistence and copies", () => {
  const points = [{ x: -80, y: 35 }, { x: -20, y: -10 }, { x: 30, y: 90 }];
  const drawing = createDrawing(points, 9);
  assert.equal(drawing.type, 'drawing');
  assert.equal(drawing.zIndex, 9);
  drawing.points.forEach((point, index) => {
    assert.equal(point.x + drawing.x, points[index].x);
    assert.equal(point.y + drawing.y, points[index].y);
    assert.ok(point.x >= 0 && point.x <= drawing.viewWidth);
    assert.ok(point.y >= 0 && point.y <= drawing.viewHeight);
  });
  const resized = JSON.parse(JSON.stringify({ ...drawing, width: 600, height: 400 }));
  assert.equal(drawingPath(resized.points), drawingPath(drawing.points));
  const [copy] = cloneItems([resized], 32, 48, 10);
  assert.notEqual(copy.id, drawing.id);
  assert.equal(copy.x, drawing.x + 32);
  assert.deepEqual(copy.points, drawing.points);
  copy.points[0].x = 999;
  assert.notEqual(copy.points[0].x, drawing.points[0].x);
});

test("freehand click and horizontal strokes have nonzero resize bounds", () => {
  assert.equal(createDrawing([], 1), null);
  assert.equal(createDrawing([{ x: NaN, y: 0 }], 1), null);
  for (const points of [[{ x: 4, y: 4 }], [{ x: 2, y: 10 }, { x: 120, y: 10 }]]) {
    const item = createDrawing(points, 1);
    assert.ok(item.width >= 12 && item.height >= 12);
    assert.ok(drawingPath(item.points).length > 0);
    assert.equal(createEmptySibling(item), null);
  }
});


test("pen speed produces bounded gradual width and pressure survives copying", () => {
  assert.ok(penPressure(2, 30) > penPressure(80, 10));
  assert.ok(penPressure(1000, 0) >= .45);
  assert.ok(penPressure(0, 100) <= 1.6);
  const drawing = createDrawing([{ x: 0, y: 0, pressure: 1.5 }, { x: 40, y: 20, pressure: .5 }], 1);
  const [copy] = cloneItems([JSON.parse(JSON.stringify(drawing))], 20, 20, 2);
  assert.deepEqual(copy.points.map(point => point.pressure), [1.5, .5]);
  assert.equal(drawingOutline(copy.points, 3), drawingOutline(drawing.points, 3));
});

test("smoothing damps jitter without overshoot and renders dots and reversals", () => {
  const points = [{ x: 0, y: 0 }, { x: 10, y: 4 }, { x: 20, y: -4 }, { x: 30, y: 0 }];
  const smooth = smoothDrawing(points);
  assert.equal(smooth[0].x, 0);
  assert.equal(smooth.at(-1).x, 30);
  assert.ok(Math.max(...smooth.map(point => Math.abs(point.y))) < 4);
  assert.ok(smooth.every(point => point.x >= 0 && point.x <= 30));
  for (const pathPoints of [points, [{ x: 0, y: 0 }], [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }]]) {
    const outline = drawingOutline(pathPoints, 3);
    assert.ok(outline.endsWith('Z'));
    assert.ok(!/NaN|Infinity/.test(outline));
  }
});


test("tasks transfer between checklist and Kanban without losing completion or identity", () => {
  const task = { id: 'task', text: 'Ship feature', done: true };
  const board = createCanvasItem('kanban', 0, 0);
  const next = insertTask(board, task, 0, board.columns[1].id);
  assert.deepEqual(next.columns[1].cards, [task]);
  assert.equal(board.columns[1].cards.length, 0);
  const checklist = createCanvasItem('checklist', 0, 0);
  const restored = insertTask(checklist, next.columns[1].cards[0], 99);
  assert.deepEqual(restored.entries, [task]);
  assert.equal(insertTask(restored, task, 0).entries.length, 1);
  const locked = { ...checklist, locked: true };
  assert.equal(insertTask(locked, task, 0), locked);
});

test("frames remain at layer zero through all layer operations and copies", () => {
  const frame = { ...createCanvasItem('frame', 0, 0), zIndex: 99 };
  const note = createCanvasItem('note', 0, 0);
  const text = { ...createCanvasItem('text', 0, 0), zIndex: 2 };
  for (const action of ['front', 'back', 'forward', 'backward']) {
    for (const id of [frame.id, note.id]) {
      const items = changeItemLayer([note, frame, text], id, action);
      assert.equal(items.find(item => item.type === 'frame').zIndex, 0);
      assert.ok(items.filter(item => item.type !== 'frame').every(item => item.zIndex > 0));
    }
  }
  assert.equal(createCanvasItem('frame', 0, 0).zIndex, 0);
  assert.equal(cloneItems([frame], 20, 20, 100)[0].zIndex, 0);
});

test("filled arrowhead geometry scales with line thickness in both directions", () => {
  for (const angle of [0, Math.PI, Math.PI / 3]) {
    const thin = getArrowHeadPoints(50, 50, angle, 1);
    const thick = getArrowHeadPoints(50, 50, angle, 8);
    const span = head => Math.hypot(head.firstX - head.secondX, head.firstY - head.secondY);
    assert.ok(span(thick) > span(thin) * 2);
    assert.equal(thick.tipX, 50); assert.equal(thick.tipY, 50);
  }
});


test("frame movement follows current locks in its contents, including nested items", () => {
  const frame = createCanvasItem('frame', 0, 0, { width: 800, height: 600 });
  const child = { ...createCanvasItem('note', 40, 50), height: 120, locked: true };
  const outside = { ...child, id: 'outside', x: 1000 };
  assert.equal(isFrameMovementLocked(frame, [frame, child]), true);
  assert.equal(isFrameMovementLocked(frame, [frame, { ...child, locked: false }]), false);
  assert.equal(isFrameMovementLocked(frame, [frame, outside]), false);
  const column = { ...createCanvasItem('column', 40, 40), height: 300, items: [child] };
  assert.equal(isFrameMovementLocked(frame, [frame, column]), true);
  assert.equal(isFrameMovementLocked({ ...frame, locked: true }, []), true);
  assert.equal(isFrameMovementLocked(frame, [frame]), false);
});


test('joined drawings preserve separate ink, pressure, styles and resized geometry', () => {
  const a = { ...createDrawing([{ x: 10, y: 20, pressure: .7 }, { x: 60, y: 40, pressure: 1.3 }], 2), color: '#ff0000', strokeWidth: 6 };
  a.width *= 2; a.height *= .5;
  const b = { ...createDrawing([{ x: 90, y: 10 }, { x: 80, y: 30 }], 1), color: '#0000ff' };
  const joined = joinDrawings([a, b]);
  assert.equal(joined.strokes.length, 2);
  assert.deepEqual(joined.strokes.map(s => s.color), [b.color, a.color]);
  for (const [index, source] of [b, a].entries()) {
    const stroke = joined.strokes[index];
    assert.equal(stroke.strokeWidth, source.strokeWidth);
    assert.equal(drawingOutline(stroke.points, stroke.strokeWidth), drawingOutline(source.points, source.strokeWidth));
    source.points.forEach((point, i) => {
      assert.equal(joined.x + stroke.x + stroke.points[i].x * stroke.scaleX, source.x + point.x * source.width / source.viewWidth);
      assert.equal(joined.y + stroke.y + stroke.points[i].y * stroke.scaleY, source.y + point.y * source.height / source.viewHeight);
    });
  }
  assert.deepEqual(JSON.parse(JSON.stringify(joined)), joined);
  const clone = cloneItems([joined], 100, 200, 4)[0];
  assert.deepEqual(clone.strokes, joined.strokes);
  clone.strokes[0].points[0].x += 5;
  assert.notEqual(clone.strokes[0].points[0].x, joined.strokes[0].points[0].x);
});

test('joining a resized joined drawing composes transforms and respects locks', () => {
  const a = createDrawing([{ x: 10, y: 20 }], 1);
  const b = createDrawing([{ x: 90, y: 10 }], 2);
  assert.equal(joinDrawings([a]), null);
  assert.equal(joinDrawings([a, { ...b, locked: true }]), null);
  const joined = joinDrawings([a, b]);
  joined.width *= 2; joined.height *= 3;
  const result = joinDrawings([joined, createDrawing([{ x: -30, y: -20 }], 3)]);
  assert.equal(result.strokes.length, 3);
  drawingStrokes(joined).forEach((stroke, i) => {
    const next = result.strokes[i];
    assert.equal(result.x + next.x, joined.x + stroke.x * 2);
    assert.equal(result.y + next.y, joined.y + stroke.y * 3);
    assert.equal(next.scaleX, stroke.scaleX * 2);
    assert.equal(next.scaleY, stroke.scaleY * 3);
  });
});


test('history records checklist, timeline and diagram mutations without explicit pushes', () => {
  const checklist = createCanvasItem('checklist', 0, 0);
  checklist.entries = [{ id: 'entry', text: 'Task', done: false }];
  const timeline = createCanvasItem('timeline', 0, 0);
  timeline.tasks = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }];
  const diagram = createCanvasItem('diagram', 0, 0);
  const original = [checklist, timeline, diagram];
  const history = new ItemHistory(original, 20);
  const toggled = [{ ...checklist, entries: [{ ...checklist.entries[0], done: true }] }, timeline, diagram];
  history.observe(toggled);
  history.boundary();
  const reordered = [toggled[0], { ...timeline, tasks: [...timeline.tasks].reverse() }, diagram];
  history.observe(reordered);
  history.boundary();
  const connected = [reordered[0], reordered[1], { ...diagram, ...diagramTemplate() }];
  history.observe(connected);
  assert.deepEqual(history.undo(connected), reordered);
  assert.deepEqual(history.undo(reordered), toggled);
  assert.deepEqual(history.undo(toggled), original);
  assert.equal(history.undo(original), undefined);
});

test('history groups gestures, ignores no-ops and isolates project resets', () => {
  const original = [createCanvasItem('note', 0, 0)];
  const history = new ItemHistory(original, 2);
  history.boundary(); history.observe(structuredClone(original)); history.boundary();
  let moved;
  for (let x = 1; x < 20; x++) { moved = [{ ...original[0], x }]; history.observe(moved); }
  assert.deepEqual(history.undo(moved), original);
  assert.equal(history.undo(original), undefined);
  history.observe(moved); history.clear(original);
  assert.equal(history.undo(original), undefined);
});

test('default white cards follow the theme; custom colors remain fixed', () => {
  for (const value of [undefined, '#fff', '#FFFFFF', '#ffffff', 'white']) {
    assert.equal(resolveCardColor(value, 'light'), '#ffffff');
    assert.equal(resolveCardColor(value, 'dark'), '#1f1233');
  }
  for (const value of ['#fefce8', '#0d2a35', '#ff0000']) {
    assert.equal(resolveCardColor(value, 'light'), value);
    assert.equal(resolveCardColor(value, 'dark'), value);
  }
  for (const type of ['note', 'checklist', 'kanban', 'column', 'document', 'timeline', 'diagram', 'embed', 'image', 'link', 'code', 'dispenser']) assert.equal(createCanvasItem(type, 0, 0).color, '#ffffff');
});


test('native text undo does not leave an empty board undo step', () => {
  const initial = [createCanvasItem('note', 0, 0)];
  const history = new ItemHistory(initial, 10);
  const moved = [{ ...initial[0], x: 100 }]; history.observe(moved); history.boundary();
  const typed = [{ ...moved[0], content: 'Text' }]; history.observe(typed);
  history.observe(moved);
  assert.deepEqual(history.undo(moved), initial);
});


test('default item widths span complete grid cells', () => {
  for (const [type, width] of Object.entries(ITEM_WIDTH)) assert.equal(width % CANVAS_GRID_SIZE, 0, type);
  assert.equal(ITEM_WIDTH.document / ITEM_WIDTH.note, 1.5);
});

test('automatic growth pushes a vertical chain while preserving other columns and overlaps', () => {
  const source = createCanvasItem('checklist', 0, 0);
  const first = { ...createCanvasItem('note', 0, 128), height: 80 };
  const second = { ...createCanvasItem('note', 0, 224), height: 80 };
  const side = createCanvasItem('note', 400, 128);
  const overlapping = createCanvasItem('note', 0, 48);
  const before = new Map([[source.id, { width: 320, height: 100 }], [first.id, { width: 320, height: 80 }], [second.id, { width: 320, height: 80 }]]);
  const after = new Map(before).set(source.id, { width: 320, height: 180 });
  const patches = autoGrowthLayout([source, first, second, side, overlapping], source.id, before, after);
  assert.equal(patches.get(first.id).y, 196);
  assert.equal(patches.get(second.id).y, 292);
  assert.equal(patches.has(side.id), false);
  assert.equal(patches.has(overlapping.id), false);
  assert.equal(autoGrowthLayout([source, first], source.id, before, before).size, 0);
  assert.equal(autoGrowthLayout([source, first], source.id, new Map(), after).size, 0);
  assert.equal(autoGrowthLayout([{ ...source, height: 180 }, first], source.id, before, after).size, 0);
  assert.equal(autoGrowthLayout([source, { ...first, locked: true }], source.id, before, after).size, 0);
  assert.equal(growsAutomatically({ ...createCanvasItem('document', 0, 0), autoHeight: true }), true);
  assert.equal(growsAutomatically({ ...createCanvasItem('document', 0, 0), autoHeight: false }), false);
});

test('automatic growth expands containing frames and preserves standalone line geometry', () => {
  const source = createCanvasItem('checklist', 0, 0);
  const line = { ...createCanvasItem('line', 50, 150), x2: 20, y2: 130 };
  const frame = { ...createCanvasItem('frame', -16, -16), width: 400, height: 200 };
  const before = new Map([[source.id, { width: 320, height: 100 }]]);
  const after = new Map(before).set(source.id, { width: 320, height: 180 });
  const patches = autoGrowthLayout([source, line, frame], source.id, before, after);
  assert.equal(patches.get(line.id).y, 216);
  assert.equal(patches.get(line.id).y2, 196);
  assert.ok(patches.get(frame.id).height > frame.height);
});

test('dropping a task on canvas creates an independent checklist with its completion', () => {
  const task = { id: 'kept-id', text: 'Ship release', done: true };
  const checklist = createTaskChecklist(task, -32, 160);
  assert.equal(checklist.type, 'checklist');
  assert.equal(checklist.x, -32); assert.equal(checklist.y, 160);
  assert.deepEqual(checklist.entries, [task]);
  assert.notEqual(checklist.entries[0], task);
  assert.equal(checklist.color, '#ffffff');
});
