import { test, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

async function openFixture(page, count) {
  await page.goto(`/e2e/performance/?count=${count}`);
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  await expect(page.locator('[data-board-item-id="note-0"]')).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

const scenarios = [
  ...[100, 500, 1000].map((count) => ({ count, cpuSlowdown: 4, panOnly: false })),
  { count: 1000, cpuSlowdown: 1, panOnly: false },
  { count: 1000, cpuSlowdown: 4, panOnly: true },
];
for (const { count, cpuSlowdown, panOnly } of scenarios) {
  test(`profile ${panOnly ? 'pan' : 'pan and zoom'} with ${count} notes at ${cpuSlowdown}x CPU slowdown`, async ({
    page,
  }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openFixture(page, count);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
    await cdp.send('Performance.enable');
    const before = await cdp.send('Performance.getMetrics');
    if (process.env.CANVAS_CPU_PROFILE === '1') {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.start');
    }
    const metrics = await page.evaluate(
      async ({ panOnly }) => {
        const longTasks = [];
        const observer = new PerformanceObserver((entries) =>
          longTasks.push(...entries.getEntries().map((entry) => entry.duration)),
        );
        observer.observe({ type: 'longtask', buffered: false });
        const samples = [];
        let previous;
        for (let i = 0; i < 90; i++) {
          const timestamp = await new Promise(requestAnimationFrame);
          if (previous !== undefined) samples.push(timestamp - previous);
          previous = timestamp;
          const progress = i / 89;
          window.canvasFixture.setCamera(
            { x: 40 - progress * 4000, y: 40 - Math.sin(progress * Math.PI) * 600 },
            panOnly ? 1 : 1 - 0.3 * Math.sin(progress * Math.PI),
          );
        }
        observer.disconnect();
        const sorted = [...samples].sort((a, b) => a - b);
        const mean = samples.reduce((sum, sample) => sum + sample, 0) / samples.length;
        return {
          meanFrameMs: mean,
          fps: 1000 / mean,
          p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
          framesOver25Ms: samples.filter((sample) => sample > 25).length,
          sampleCount: samples.length,
          longTasks: longTasks.length,
          mountedItems: document.querySelectorAll('[data-board-item]').length,
          domNodes: document.querySelectorAll('*').length,
        };
      },
      { panOnly },
    );
    const after = await cdp.send('Performance.getMetrics');
    if (process.env.CANVAS_CPU_PROFILE === '1') {
      const { profile } = await cdp.send('Profiler.stop');
      const profilePath = testInfo.outputPath('canvas.cpuprofile');
      await writeFile(profilePath, JSON.stringify(profile));
      await testInfo.attach('canvas-cpu-profile', { path: profilePath, contentType: 'application/json' });
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const duration = (name) =>
      1000 *
      (after.metrics.find((metric) => metric.name === name).value -
        before.metrics.find((metric) => metric.name === name).value);
    const result = {
      count,
      cpuSlowdown,
      panOnly,
      ...metrics,
      scriptMs: duration('ScriptDuration'),
      layoutMs: duration('LayoutDuration'),
      styleMs: duration('RecalcStyleDuration'),
      taskMs: duration('TaskDuration'),
    };
    console.log(`CANVAS_METRICS ${JSON.stringify(result)}`);
    await testInfo.attach('canvas-frame-metrics', {
      body: JSON.stringify(result, null, 2),
      contentType: 'application/json',
    });
    expect(errors).toEqual([]);
    expect(metrics.sampleCount).toBe(89);
  });
}

test('offscreen culling preserves the model and retains selected, remote and search targets', async ({ page }) => {
  await openFixture(page, 1000);
  await expect.poll(() => page.locator('[data-board-item]').count()).toBeLessThan(80);
  const distant = page.locator('[data-board-item-id="note-999"]');
  await expect(distant).toHaveCount(0);
  await page.evaluate(() => window.canvasFixture.select(['note-999']));
  await expect(distant).toHaveCount(1);
  await page.evaluate(() => window.canvasFixture.select([]));
  await expect(distant).toHaveCount(0);
  await page.evaluate(() => window.canvasFixture.attend('note-998'));
  await expect(page.locator('[data-board-item-id="note-998"]')).toHaveCount(1);
  await page.evaluate(() => window.canvasFixture.search('Note 997'));
  await expect(page.locator('[data-board-item-id="note-997"]')).toHaveCount(1);
  await page.evaluate(() => window.canvasFixture.setCamera({ x: 40 - 2520, y: 40 - 7920 }));
  await expect(distant).toBeInViewport();
  expect(await page.evaluate(() => window.canvasFixture.getState().items.length)).toBe(1000);
});

test('a focused composing editor keeps its DOM, draft and inverse-scaled controls through camera changes', async ({
  page,
}) => {
  await openFixture(page, 500);
  const note = page.locator('[data-board-item-id="note-0"]');
  await note.locator('[data-touch-content] > div').dblclick();
  const editor = note.locator('textarea');
  await expect(editor).toBeFocused();
  await editor.fill('A retained draft\n'.repeat(25));
  await editor.dispatchEvent('compositionstart', { data: 'draft' });
  await editor.evaluate((element) => {
    window.retainedEditor = element;
    element.scrollTop = 30;
  });
  await page.evaluate(() => window.canvasFixture.setCamera({ x: -5000, y: -4000 }, 0.1));
  expect(
    await page.evaluate(() => window.retainedEditor.isConnected && document.activeElement === window.retainedEditor),
  ).toBe(true);
  await expect(editor).toHaveValue('A retained draft\n'.repeat(25));
  expect(await editor.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await editor.dispatchEvent('compositionend', { data: 'draft' });
  await page.evaluate(() => window.canvasFixture.setCamera({ x: 40, y: 40 }, 0.5));
  await expect(note.locator('.canvas-item-move-handle')).toHaveAttribute('style', /scale\(2\)/);
});

test('auto-sized remote content is remeasured before it can be culled', async ({ page }) => {
  await openFixture(page, 100);
  await page.evaluate(() => {
    const item = window.canvasFixture.createItem('note', 'auto-note', { x: 10000, y: 0, content: 'Short' });
    window.canvasFixture.setItems([item]);
  });
  const note = page.locator('[data-board-item-id="auto-note"]');
  await expect(note).toHaveCount(0);
  await page.evaluate(() => {
    const [item] = window.canvasFixture.getState().items;
    window.canvasFixture.setItems([{ ...item, x: 0, y: -1000, content: 'Growing remote content\n'.repeat(100) }]);
  });
  await expect(note).toBeInViewport();
  await page.evaluate(() => {
    const [item] = window.canvasFixture.getState().items;
    window.canvasFixture.setItems([{ ...item, content: 'Short again' }]);
  });
  await expect(note).toHaveCount(0);
});

test('crossing connections and stateful/custom-styled blocks stay mounted with offscreen endpoints', async ({
  page,
}) => {
  await openFixture(page, 100);
  await page.evaluate(() => {
    const create = window.canvasFixture.createItem;
    window.canvasFixture.setItems([
      create('note', 'left', { x: -1500, y: 200, height: 170 }),
      create('note', 'right', { x: 3000, y: 200, height: 170 }),
      create('line', 'crossing', { startItemId: 'left', endItemId: 'right', x: -1500, y: 285, x2: 3000, y2: 285 }),
      create('document', 'document', { x: 10000, y: 10000 }),
      create('note', 'unknown-width', { x: 1400, y: 0, width: undefined, height: 170 }),
      create('note', 'overscan', { x: 1450, y: 200, width: 220, height: 170 }),
      create('note', 'custom', {
        x: 10000,
        y: 10000,
        height: 170,
        customCss: { enabled: true, source: 'opacity: .9;' },
      }),
    ]);
  });
  await expect(page.locator('[data-board-item-id="left"]')).toHaveCount(0);
  await expect(page.locator('[data-board-item-id="right"]')).toHaveCount(0);
  await expect(page.locator('[data-board-item-id="crossing"] svg').first()).toBeInViewport();
  await expect(page.locator('[data-board-item-id="document"]')).toHaveCount(1);
  await expect(page.locator('[data-board-item-id="custom"]')).toHaveCount(1);
  await expect(page.locator('[data-board-item-id="unknown-width"] [data-wheel-scroll]')).toHaveCount(1);
  const overscan = page.locator('[data-board-item-id="overscan"]');
  await expect(overscan.locator('[data-camera-preview]')).toHaveCount(1);
  await page.evaluate(() => window.canvasFixture.select(['overscan']));
  await expect(overscan.locator('[data-camera-preview]')).toHaveCount(0);
  await expect(overscan.locator('[data-wheel-scroll]')).toHaveCount(1);
});

test('desktop and mobile detail thresholds still follow zoom', async ({ page }) => {
  await openFixture(page, 100);
  await page.evaluate(() => window.canvasFixture.setCamera({ x: 40, y: 40 }, 0.22));
  const note = page.locator('[data-board-item-id="note-0"]');
  await expect(note.locator('[data-canvas-lod="skeleton"]')).toHaveCount(1);
  await page.setViewportSize({ width: 800, height: 600 });
  await expect(note.locator('[data-canvas-lod="skeleton"]')).toHaveCount(0);
  await page.evaluate(() => window.canvasFixture.setCamera({ x: 40, y: 40 }, 0.19));
  await expect(note.locator('[data-canvas-lod="skeleton"]')).toHaveCount(1);
});

test('a real mouse drag commits and undo restores coordinates after culling', async ({ page }) => {
  await openFixture(page, 500);
  const note = page.locator('[data-board-item-id="note-0"]');
  const bounds = await note.boundingBox();
  await page.mouse.move(bounds.x + 100, bounds.y + 110);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 180, bounds.y + 160, { steps: 10 });
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.canvasFixture.getState().items.find((item) => item.id === 'note-0').x))
    .toBeGreaterThan(0);
  await page.keyboard.press('Control+z');
  await expect
    .poll(() => page.evaluate(() => window.canvasFixture.getState().items.find((item) => item.id === 'note-0').x))
    .toBe(0);
});

test('nested scrolling survives culling and wheel capture follows actual overflow', async ({ page }) => {
  await openFixture(page, 100);
  await page.evaluate(() => {
    window.canvasFixture.setItems([
      window.canvasFixture.createItem('note', 'scroll-note', {
        x: 0,
        y: 0,
        height: 170,
        content: 'Scrollable note\n'.repeat(60),
      }),
    ]);
  });
  const note = page.locator('[data-board-item-id="scroll-note"]');
  const scroller = note.locator('[data-wheel-scroll="true"]');
  await expect(scroller).toBeVisible();
  await scroller.evaluate(
    (element) =>
      new Promise((resolve) => {
        element.addEventListener('scroll', resolve, { once: true });
        element.scrollTop = 80;
      }),
  );
  await page.evaluate(() => window.canvasFixture.setCamera({ x: -5000, y: -4000 }));
  await expect(note).toHaveCount(0);
  await page.evaluate(() => window.canvasFixture.setCamera({ x: 40, y: 40 }));
  await expect(scroller).toBeVisible();
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(80);
  await scroller.hover();
  await page.mouse.wheel(0, 120);
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(80);
  expect(await page.evaluate(() => window.canvasFixture.getState().zoom)).toBe(1);
  await page.evaluate(() => {
    const [item] = window.canvasFixture.getState().items;
    window.canvasFixture.setItems([{ ...item, content: 'Short' }]);
  });
  await expect(note.locator('[data-wheel-scroll="false"]')).toHaveCount(1);
  await note.hover();
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => window.canvasFixture.getState().zoom)).toBeLessThan(1);
});

