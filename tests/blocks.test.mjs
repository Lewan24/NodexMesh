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
await server.close()

test("new blocks survive JSON persistence and have usable default dimensions", () => {
  for (const type of ["document", "embed", "code", "dispenser"]) {
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
