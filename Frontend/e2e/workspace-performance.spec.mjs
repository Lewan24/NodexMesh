import { test, expect } from '@playwright/test';
import { startRenderTrace } from './helpers/renderTrace.mjs';
import { writeFile } from 'node:fs/promises';

const currentOrigin = 'http://127.0.0.1:4178';
const baselineOrigin = process.env.CANVAS_BASELINE_URL;
if (baselineOrigin && !/^http:\/\/127\.0\.0\.1:\d+$/.test(baselineOrigin)) {
  throw new Error('The comparison preview must use an isolated loopback origin.');
}
for (const board of ['notes', 'mixed']) {
  for (const slot of baselineOrigin ? [0, 1] : [0]) {
    test(`profile workspace ${board} movement and restoration (slot ${slot})`, async ({ page, browser }, testInfo) => {
      // Alternate order on successive repeats to reduce warmup/order bias.
      const variant = baselineOrigin ? (slot === testInfo.repeatEachIndex % 2 ? 'before' : 'after') : 'current';
      const origin = variant === 'before' ? baselineOrigin : currentOrigin;
      const errors = [];
      const requests = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) {
          requests.push(url.origin);
          return route.abort();
        }
        if (url.pathname === '/api/v1/version/check') {
          return route.fulfill({
            json: { currentVersion: 'benchmark', latestVersion: 'benchmark', updateAvailable: false, releaseUrl: '' },
          });
        }
        if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/hubs/')) {
          requests.push(url.pathname);
          return route.abort();
        }
        return route.continue();
      });
      await page.goto(`${origin}/e2e/workspace/?board=${board}`);
      await expect(page.locator('.board-shell')).toBeVisible();
      const root = page.locator('[data-canvas-root]');
      await expect(root).toBeVisible();
      await expect(page.locator('[data-block-loading]')).toHaveCount(0);
      await expect(page.locator('.save-status')).toHaveCount(0);
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const cdp = await page.context().newCDPSession(page);
      const system = await browser.newBrowserCDPSession();
      const { gpu } = await system.send('SystemInfo.getInfo');
      await system.detach();
      const cpuSlowdown = Number(process.env.CANVAS_CPU_SLOWDOWN ?? 4);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuSlowdown });
      const finishTrace = process.env.CANVAS_RENDER_TRACE === '1' ? await startRenderTrace(cdp) : null;
      if (process.env.CANVAS_CPU_PROFILE === '1') {
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.start');
      }
      const metrics = await page.evaluate(async () => {
        const root = document.querySelector('[data-canvas-root]');
        const bounds = root.getBoundingClientRect();
        const tasks = [];
        const observer = new PerformanceObserver((list) =>
          tasks.push(...list.getEntries().map((entry) => ({ start: entry.startTime, duration: entry.duration }))),
        );
        observer.observe({ type: 'longtask', buffered: false });
        const frames = [];
        let previous;
        const startX = Math.round(bounds.left + bounds.width / 2);
        const startY = Math.round(bounds.top + bounds.height / 2);
        performance.mark('canvas.motion.start');
        root.dispatchEvent(
          new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            button: 1,
            buttons: 4,
            clientX: startX,
            clientY: startY,
          }),
        );
        for (let index = 0; index < 90; index++) {
          const timestamp = await new Promise(requestAnimationFrame);
          if (previous !== undefined) frames.push(timestamp - previous);
          previous = timestamp;
          const progress = index / 89;
          document.dispatchEvent(
            new MouseEvent('mousemove', {
              bubbles: true,
              buttons: 4,
              clientX: startX - progress * 4000,
              clientY: startY - Math.sin(progress * Math.PI) * 600,
            }),
          );
        }
        document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 1 }));
        const movementEnd = performance.now();
        performance.mark('canvas.motion.end');
        if (root.dataset.cameraMoving === 'true') {
          await new Promise((resolve) => {
            const changes = new MutationObserver(() => {
              if (root.dataset.cameraMoving !== 'true') {
                changes.disconnect();
                resolve();
              }
            });
            changes.observe(root, { attributes: true, attributeFilter: ['data-camera-moving'] });
          });
        }
        await new Promise(requestAnimationFrame);
        const restored = performance.now();
        performance.mark('canvas.restored');
        const recoveryFrames = [];
        let last = await new Promise(requestAnimationFrame);
        for (let index = 0; index < 20; index++) {
          const timestamp = await new Promise(requestAnimationFrame);
          recoveryFrames.push(timestamp - last);
          last = timestamp;
        }
        performance.mark('canvas.measure.end');
        tasks.push(...observer.takeRecords().map((entry) => ({ start: entry.startTime, duration: entry.duration })));
        observer.disconnect();
        const distribution = (values) => {
          const sorted = [...values].sort((a, b) => a - b);
          return {
            fps: 1000 / (values.reduce((a, b) => a + b, 0) / values.length),
            p50Ms: sorted[Math.floor(sorted.length * 0.5)],
            p95Ms: sorted[Math.floor(sorted.length * 0.95)],
            p99Ms: sorted[Math.floor(sorted.length * 0.99)],
            maxMs: sorted.at(-1),
            over25Ms: values.filter((value) => value > 25).length,
            count: values.length,
          };
        };
        const visiblePreviews = [...root.querySelectorAll('[data-camera-preview]')].filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.right > bounds.left && rect.left < bounds.right && rect.bottom > bounds.top && rect.top < bounds.bottom
          );
        }).length;
        return {
          movement: distribution(frames),
          afterRestoration: distribution(recoveryFrames),
          restorationMs: restored - movementEnd,
          longTasks: {
            movement: tasks.filter((entry) => entry.start < movementEnd),
            restoration: tasks.filter((entry) => entry.start >= movementEnd && entry.start < restored),
            afterRestoration: tasks.filter((entry) => entry.start >= restored),
          },
          mountedItems: root.querySelectorAll('[data-board-item]').length,
          domNodes: document.querySelectorAll('*').length,
          overscanPreviews: root.querySelectorAll('[data-camera-preview]').length,
          visiblePreviews,
          camera: root.querySelector('[data-canvas-scene]').style.transform,
        };
      });
      const trace = finishTrace ? await finishTrace(testInfo) : undefined;
      if (process.env.CANVAS_CPU_PROFILE === '1') {
        const { profile } = await cdp.send('Profiler.stop');
        const path = testInfo.outputPath('workspace.cpuprofile');
        await writeFile(path, JSON.stringify(profile));
        await testInfo.attach('workspace-cpu-profile', { path, contentType: 'application/json' });
      }
      const { usedSize } = await cdp.send('Runtime.getHeapUsage');
      const result = {
        board,
        variant,
        cpuSlowdown,
        traced: !!finishTrace,
        ...metrics,
        jsHeapUsedBytes: usedSize,
        gpuRenderer: gpu.auxAttributes?.glRenderer,
        gpuDevices: gpu.devices.map(({ deviceString, vendorString }) => ({ deviceString, vendorString })),
      };
      console.log(`WORKSPACE_METRICS ${JSON.stringify(result)}`);
      if (trace)
        console.log(
          `WORKSPACE_TRACE_SUMMARY ${JSON.stringify({ board, variant, trace: Object.fromEntries(Object.entries(trace).map(([phase, value]) => [phase, { ...value, events: value.events.filter((event) => ['Paint', 'RasterTask', 'Layerize', 'Layout', 'UpdateLayoutTree'].includes(event.event)) }])) })}`,
        );
      await testInfo.attach('workspace-frame-metrics', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
      });
      expect(errors).toEqual([]);
      expect(requests).toEqual([]);
      expect(metrics.movement.count).toBe(89);
      expect(metrics.visiblePreviews).toBe(0);
      await expect(root).toHaveAttribute('data-camera-moving', 'false');
      await expect(page.locator('[data-block-loading]')).toHaveCount(0);
    });
  }
}