test('a portaled icon draft survives panning even after its owner is deselected', async ({ page }) => {
  await openFixture(page, 100);
  await page.evaluate(() =>
    window.canvasFixture.setItems([window.canvasFixture.createItem('icon', 'portal-owner', { x: 0, y: 0 })]),
  );
  const owner = page.locator('[data-board-item-id="portal-owner"]');
  await owner.dblclick();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const search = dialog.locator('input').first();
  await search.fill('star');
  await dialog.evaluate((element) => {
    window.retainedDialog = element;
  });
  await page.evaluate(() => {
    window.canvasFixture.select([]);
    window.canvasFixture.setCamera({ x: -5000, y: -4000 });
  });
  expect(await page.evaluate(() => window.canvasFixture.getState().selectedIds)).toEqual([]);
  await expect(owner).toHaveCount(1);
  await expect(search).toHaveValue('star');
  expect(await page.evaluate(() => window.retainedDialog.isConnected)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  const control = page.locator('[data-canvas-ui]').getByRole('button').first();
  await control.focus();
  await expect(control).toBeFocused();
  await expect(owner).toHaveCount(0);
});

test('live camera coordinates drive controls and collaboration between content refreshes', async ({ page }) => {
  await openFixture(page, 1000);
  const result = await page.evaluate(() => {
    window.canvasFixture.select(['note-0']);
    window.canvasFixture.cursors([{ userId: 'remote', displayName: 'Remote', x: 100, y: 150 }]);
    window.canvasFixture.setCamera({ x: 60, y: 50 }, 0.99);
    window.canvasFixture.setCamera({ x: 70, y: 60 }, 0.98);
    const root = document.querySelector('[data-canvas-root]');
    root.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 266, clientY: 158 }));
    return {
      transform: document.querySelector('[data-canvas-scene]').style.transform,
      inverse: new DOMMatrix(document.querySelector('.canvas-item-move-handle').style.transform).a,
      remote: [
        new DOMMatrix(document.querySelector('[data-camera-cursor]').style.transform).m41,
        new DOMMatrix(document.querySelector('[data-camera-cursor]').style.transform).m42,
      ],
      cursor: window.canvasFixture.getState().cursor,
      moving: root.dataset.cameraMoving,
    };
  });
  expect(result.inverse).toBeCloseTo(1 / 0.98, 5);
  expect({ ...result, inverse: undefined }).toEqual({
    transform: 'translate(70px, 60px) scale(0.98)',
    inverse: undefined,
    remote: [168, 207],
    cursor: { x: 200, y: 100 },
    moving: 'true',
  });
  await expect(page.locator('[data-canvas-root]')).toHaveAttribute('data-camera-moving', 'false');
  await expect(page.locator('.canvas-controls').getByRole('combobox')).toHaveValue('0.98');
});

