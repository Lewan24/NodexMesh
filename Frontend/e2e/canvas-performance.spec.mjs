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

for (const count of [100, 500, 1000]) {
  test(`profile pan and zoom with ${count} notes at 4x CPU slowdown`, async ({ page }, testInfo) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openFixture(page, count);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Performance.enable');
    const before = await cdp.send('Performance.getMetrics');
    if (process.env.CANVAS_CPU_PROFILE === '1') {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.start');
    }
    const metrics = await page.evaluate(async () => {
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
          1 - 0.3 * Math.sin(progress * Math.PI),
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
    });
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
      cpuSlowdown: 4,
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