test('the production shell edits and persists notes and camera through real mouse gestures and reload', async ({
  page,
}) => {
  await page.route('**/api/v1/version/check', (route) =>
    route.fulfill({
      json: { currentVersion: 'benchmark', latestVersion: 'benchmark', updateAvailable: false, releaseUrl: '' },
    }),
  );
  await page.goto('/e2e/workspace/?board=notes');
  const root = page.locator('[data-canvas-root]');
  await expect(root).toBeVisible();
  const bounds = await root.boundingBox();
  await page.mouse.move(bounds.x + bounds.width - 50, bounds.y + bounds.height / 2);
  await page.mouse.down({ button: 'middle' });
  await page.mouse.move(bounds.x + bounds.width - 150, bounds.y + bounds.height / 2 + 50, { steps: 10 });
  await page.mouse.up({ button: 'middle' });
  await expect(root).toHaveAttribute('data-camera-moving', 'false');
  await expect(page.locator('[data-canvas-scene]')).toHaveAttribute('style', /translate\(-60px, 90px\)/);
  const note = page.locator('[data-board-item-id="10000000-0000-4000-8000-000000000010"]');
  await note.locator('[data-touch-content] > div').dblclick();
  await note.locator('textarea').fill('A persisted performance regression check');
  await note.locator('textarea').press('Tab');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const database = JSON.parse(localStorage.getItem('nodexmesh_api_mock_v1_00000000-0000-4000-8000-000000000002'));
        return database.boards['10000000-0000-4000-8000-000000000001'][0].items.find(
          (item) => item.id === '10000000-0000-4000-8000-000000000010',
        ).data.content;
      }),
    )
    .toBe('A persisted performance regression check');
  await page.reload();
  await expect(page.locator('[data-canvas-scene]')).toHaveAttribute('style', /translate\(-60px, 90px\)/);
  await expect(note).toContainText('A persisted performance regression check');
});