test('navigation previews restore scroll and retain auto-sized, custom and focused content', async ({ page }) => {
  await openFixture(page, 100);
  await page.evaluate(() => {
    const create = window.canvasFixture.createItem;
    window.canvasFixture.setItems([
      create('note', 'scroll', { x: 0, y: 0, width: 220, height: 170, content: 'A scrolling note\n'.repeat(60) }),
      create('note', 'auto', { x: 280, y: 0, content: 'Auto-height' }),
      create('note', 'custom', { x: 560, y: 0, height: 170, customCss: { enabled: true, source: 'opacity: .9;' } }),
      create('note', 'editing', { x: 0, y: 240, height: 170, content: 'Editor' }),
    ]);
  });
  const scroller = page.locator('[data-board-item-id="scroll"] [data-wheel-scroll="true"]');
  await scroller.evaluate(
    (element) =>
      new Promise((resolve) => {
        element.addEventListener('scroll', resolve, { once: true });
        element.scrollTop = 80;
      }),
  );
  const editor = page.locator('[data-board-item-id="editing"]');
  await editor.locator('[data-touch-content] > div').dblclick();
  await expect(editor.locator('textarea')).toBeFocused();
  const result = await page.evaluate(() => {
    const textarea = document.querySelector('textarea');
    const auto = document.querySelector('[data-board-item-id="auto"] [data-touch-content]');
    window.canvasFixture.setCamera({ x: 60, y: 50 });
    return {
      preview: !!document.querySelector('[data-board-item-id="scroll"] [data-camera-preview]'),
      scroll: document.querySelector('[data-camera-preview] > div').scrollTop,
      autoPreserved: auto.isConnected,
      customPreview: !!document.querySelector('[data-board-item-id="custom"] [data-camera-preview]'),
      editorPreserved: textarea.isConnected && document.activeElement === textarea,
    };
  });
  expect(result).toEqual({
    preview: true,
    scroll: 80,
    autoPreserved: true,
    customPreview: false,
    editorPreserved: true,
  });
  await expect(page.locator('[data-canvas-root]')).toHaveAttribute('data-camera-moving', 'false');
  await expect(page.locator('[data-camera-preview]')).toHaveCount(0);
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBe(80);
});

