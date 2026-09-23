import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { getSectionStyle, updateTextSections } = await server.ssrLoadModule(
  '/src/features/blocks/typography/sectionTypography.ts',
);
const { readableText, contrastRatio } = await server.ssrLoadModule('/src/features/blocks/typography/textContrast.ts');
const { defaultAppearance } = await server.ssrLoadModule('/src/features/appearance/appearanceModel.ts');
const { validateItem } = await server.ssrLoadModule('/src/entities/board/itemSchema.ts');
const { ThemeProvider } = await server.ssrLoadModule('/src/app/providers/ThemeProvider.tsx');
const { default: LinkBlock } = await server.ssrLoadModule('/src/features/blocks/link/LinkBlock.tsx');
const { default: SectionLabel } = await server.ssrLoadModule('/src/features/blocks/shared/SectionLabel.tsx');
await server.close();

test('section updates preserve independent styles and legacy font settings through JSON persistence', () => {
  const original = {
    id: 'a',
    type: 'link',
    typography: { fontFamily: 'serif', fontSize: 14, sections: { title: { bold: true } } },
  };
  const changed = updateTextSections(original, ['description', 'links'], { color: '#abcdef', fontSize: 22 });
  const saved = JSON.parse(JSON.stringify(changed));
  assert.equal(saved.typography.fontFamily, 'serif');
  assert.deepEqual(saved.typography.sections.title, { bold: true });
  assert.equal(getSectionStyle(saved.typography, 'description').fontSize, 22);
  assert.equal(getSectionStyle(saved.typography, 'links').color, '#abcdef');
  assert.deepEqual(original.typography.sections, { title: { bold: true } });
  const reset = updateTextSections(saved, ['description']);
  assert.deepEqual(getSectionStyle(reset.typography, 'description'), {});
  assert.equal(getSectionStyle(reset.typography, 'links').color, '#abcdef');
});

test('explicit normal weight and style override inherited bold and italic', () => {
  assert.deepEqual(getSectionStyle({ sections: { body: { bold: false, italic: false } } }, 'body'), {
    fontWeight: 400,
    fontStyle: 'normal',
  });
});

test('automatic foreground meets normal text contrast on every default solid palette color', () => {
  for (const mode of ['light', 'dark']) {
    for (const [role, color] of Object.entries(defaultAppearance[mode])) {
      if (typeof color !== 'string') continue;
      assert.ok(contrastRatio(readableText(color), color) >= 4.5, `${mode}.${role}`);
    }
  }
  assert.equal(readableText('#fff'), '#000000');
  assert.equal(readableText('#000'), '#ffffff');
});

test('item schema accepts saved sections and rejects unknown section names', () => {
  const item = {
    id: '00000000-0000-4000-8000-000000000001',
    boardId: '00000000-0000-4000-8000-000000000002',
    parentItemId: null,
    frameId: null,
    type: 'note',
    schemaVersion: 1,
    sortOrder: 0,
    x: 0,
    y: 0,
    width: null,
    height: null,
    zIndex: 0,
    locked: false,
    data: { content: 'hello' },
    appearance: { typography: { sections: { body: { color: '#ffffff', fontSize: 22 } } } },
  };
  assert.doesNotThrow(() => validateItem(JSON.parse(JSON.stringify(item))));
  item.appearance.typography.sections.unknown = { color: '#ffffff' };
  assert.throws(() => validateItem(item));
});

test('rendered link title, description and action receive independent sizes and colors', () => {
  const item = {
    id: 'test',
    type: 'link',
    url: 'https://example.com',
    title: 'Example title',
    description: 'Example description',
    width: 320,
    typography: {
      sections: {
        title: { color: '#123456', fontSize: 24 },
        description: { color: '#654321', fontSize: 16 },
        links: { color: '#abcdef', fontSize: 18 },
      },
    },
  };
  const html = renderToStaticMarkup(
    createElement(ThemeProvider, null, createElement(LinkBlock, { item, onUpdate() {}, onDelete() {} })),
  );
  assert.match(html, /<h4[^>]*style="[^"]*color:#123456;[^"]*font-size:24px/);
  assert.match(html, /<p[^>]*style="[^"]*color:#654321;[^"]*font-size:16px/);
  assert.match(html, /<a[^>]*style="[^"]*color:#abcdef;[^"]*font-size:18px/);
});

test('frame and section labels use their saved title style', () => {
  const item = {
    id: 'frame',
    type: 'frame',
    width: 320,
    typography: { sections: { title: { color: '#123456', fontSize: 22 } } },
  };
  const html = renderToStaticMarkup(
    createElement(SectionLabel, { item, title: 'Frame title', color: '#ffcc00', zoom: 1, onChange() {} }),
  );
  assert.match(html, /color:#123456/);
  assert.match(html, /font-size:22px/);
});
