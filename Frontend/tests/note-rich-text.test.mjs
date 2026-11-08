import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const browser = new Window();
globalThis.document = browser.document;
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
const {
  default: NoteContent,
  sanitizeNoteHtml,
  noteEditorContent,
  getNotePlainText,
} = await server.ssrLoadModule('/src/features/blocks/note/noteContent.tsx');
const { flattenItems, toProjectView } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { getSearchableText } = await server.ssrLoadModule('/src/features/search/utils/itemSearch.ts');
const { default: CanvasNotePreview } = await server.ssrLoadModule(
  '/src/features/canvas/components/CanvasNotePreview.tsx',
);
const { ThemeProvider } = await server.ssrLoadModule('/src/app/providers/ThemeProvider.tsx');
const uuid = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const note = (content, rich = false) => ({
  id: uuid(1),
  type: 'note',
  color: '#ffffff',
  x: 0,
  y: 0,
  zIndex: 1,
  width: 220,
  height: 170,
  content,
  ...(rich ? { contentFormat: 'tiptap-html', contentVersion: 1 } : {}),
});

test('legacy notes retain literal HTML-looking text and newlines when entering the editor', () => {
  const item = note('<strong>literal</strong> & Polish ąę\nSecond line');
  const json = noteEditorContent(item);
  assert.equal(json.content[0].content[0].text, '<strong>literal</strong> & Polish ąę');
  assert.equal(json.content.length, 2);
  const html = renderToStaticMarkup(createElement(NoteContent, { item }));
  assert.match(html, /&lt;strong&gt;literal&lt;\/strong&gt;/);
  assert.doesNotMatch(html, /<strong>/);
  assert.equal(getNotePlainText(item), item.content);
});

test('rich note previews retain safe selected-word formatting and plain-text search', () => {
  const item = note('<p><strong>First</strong> sentence &amp; <em>Polish</em></p><p>Next line</p>', true);
  const html = renderToStaticMarkup(createElement(NoteContent, { item }));
  assert.match(html, /<strong>First<\/strong> sentence &amp; <em>Polish<\/em>/);
  assert.equal(getSearchableText(item), 'First sentence & Polish\nNext line');
  const preview = renderToStaticMarkup(createElement(ThemeProvider, null, createElement(CanvasNotePreview, { item })));
  assert.match(preview, /<strong>First<\/strong>/);
  assert.doesNotMatch(preview, /&lt;p&gt;/);
});

test('note rendering and editor initialization strip active elements, URLs and all attributes', () => {
  const source =
    '<p onclick="evil()" style="background:url(https://evil.invalid)"><strong>Safe</strong><img src="https://evil.invalid/tracker"><script>evil()</script><svg onload="evil()"></svg><iframe src="https://evil.invalid"></iframe><a href="javascript:evil()">Link text</a><input autofocus></p>';
  const safe = sanitizeNoteHtml(source);
  assert.equal(safe, '<p><strong>Safe</strong>Link text</p>');
  assert.equal(noteEditorContent(note(source, true)), safe);
  const rendered = renderToStaticMarkup(createElement(NoteContent, { item: note(source, true) }));
  assert.equal(rendered, safe);
  assert.doesNotMatch(rendered, /script|iframe|img|onload|onclick|href|style|evil/);
});

test('rich-note format survives persistence and unsupported/mismatched versions are rejected', () => {
  const item = note('<p>A <u>formatted</u> note</p>', true);
  const writes = flattenItems([item], uuid(2));
  assert.deepEqual(writes[0].item.data, { content: item.content, contentFormat: 'tiptap-html', contentVersion: 1 });
  const view = toProjectView({
    project: { id: uuid(3), ownerId: uuid(4), name: 'Test', color: '#ffffff' },
    board: {
      board: { id: uuid(2) },
      items: writes.map(({ item }) => item),
      comments: [],
      links: [],
      tags: [],
      itemTags: [],
    },
  });
  assert.equal(view.items[0].content, item.content);
  assert.equal(view.items[0].contentFormat, 'tiptap-html');
  for (const patch of [
    { contentVersion: 2 },
    { contentFormat: 'html' },
    { contentVersion: undefined },
    { contentFormat: undefined },
  ])
    assert.throws(() => flattenItems([{ ...item, ...patch }], uuid(2)));
});