test('the workspace fixture refuses to overwrite an existing unmarked demo database', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() =>
    localStorage.setItem('nodexmesh_api_mock_v1_00000000-0000-4000-8000-000000000002', 'existing-demo-data'),
  );
  await page.goto('/e2e/workspace/?board=mixed');
  await expect.poll(() => errors.some((message) => message.includes('existing demo data was not changed'))).toBe(true);
  expect(
    await page.evaluate(() => localStorage.getItem('nodexmesh_api_mock_v1_00000000-0000-4000-8000-000000000002')),
  ).toBe('existing-demo-data');
  await expect(page.locator('[data-canvas-root]')).toHaveCount(0);
});

test('Mouse 4/5 and browser history restore workspace boards without leaving the app', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
  await page.goto('/e2e/workspace/?board=notes');
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  await page.evaluate(() => {
    const key = 'nodexmesh_api_mock_v1_00000000-0000-4000-8000-000000000002';
    const data = JSON.parse(localStorage.getItem(key));
    const projectId = data.projects[0].project.id;
    const first = data.boards[projectId][0];
    const next = structuredClone(first);
    next.board.id = '10000000-0000-4000-8000-000000009999';
    next.board.name = 'Navigation destination';
    next.board.sortOrder = 1;
    next.items = [];
    next.links = [];
    next.comments = [];
    next.tags = [];
    next.itemTags = [];
    data.boards[projectId].push(next);
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Show board navigation', exact: true }).click();
  const main = page.getByRole('button', { name: 'Notes board', exact: true });
  const destination = page.getByRole('button', { name: 'Navigation destination', exact: true });
  await expect(main).toHaveAttribute('aria-current', 'page');
  await destination.click();
  await expect(destination).toHaveAttribute('aria-current', 'page');
  const sessionUrl = page.url();
  const cdp = await page.context().newCDPSession(page);
  const mouse = async (button, buttons) => {
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x: 400,
      y: 400,
      button,
      buttons,
      clickCount: 1,
    });
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 400,
      y: 400,
      button,
      buttons: 0,
      clickCount: 1,
    });
  };
  await mouse('back', 8);
  await expect(main).toHaveAttribute('aria-current', 'page');
  await mouse('back', 8);
  await expect(main).toHaveAttribute('aria-current', 'page');
  expect(page.url()).toBe(sessionUrl);
  await mouse('forward', 16);
  await expect(destination).toHaveAttribute('aria-current', 'page');
  await page.evaluate(() => history.back());
  await expect(main).toHaveAttribute('aria-current', 'page');
  await page.evaluate(() => history.forward());
  await expect(destination).toHaveAttribute('aria-current', 'page');
  expect(page.url()).toBe(sessionUrl);
});