test('wheel zoom stays anchored and middle drag commits the final live camera', async ({ page }) => {
  await openFixture(page, 500);
  const before = await page.evaluate(() => window.canvasFixture.getState());
  await page.mouse.move(1200, 400);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => window.canvasFixture.getState().zoom)).toBeLessThan(before.zoom);
  const after = await page.evaluate(() => window.canvasFixture.getState());
  expect((1200 - after.pan.x) / after.zoom).toBeCloseTo((1200 - before.pan.x) / before.zoom, 4);
  expect((400 - after.pan.y) / after.zoom).toBeCloseTo((400 - before.pan.y) / before.zoom, 4);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(1100, 450, { steps: 8 });
  await page.mouse.up({ button: 'middle' });
  await expect.poll(() => page.evaluate(() => window.canvasFixture.getState().pan.x)).toBeCloseTo(after.pan.x - 100, 4);
  await expect.poll(() => page.evaluate(() => window.canvasFixture.getState().pan.y)).toBeCloseTo(after.pan.y + 50, 4);
  await expect(page.locator('[data-canvas-root]')).toHaveAttribute('data-camera-moving', 'false');
});

test('panning across grid tiles preserves pixels and avoids changing the dot texture', async ({ page }) => {
  await page.goto('/e2e/performance/?count=0');
  const root = page.locator('[data-canvas-root]');
  await expect(root).toBeVisible();
  const screenshot = () => page.screenshot({ clip: { x: 20, y: 20, width: 100, height: 100 }, animations: 'disabled' });
  const before = await screenshot();
  const initial = await page.locator('[aria-hidden="true"].pointer-events-none.absolute').first().getAttribute('style');
  for (const pan of [
    { x: 232, y: 232 },
    { x: -24, y: -24 },
  ]) {
    await page.evaluate((pan) => window.canvasFixture.setCamera(pan), pan);
    await expect(root).toHaveAttribute('data-camera-moving', 'false');
    expect((await screenshot()).equals(before)).toBe(true);
  }
  const final = await page.locator('[aria-hidden="true"].pointer-events-none.absolute').first().getAttribute('style');
  const background = (style) => style.match(/background-(?:size|position):[^;]+/g);
  expect(background(final)).toEqual(background(initial));
});

