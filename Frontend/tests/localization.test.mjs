import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-localization-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const {
  default: i18n,
  translate,
  changeLanguage,
  readLanguage,
  languageKey,
  locale,
  displayLabel,
} = await server.ssrLoadModule('/src/shared/i18n/index.ts');
const { default: LanguageSelect } = await server.ssrLoadModule('/src/shared/i18n/LanguageSelect.tsx');
const { default: CanvasLostPrompt } = await server.ssrLoadModule(
  '/src/features/canvas/components/CanvasLostPrompt.tsx',
);
const { createMockWorkspace } = await server.ssrLoadModule('/src/features/projects/services/mockWorkspace.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { diffBoard, toProjectView } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { default: AccountMenu } = await server.ssrLoadModule('/src/layout/appbar/components/AccountMenu.tsx');
const { ApiError, fail } = await server.ssrLoadModule('/src/shared/api/errors.ts');
await server.close();

test('Polish is the default; invalid and unavailable storage fall back to Polish', () => {
  assert.equal(i18n.language, 'pl');
  assert.equal(readLanguage(), 'pl');
  assert.equal(readLanguage({ getItem: () => 'de' }), 'pl');
  assert.equal(readLanguage({ getItem: () => 'en' }), 'en');
  assert.equal(
    readLanguage({
      getItem: () => {
        throw new Error('blocked');
      },
    }),
    'pl',
  );
});

test('both catalogs contain the same messages and interpolation variables', async () => {
  const read = async (language) =>
    JSON.parse(await readFile(new URL(`../src/shared/i18n/locales/${language}.json`, import.meta.url), 'utf8'));
  const en = await read('en');
  const pl = await read('pl');
  assert.deepEqual(Object.keys(pl).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    assert.ok(pl[key].trim(), key);
    assert.deepEqual(pl[key].match(/{{\w+}}/g)?.sort() ?? [], en[key].match(/{{\w+}}/g)?.sort() ?? [], key);
  }
});

test('switching language updates rendering, plurals, dates, document language and stored preference', async () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) },
  });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { lang: '' } } });
  try {
    await changeLanguage('pl');
    assert.equal(translate('commentCount', { count: 1 }), '1 komentarz');
    assert.equal(translate('commentCount', { count: 2 }), '2 komentarze');
    assert.equal(translate('commentCount', { count: 5 }), '5 komentarzy');
    assert.equal(translate('commentCount', { count: 22 }), '22 komentarze');
    assert.equal(locale(), 'pl-PL');
    assert.equal(displayLabel('Viewer'), 'Przeglądający');
    assert.match(renderToStaticMarkup(createElement(LanguageSelect)), /Język/);
    assert.match(renderToStaticMarkup(createElement(CanvasLostPrompt, { visible: true })), /Powrót do tablicy/);
    await changeLanguage('en');
    assert.equal(document.documentElement.lang, 'en');
    assert.equal(values.get(languageKey), 'en');
    assert.equal(readLanguage(localStorage), 'en');
    assert.equal(locale(), 'en-GB');
    assert.equal(translate('commentCount', { count: 2 }), '2 comments');
    assert.match(renderToStaticMarkup(createElement(LanguageSelect)), /Language/);
    assert.match(renderToStaticMarkup(createElement(CanvasLostPrompt, { visible: true })), /Return to board/);
  } finally {
    for (const [key, descriptor] of [
      ['localStorage', previousStorage],
      ['document', previousDocument],
    ]) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await changeLanguage('pl');
  }
});

test('Polish UI preserves board protocol keys and user content during persistence', async () => {
  await changeLanguage('pl');
  const values = new Map();
  const workspace = createMockWorkspace(
    'localization-user',
    { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) },
    () => 'localization-user',
  );
  const [snapshot] = await workspace.projects.list();
  const item = createCanvasItem('note', 10, 20);
  item.content = 'My original text';
  const mutation = diffBoard(snapshot.board, [item]);
  const saved = await workspace.boards.mutate(snapshot.project.id, snapshot.board.board.id, mutation);
  assert.equal(saved.items[0].data.content, 'My original text');
  assert.equal(saved.items[0].type, 'note');
  const view = toProjectView({ project: snapshot.project, board: saved });
  assert.equal(view.items[0].content, 'My original text');
  assert.equal(diffBoard(saved, view.items), null);
});

test('account language control appears between profile and theme actions', async () => {
  await changeLanguage('en');
  try {
    const html = renderToStaticMarkup(
      createElement(AccountMenu, { user: { name: 'Original name', username: 'original' }, open: true, theme: 'dark' }),
    );
    const profile = html.indexOf('Profile and security');
    const language = html.indexOf('Language');
    const theme = html.indexOf('Switch to light mode');
    assert.ok(profile >= 0 && language > profile && theme > language);
    assert.match(html, /value="pl"/);
    assert.match(html, /value="en"/);
  } finally {
    await changeLanguage('pl');
  }
});

test('API errors are localized without changing error codes or losing interpolated local errors', async () => {
  await changeLanguage('pl');
  const error = new ApiError({ type: 'about:blank', status: 404, code: 'not_found', title: 'Project not found.' });
  assert.equal(error.message, translate('Project not found.'));
  assert.equal(error.problem.code, 'not_found');
  const message = translate('Invalid {{value1}} content or geometry.', { value1: 'note' });
  assert.throws(
    () => fail(422, 'invalid_item', message),
    (error) => error.message === message,
  );
});
