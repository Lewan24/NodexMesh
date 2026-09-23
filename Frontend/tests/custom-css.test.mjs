import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-custom-css-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { parseCustomCss, customCssRule, MAX_CUSTOM_CSS_LENGTH } = await server.ssrLoadModule(
  '/src/features/blocks/custom-css/customCss.ts',
);
const { default: ItemCssScope } = await server.ssrLoadModule('/src/features/blocks/custom-css/ItemCssScope.tsx');
const { flattenItems, toProjectView } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { validateItem } = await server.ssrLoadModule('/src/entities/board/itemSchema.ts');
await server.close();

test('CSS declarations preserve functions, quoted semicolons, variables and last-declaration precedence', () => {
  assert.deepEqual(
    parseCustomCss(
      '/* card */ border-radius: 12px; --label: "a;b"; filter: drop-shadow(0 2px 3px rgb(0 0 0 / .2)); border-radius: 24px !important;',
    ),
    [
      { property: 'border-radius', value: '12px' },
      { property: '--label', value: '"a;b"' },
      { property: 'filter', value: 'drop-shadow(0 2px 3px rgb(0 0 0 / .2))' },
      { property: 'border-radius', value: '24px' },
    ],
  );
});

test('rules, markup, broken syntax and oversized CSS never become a stylesheet', () => {
  for (const source of [
    'color: red; } body { display: none;',
    '@import "https://example.com";',
    'content: "</style><script>";',
    'color: red; /*',
    'color: var(--color;',
    'content: "unterminated;',
    'missing-colon',
    'color: red\\',
    'color: red\\}',
    'x'.repeat(MAX_CUSTOM_CSS_LENGTH + 1),
  ]) {
    assert.throws(() => parseCustomCss(source), source);
    assert.equal(customCssRule({ enabled: true, source }, 'one'), '', source);
  }
});

test('overrides target only the scoped root and disabling retains but does not apply the source', () => {
  const customCss = { enabled: true, source: 'opacity: .8; border-radius: 24px;' };
  const rule = customCssRule(customCss, 'one');
  assert.match(rule, /^\[data-item-css-scope="one"\] > :not\(style\)/);
  assert.match(rule, /opacity: .8 !important;/);
  assert.equal(customCssRule({ ...customCss, enabled: false }, 'one'), '');
  assert.equal(customCssRule(customCss, '"], body'), '');
  assert.equal(customCss.source, 'opacity: .8; border-radius: 24px;');
});

test('rendered nested items have distinct CSS scopes without extra layout boxes', () => {
  const item = { customCss: { enabled: true, source: 'border-radius: 24px;' } };
  const html = renderToStaticMarkup(
    createElement(
      ItemCssScope,
      { item },
      createElement(
        'section',
        { style: { background: 'red' } },
        createElement(ItemCssScope, { item }, createElement('div', null, 'Nested item')),
      ),
    ),
  );
  const scopes = [...html.matchAll(/<div data-item-css-scope="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(scopes.length, 2);
  assert.notEqual(scopes[0], scopes[1]);
  assert.match(html, /display:contents/);
  assert.match(html, /background:red/);
  assert.equal((html.match(/border-radius: 24px !important/g) ?? []).length, 2);
});

test('custom CSS travels as appearance data through board persistence', () => {
  const boardId = '00000000-0000-4000-8000-000000000001';
  const item = { ...createCanvasItem('note', 0, 0), customCss: { enabled: true, source: 'opacity: .8;' } };
  const items = flattenItems([item], boardId).map((mutation) => mutation.item);
  assert.equal(items.length, 1);
  assert.deepEqual(items[0].appearance.customCss, item.customCss);
  assert.equal(items[0].data.customCss, undefined);
  assert.doesNotThrow(() => validateItem(items[0]));
  const snapshot = {
    board: { id: boardId, projectId: 'project', name: 'Board' },
    items,
    comments: [],
    tags: [],
    itemTags: [],
    links: [],
  };
  // JSON persistence keeps both the enable flag and the original declarations.
  const restored = toProjectView({
    project: { id: 'project', name: 'Project' },
    board: JSON.parse(JSON.stringify(snapshot)),
  });
  assert.deepEqual(restored.items[0].customCss, item.customCss);
});