test('item borders and project statuses compose, update and persist through the workspace UI', async ({
  page,
}, testInfo) => {
  test.setTimeout(30000);
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
  await page.route('**/api/v1/version/check', (route) =>
    route.fulfill({ json: { currentVersion: 'test', latestVersion: 'test', updateAvailable: false, releaseUrl: '' } }),
  );
  await page.goto('/e2e/workspace/?board=notes');
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  const itemId = await page.evaluate(() => {
    const key = 'nodexmesh_api_mock_v1_00000000-0000-4000-8000-000000000002';
    const data = JSON.parse(localStorage.getItem(key));
    const projectId = data.projects[0].project.id;
    const board = data.boards[projectId][0];
    const item = board.items[0];
    item.appearance.customCss = { enabled: true, source: 'font-size: 22px;' };
    item.appearance.border = {
      color: '#903df5',
      width: 3,
      style: 'solid',
      gradient: { from: '#903df5', to: '#ffbd65', angle: 90 },
      animation: 'pulse',
    };
    data.projects[0].board = board;
    data.statuses = {
      [projectId]: [
        {
          id: '10000000-0000-4000-8000-000000008888',
          title: 'Done',
          description: 'Ready to ship',
          customCss: { enabled: true, source: 'outline: 3px solid #22c55e;' },
        },
      ],
    };
    localStorage.setItem(key, JSON.stringify(data));
    return item.id;
  });
  await page.reload();
  const item = page.locator(`[data-board-item-id="${itemId}"]`);
  await item.click({ position: { x: 45, y: 65 } });
  const select = page.getByRole('combobox', { name: 'Item status', exact: true });
  await expect(select).toBeEnabled();
  await select.selectOption('10000000-0000-4000-8000-000000008888');
  await expect(item.locator('[data-status-css]')).toHaveCount(1);
  const styled = item.locator('[data-item-css-scope] > :not(style)').first();
  await expect(styled).toHaveCSS('font-size', '22px');
  await expect(styled).toHaveCSS('outline-color', 'rgb(34, 197, 94)');
  const geometry = await styled.evaluate((node) => ({ width: node.offsetWidth, height: node.offsetHeight }));
  expect(await styled.evaluate((node) => getComputedStyle(node, '::after').backgroundImage)).toContain(
    'linear-gradient',
  );
  await page.getByRole('button', { name: 'Manage project statuses', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Project statuses', exact: true });
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Custom CSS (optional)', exact: true }).fill('outline: 3px solid #ff0000;');
  await dialog.getByRole('button', { name: 'Save status', exact: true }).click();
  await expect(styled).toHaveCSS('outline-color', 'rgb(255, 0, 0)');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await select.selectOption('');
  await expect(item.locator('[data-status-css]')).toHaveCount(0);
  await expect(styled).toHaveCSS('font-size', '22px');
  expect(await styled.evaluate((node) => ({ width: node.offsetWidth, height: node.offsetHeight }))).toEqual(geometry);
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Item border', exact: true });
  await expect(panel).toBeVisible();
  await panel.getByLabel('Width', { exact: true }).fill('5');
  await page.screenshot({ path: testInfo.outputPath('border-and-status-controls.png') });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await styled.evaluate((node) => getComputedStyle(node, '::after').animationName)).toBe('none');
  await expect.poll(() => item.locator('[data-item-border]').textContent()).toContain('padding: 5px');
  await expect
    .poll(() =>
      page.evaluate((itemId) => {
        const data = JSON.parse(localStorage.getItem('nodexmesh_api_mock_v1_00000000-0000-4000-8000-000000000002'));
        return data.boards[data.projects[0].project.id][0].items.find((item) => item.id === itemId).appearance.border
          .width;
      }, itemId),
    )
    .toBe(5);
  await page.reload();
  await expect.poll(() => item.locator('[data-item-border]').textContent()).toContain('padding: 5px');
  await expect(item.locator('[data-status-css]')).toHaveCount(0);
});
