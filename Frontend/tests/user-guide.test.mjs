import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
const { guideChapters, searchGuide } = await server.ssrLoadModule('/src/features/user-guide/guideContent.ts');

test('both languages cover every chapter with substantial instructions and actual screenshot files', () => {
  const polish = guideChapters('pl');
  const english = guideChapters('en');
  assert.equal(polish.length, 21);
  assert.deepEqual(
    polish.map(({ id }) => id),
    english.map(({ id }) => id),
  );
  for (const chapters of [polish, english]) {
    assert.equal(new Set(chapters.map(({ id }) => id)).size, chapters.length);
    for (const chapter of chapters) {
      assert.ok(chapter.title && chapter.summary);
      assert.ok(chapter.sections.length >= 3, chapter.id);
      for (const section of chapter.sections) {
        assert.ok(section.title);
        assert.ok(
          (section.paragraphs?.length ?? 0) + (section.steps?.length ?? 0) > 0,
          `${chapter.id}/${section.title}`,
        );
      }
      if (chapter.image) {
        assert.ok(chapter.image.alt && chapter.image.caption);
        assert.match(chapter.image.file, /^[a-z-]+\.png$/);
        const image = readFileSync(new URL(`../public/user-guide/${chapter.image.file}`, import.meta.url));
        assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(image.readUInt32BE(16), 1280);
        assert.equal(image.readUInt32BE(20), 800);
      }
    }
  }
  assert.equal(polish.filter(({ admin }) => admin).length, 4);
});

test('guide search matches full instructions, multiple words and diacritics in either language', () => {
  const polish = guideChapters('pl');
  assert.equal(searchGuide(polish, '').length, 21);
  assert.ok(searchGuide(polish, 'STALE PUNKTY').some(({ id }) => id === 'connections'));
  assert.ok(searchGuide(polish, 'nieprzypisane deadline').some(({ id }) => id === 'tasks'));
  assert.ok(searchGuide(polish, 'utc').some(({ id }) => id === 'admin-audit'));
  assert.equal(searchGuide(polish, 'no-such-chapter-123').length, 0);
  assert.ok(searchGuide(guideChapters('en'), 'fixed attachment').some(({ id }) => id === 'connections'));
  assert.equal(guideChapters('pl-PL')[0].title, polish[0].title);
  assert.equal(guideChapters('en-GB')[0].title, guideChapters('en')[0].title);
});
