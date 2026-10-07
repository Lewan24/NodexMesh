import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from 'fontkit';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const fontCss = await readFile(resolve(root, 'src/app/styles/fonts.css'), 'utf8');
const faces = [];
for (const [, imported] of fontCss.matchAll(/@import '([^']+)';/g)) {
  const cssPath = resolve(root, 'node_modules', imported);
  const css = await readFile(cssPath, 'utf8');
  for (const [, face] of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
    const ranges = /unicode-range:\s*([^;]+);/.exec(face)?.[1];
    faces.push({
      family: /font-family:\s*'([^']+)'/.exec(face)[1],
      weight: Number(/font-weight:\s*(\d+)/.exec(face)[1]),
      style: /font-style:\s*(\w+)/.exec(face)[1],
      display: /font-display:\s*(\w+)/.exec(face)[1],
      path: resolve(dirname(cssPath), /url\(([^)]+\.woff2)\)/.exec(face)[1]),
      ranges: ranges
        ? ranges.split(',').map((range) => {
            const [start, end = start] = range.trim().slice(2).split('-');
            return [parseInt(start, 16), parseInt(end, 16)];
          })
        : [[0, 0x10ffff]],
    });
  }
}
const fontCache = new Map();
async function supports(face, character) {
  const point = character.codePointAt(0);
  if (!face.ranges.some(([start, end]) => point >= start && point <= end)) return false;
  if (!fontCache.has(face.path)) fontCache.set(face.path, create(await readFile(face.path)));
  return fontCache.get(face.path).hasGlyphForCodePoint(point);
}
function matchingFaces(family, weight, style) {
  const candidates = faces.filter((face) => face.family === family);
  const matchedStyle = candidates.some((face) => face.style === style) ? style : 'normal';
  const styled = candidates.filter((face) => face.style === matchedStyle);
  const matchedWeight = styled.sort((a, b) => Math.abs(a.weight - weight) - Math.abs(b.weight - weight))[0]?.weight;
  return styled.filter((face) => face.weight === matchedWeight);
}
async function missingCharacters(stack, text, weight = 400, style = 'normal') {
  const families = stack.split(',').map((family) => family.trim().replace(/^"|"$/g, ''));
  const available = families.flatMap((family) => matchingFaces(family, weight, style));
  const missing = [];
  for (const character of new Set(text)) {
    let found = false;
    for (const face of available) {
      if (await supports(face, character)) {
        found = true;
        break;
      }
    }
    if (!found) missing.push(character);
  }
  return missing;
}

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': resolve(root, 'src') } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('pl');
const { FONT_FAMILIES, getFontFamilyCss } = await server.ssrLoadModule(
  '/src/features/blocks/typography/typographyUtils.ts',
);
const { default: FontPicker } = await server.ssrLoadModule('/src/features/appearance/FontPicker.tsx');
await server.close();

test('every selectable font has shipped Polish glyphs without any installed device fonts', async () => {
  const sample = 'Zażółć gęślą jaźń ĄĆĘŁŃÓŚŹŻ ąćęłńóśźż 0123456789';
  for (const font of FONT_FAMILIES) {
    for (const weight of [400, 700])
      for (const style of ['normal', 'italic']) {
        const missing = await missingCharacters(font.css, sample, weight, style);
        assert.deepEqual(missing, [], `${font.value}, ${weight}, ${style}: ${missing.join('')}`);
      }
  }
});

test('default handwriting fallback covers Polish letters that Short Stack does not contain', async () => {
  assert.ok((await missingCharacters('Short Stack', 'ĄĆĘŁŃŚŹŻąćęłńśźż')).length > 0);
  assert.deepEqual(await missingCharacters(getFontFamilyCss('short-stack'), 'ĄĆĘŁŃÓŚŹŻąćęłńóśźż'), []);
  assert.match(getFontFamilyCss(), /var\(--project-font,.*Patrick Hand/);
  assert.deepEqual(await missingCharacters(getFontFamilyCss('unknown'), 'ĄĆĘŁŃÓŚŹŻąćęłńóśźż'), []);
});

test('decorative fonts retain Polish coverage even if the preferred face fails to load', async () => {
  for (const font of FONT_FAMILIES) {
    const families = font.css.split(',');
    const preferred = families[0].trim().replace(/^"|"$/g, '');
    if (
      ['DM Sans', 'Noto Serif', 'JetBrains Mono'].includes(preferred) ||
      !faces.some((face) => face.family === preferred)
    )
      continue;
    assert.deepEqual(await missingCharacters(families.slice(1).join(','), 'ĄĆĘŁŃÓŚŹŻąćęłńóśźż'), [], font.value);
  }
});

test('font loading is local and uses swap rather than hiding text during download', async () => {
  const appCss = await readFile(resolve(root, 'src/app/styles/index.css'), 'utf8');
  assert.doesNotMatch(appCss + fontCss, /fonts\.(?:googleapis|gstatic)\.com/);
  assert.match(appCss, /@import '\.\/fonts\.css'/);
  assert.ok(faces.length > 0);
  for (const face of faces) assert.equal(face.display, 'swap', face.family);
  for (const font of FONT_FAMILIES) {
    assert.ok(
      font.css.split(',').some((family) => faces.some((face) => face.family === family.trim().replace(/^"|"$/g, ''))),
      font.value,
    );
  }
});

test('shipped font assets retain each font package license and attribution', async () => {
  const packages = new Set([...fontCss.matchAll(/@import '@fontsource\/([^/]+)\//g)].map((match) => match[1]));
  for (const name of packages) {
    const original = await readFile(resolve(root, `node_modules/@fontsource/${name}/LICENSE`), 'utf8');
    const included = await readFile(resolve(root, `public/font-licenses/${name}.txt`), 'utf8');
    assert.equal(included.trim(), original.replace(/\r/g, '').trim(), name);
  }
});

test('font picker renders the Polish alphabet using the same fallback stack as board content', () => {
  const markup = renderToStaticMarkup(
    createElement(FontPicker, { label: 'Czcionka', value: 'short-stack', onChange() {} }),
  );
  assert.match(markup, /Ąą Ćć Ęę Łł Ńń Óó Śś Źź Żż/);
  assert.match(markup, /font-family:[^>]+Patrick Hand/);
});