for (const kind of ['column', 'diagram', 'database']) {
  test(`${kind} previews retain editor DOM, scroll and model updates across navigation`, async ({ page }) => {
    test.setTimeout(30_000);
    await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/e2e/performance/?count=0');
    await expect(page.locator('[data-canvas-root]')).toBeVisible();
    await page.evaluate((kind) => {
      const api = window.canvasFixture;
      const extra = { x: 20, y: 20, title: 'Retained block', width: 600, height: 400 };
      if (kind === 'column')
        Object.assign(extra, {
          items: Array.from({ length: 8 }, (_, index) =>
            api.createItem('note', `child-${index}`, { content: `Child ${index}` }),
          ),
        });
      api.setItems([api.createItem(kind, 'heavy', extra)]);
    }, kind);
    const block = page.locator('[data-board-item-id="heavy"]');
    const editor = block.locator('[data-canvas-retained-editor]');
    await expect(editor).toHaveAttribute('data-canvas-retained-editor', 'false');
    await expect(block.locator('[data-block-loading]')).toHaveCount(0);

    await page.evaluate(() => {
      const root = document.querySelector('[data-canvas-root]');
      root.tabIndex = 0;
      root.focus();
      window.canvasFixture.select([]);
      const editor = document.querySelector('[data-canvas-retained-editor]');
      window.retainedEditor =
        editor.querySelector('.tiptap, .content-block-shell, [data-wheel-scroll]') ?? editor.firstElementChild;
      const scroll = editor.querySelector('[data-wheel-scroll]');
      if (scroll) scroll.scrollTop = 120;
    });
    const scrollBefore = await editor
      .locator('[data-wheel-scroll]')
      .first()
      .evaluateAll((elements) => elements[0]?.scrollTop ?? 0);
    // Go entirely offscreen, then return. Offscreen previews persist at rest.
    await page.evaluate(() => window.canvasFixture.setCamera({ x: -4000, y: 40 }));
    await expect(editor).toHaveAttribute('data-canvas-retained-editor', 'true');
    await expect(block.locator('[data-camera-preview="heavy"]')).toContainText('Retained block');
    await expect(editor).toHaveAttribute('inert', '');
    await expect(page.locator('[data-canvas-root]')).toHaveAttribute('data-camera-moving', 'false');
    expect(await page.evaluate(() => window.retainedEditor.isConnected)).toBe(true);
    // A remote/canonical title update while hidden must be reflected without remounting.
    await page.evaluate(() => {
      const api = window.canvasFixture;
      api.setItems(api.getState().items.map((item) => ({ ...item, title: 'Updated while hidden' })));
    });
    await expect(block.locator('[data-camera-preview="heavy"]')).toContainText('Updated while hidden');
    await page.evaluate(() => window.canvasFixture.setCamera({ x: 40, y: 40 }));
    await expect(page.locator('[data-canvas-root]')).toHaveAttribute('data-camera-moving', 'false');
    await expect(editor).toHaveAttribute('data-canvas-retained-editor', 'false');
    await expect(block.locator('[data-camera-preview="heavy"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.retainedEditor.isConnected)).toBe(true);
    expect(
      await editor
        .locator('[data-wheel-scroll]')
        .first()
        .evaluateAll((elements) => elements[0]?.scrollTop ?? 0),
    ).toBe(scrollBefore);

    await page.evaluate(() => {
      document.querySelector('[data-canvas-root]').focus();
      window.canvasFixture.select([]);
      window.canvasFixture.setCamera({ x: 40, y: 40 }, 0.1);
    });
    await expect(editor).toHaveAttribute('data-canvas-retained-editor', 'true');
    expect(await page.evaluate(() => window.retainedEditor.isConnected)).toBe(true);
    await page.evaluate(() => window.canvasFixture.select(['heavy']));
    await expect(editor).toHaveAttribute('data-canvas-retained-editor', 'false');
    await expect(block.locator('[data-canvas-lod="skeleton"]')).toHaveCount(0);
    await page.evaluate(() => {
      window.canvasFixture.select([]);
      window.canvasFixture.search('Updated while hidden');
    });
    await expect(editor).toHaveAttribute('data-canvas-retained-editor', 'false');
    await page.evaluate(() => {
      window.canvasFixture.search('');
      window.canvasFixture.attend('heavy');
    });
    await expect(editor).toHaveAttribute('data-canvas-retained-editor', 'false');
    expect(errors).toEqual([]);
  });
}

test('heavy previews protect active editors, auto-height geometry, dialogs and custom styles', async ({ page }) => {
  test.setTimeout(30_000);
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
  await page.goto('/e2e/performance/?count=0');
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  await page.evaluate(() => {
    const api = window.canvasFixture;
    api.setItems([
      api.createItem('document', 'document', { x: 20, y: 20, content: '<p>Auto height retained</p>'.repeat(35) }),
      api.createItem('diagram', 'diagram', { x: 650, y: 20 }),
      api.createItem('column', 'custom', {
        x: 4000,
        y: 0,
        items: [api.createItem('note', 'styled-child', { customCss: { enabled: true, source: 'opacity: .9;' } })],
      }),
    ]);
  });
  const documentBlock = page.locator('[data-board-item-id="document"]');
  const editor = documentBlock.locator('.tiptap');
  await expect(editor).toBeVisible();
  await documentBlock.getByRole('button', { name: 'Edit', exact: true }).click();
  await editor.click();
  await page.evaluate(() => window.canvasFixture.setCamera({ x: -50, y: 40 }));
  await expect(documentBlock.locator('[data-camera-preview]')).toHaveCount(0);
  await expect(editor).toBeFocused();
  await expect(page.locator('[data-canvas-root]')).toHaveAttribute('data-camera-moving', 'false');
  const initialHeight = (await documentBlock.boundingBox()).height;
  await page.evaluate(() => {
    const root = document.querySelector('[data-canvas-root]');
    root.tabIndex = 0;
    root.focus();
    window.canvasFixture.select([]);
    window.canvasFixture.setCamera({ x: -4000, y: 40 });
  });
  await expect(documentBlock.locator('[data-camera-preview]')).toHaveCount(0);
  await expect(page.locator('[data-canvas-root]')).toHaveAttribute('data-camera-moving', 'false');
  expect((await documentBlock.boundingBox()).height).toBeCloseTo(initialHeight, 0);
  await expect(page.locator('[data-board-item-id="custom"] [data-camera-preview]')).toHaveCount(0);
  await page.evaluate(() => window.canvasFixture.setCamera({ x: 40, y: 40 }));
  await expect(page.locator('[data-canvas-root]')).toHaveAttribute('data-camera-moving', 'false');
  expect((await documentBlock.boundingBox()).height).toBeCloseTo(initialHeight, 0);
  const diagram = page.locator('[data-board-item-id="diagram"]');
  await diagram.getByRole('button', { name: 'Edit diagram', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => {
    window.canvasFixture.select([]);
    window.canvasFixture.setCamera({ x: -4000, y: 40 });
  });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(diagram.locator('[data-camera-preview]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Done editing', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const autoHeight of [false, true]) {
  test(`documents keep rich layout during navigation with auto-height ${autoHeight}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/e2e/performance/?count=0');
    const root = page.locator('[data-canvas-root]');
    await expect(root).toBeVisible();
    await page.evaluate((autoHeight) => {
      const api = window.canvasFixture;
      api.setItems([
        api.createItem('document', 'document', {
          x: 20,
          y: 20,
          width: 600,
          height: 400,
          autoHeight,
          title: 'A stable document',
          content:
            '<h2>A formatted heading</h2><p>A paragraph with <strong>bold text</strong>.</p>' +
            '<ul><li>First item</li><li>Second item</li></ul><blockquote>A quotation</blockquote>' +
            '<p>More formatted document content.</p>'.repeat(20),
        }),
      ]);
    }, autoHeight);
    const block = page.locator('[data-board-item-id="document"]');
    const editor = block.locator('.tiptap');
    await expect(editor.locator('h2')).toBeVisible();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const scroll = document.querySelector('[data-board-item-id="document"] [data-wheel-scroll]');
      scroll.scrollTop = 100;
    });
    // Sample inside the movement commits, rather than only after the idle preview has disappeared.
    const samples = await page.evaluate(async () => {
      const api = window.canvasFixture;
      const block = document.querySelector('[data-board-item-id="document"]');
      const original = block.querySelector('.tiptap');
      const scroll = block.querySelector('[data-wheel-scroll]');
      const measure = () => ({
        sameEditor: original === block.querySelector('.tiptap'),
        visibleLayout: original.checkVisibility(),
        width: block.offsetWidth,
        height: block.offsetHeight,
        headingTop: original.querySelector('h2').offsetTop,
        scrollTop: scroll.scrollTop,
        html: original.innerHTML,
        preview: !!block.querySelector('[data-camera-preview], [data-canvas-lod="skeleton"], [inert]'),
      });
      const results = [measure()];
      for (const pan of [
        { x: 65, y: 50 },
        { x: -4000, y: 40 },
        { x: 40, y: 40 },
      ]) {
        api.setCamera(pan);
        results.push(measure());
        await new Promise(requestAnimationFrame);
        results.push(measure());
      }
      return results;
    });
    expect(samples[0].preview).toBe(false);
    expect(samples[0].visibleLayout).toBe(true);
    for (const sample of samples) expect(sample).toEqual(samples[0]);
    await expect(root).toHaveAttribute('data-camera-moving', 'false');
    await expect(editor.locator('h2')).toHaveText('A formatted heading');
    await expect(editor.locator('strong')).toHaveText('bold text');
    await expect(editor.locator('li')).toHaveCount(2);
    await expect(block.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await page.evaluate(() => window.canvasFixture.setCamera({ x: 40, y: 40 }, 0.1));
    await expect(root).toHaveAttribute('data-camera-moving', 'false');
    await expect(block.locator('[data-camera-preview], [data-canvas-lod="skeleton"]')).toHaveCount(0);
    await page.evaluate(() => window.canvasFixture.setCamera({ x: 40, y: 40 }, 1));
    await expect(root).toHaveAttribute('data-camera-moving', 'false');
    await block.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    await editor.fill('Editing the normal document after navigation');
    await expect
      .poll(() => page.evaluate(() => window.canvasFixture.getState().items[0].content))
      .toContain('Editing the normal document after navigation');
    expect(errors).toEqual([]);
  });
}
