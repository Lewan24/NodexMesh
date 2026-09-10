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
