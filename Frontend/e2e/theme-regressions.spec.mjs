import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('nodexmesh_language', 'en');
    localStorage.setItem('nodexmesh_theme', 'light');
  });
  await page.route('**/api/**', (route) =>
    route.request().url().endsWith('/version/check')
      ? route.fulfill({
          json: { currentVersion: 'test', latestVersion: 'test', updateAvailable: false, releaseUrl: '' },
        })
      : route.abort(),
  );
  await page.goto('/e2e/workspace/?board=interactions');
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
});
const openAppearance = async (page) => {
  await page.locator('[data-canvas-root]').click({ button: 'right', position: { x: 100, y: 300 } });
  await page.getByRole('menuitem', { name: 'Change application appearance', exact: true }).click();
  return page.getByRole('dialog', { name: 'Appearance settings', exact: true });
};

test('a fresh account uses the complete Charcoal preset by default', async ({ page }) => {
  await expect(page.locator('[data-app-bar="true"]')).toHaveCSS('background-color', 'rgb(32, 38, 43)');
  const dialog = await openAppearance(page);
  await expect(dialog.getByRole('button', { name: 'Charcoal', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(dialog.getByLabel('UI primary color', { exact: true })).toHaveValue('#334c5c');
  await expect(dialog.getByLabel('UI secondary color', { exact: true })).toHaveValue('#b64a25');
  await expect(dialog.getByLabel('UI Interface background', { exact: true })).toHaveValue('#20262b');
  await expect(dialog.getByLabel('UI Interface background fill', { exact: true })).toHaveValue('solid');
});
const cornerPixel = async (page) => {
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async (value) => {
    const image = new Image();
    image.src = `data:image/png;base64,${value}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    return [...context.getImageData(image.width - 13, image.height - 13, 1, 1).data]
      .slice(0, 3)
      .reduce((a, b) => a + b, 0);
  }, png);
};

test('every repeated dialog opening paints a real dimming layer', async ({ page }) => {
  const before = await cornerPixel(page);
  for (let index = 0; index < 4; index++) {
    const dialog = await openAppearance(page);
    await expect(dialog).toBeVisible();
    expect(await cornerPixel(page)).toBeLessThan(before * 0.75);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  }
});

test('column content stays rendered with the same DOM and dimensions while panning', async ({ page }) => {
  const column = page.locator('[data-board-item-id="10000000-0000-4000-8000-000000000015"]');
  const child = column.locator('[data-nested-item-id="10000000-0000-4000-8000-000000000014"]');
  await expect(child).toBeVisible();
  const before = await column.boundingBox();
  const height = before.height;
  await child.evaluate((node) => {
    window.retainedColumnChild = node;
  });
  await page.keyboard.down('Space');
  await page.waitForTimeout(350); // Exercise the deliberate Space-hold threshold.
  await page.mouse.move(500, 300);
  await page.mouse.down();
  await page.mouse.move(520, 315, { steps: 3 });
  await expect.poll(async () => Math.round((await column.boundingBox()).x - before.x)).toBe(20);
  await expect(child).toBeVisible();
  await expect(column.locator('[data-canvas-retained-editor="true"]')).toHaveCount(0);
  expect(await child.evaluate((node) => node === window.retainedColumnChild)).toBe(true);
  expect((await column.boundingBox()).height).toBeCloseTo(height, 0);
  await page.mouse.up();
  await page.keyboard.up('Space');
});

test('theme switch is the final context action and persists after reload', async ({ page }) => {
  const canvas = page.locator('[data-canvas-root]');
  await canvas.click({ button: 'right', position: { x: 100, y: 300 } });
  const menu = page.getByRole('menu', { name: 'Canvas actions' });
  await expect(menu.getByRole('menuitem').last()).toHaveText('Dark theme');
  await menu.getByRole('menuitem', { name: 'Dark theme', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(canvas).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await canvas.click({ button: 'right', position: { x: 100, y: 300 } });
  await expect(menu.getByRole('menuitem').last()).toHaveText('Light theme');
});

test('UI gradients propagate to palettes and independent override choices persist', async ({ page }) => {
  let dialog = await openAppearance(page);
  await dialog.getByRole('button', { name: 'Cyberpunk', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save appearance', exact: true }).click();
  const rootValue = (key) => page.locator('html').evaluate((node, name) => node.style.getPropertyValue(name), key);
  expect(await rootValue('--color-accent-fill')).toContain('linear-gradient');
  expect(await rootValue('--color-secondary-fill')).toContain('linear-gradient');
  dialog = await openAppearance(page);
  await dialog.getByRole('tab', { name: 'Canvas - defaults & projects', exact: true }).click();
  const primary = dialog.getByLabel('Light Primary', { exact: true });
  await expect(primary).toBeDisabled();
  await expect(primary).toHaveValue('#006a88');
  await dialog.getByRole('checkbox', { name: 'Light Primary Override UI color', exact: true }).check();
  await expect(primary).toBeEnabled();
  await dialog.getByRole('button', { name: 'Save appearance', exact: true }).click();
  await page.reload();
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  dialog = await openAppearance(page);
  await dialog.getByRole('tab', { name: 'Canvas - defaults & projects', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: 'Light Primary Override UI color', exact: true })).toBeChecked();
  await expect(
    dialog.getByRole('checkbox', { name: 'Light Secondary Override UI color', exact: true }),
  ).not.toBeChecked();
});

test('font dialog opens above the mobile editor and returns to it on Escape', async ({ page }) => {
  await page
    .locator('[data-board-item-id="10000000-0000-4000-8000-000000000010"]')
    .click({ position: { x: 100, y: 70 } });
  await page.setViewportSize({ width: 390, height: 740 });
  await page.getByRole('button', { name: 'Item style', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Item style', exact: true });
  await panel.getByRole('tab', { name: 'Text', exact: true }).click();
  await panel.getByRole('button', { name: 'Preview fonts', exact: true }).click();
  const fonts = page.getByRole('dialog', { name: 'Preview fonts', exact: true });
  await expect(fonts).toBeVisible();
  await expect(fonts).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.45)');
  await page.keyboard.press('Escape');
  await expect(fonts).toHaveCount(0);
  await expect(panel).toBeVisible();
  expect(await page.locator('body').evaluate((node) => node.style.overflow)).toBe('hidden');
  await panel.getByRole('button', { name: 'Close Item style', exact: true }).click();
  await expect(panel).toHaveCount(0);
  expect(await page.locator('body').evaluate((node) => node.style.overflow)).toBe('');
});

test('primary actions and secondary navigation follow appearance in both themes', async ({ page }) => {
  const dialog = await openAppearance(page);
  await dialog.getByRole('button', { name: 'Cyberpunk', exact: true }).click();
  await dialog.getByRole('button', { name: 'Save appearance', exact: true }).click();
  const boardLink = page.locator('.board-block-open');
  for (const mode of ['light', 'dark']) {
    await expect(boardLink).toBeVisible();
    const colors = await boardLink.evaluate((button) => {
      const style = getComputedStyle(button);
      return {
        background: style.backgroundImage,
        secondary: style.getPropertyValue('--color-secondary-fill').trim(),
        foreground: style.color,
      };
    });
    expect(colors.background).toContain('linear-gradient');
    expect(colors.secondary).toContain('#ae246b');
    expect(colors.foreground).toBe('rgb(255, 255, 255)');
    await page.locator('[data-canvas-root]').click({ button: 'right', position: { x: 100, y: 300 } });
    await page.getByRole('menuitem', { name: mode === 'light' ? 'Dark theme' : 'Light theme', exact: true }).click();
  }
  // The offline workspace intentionally disables library access. Check its actual stylesheet
  // against the active theme tokens without introducing an API dependency into this fixture.
  await page.addStyleTag({ path: fileURLToPath(new URL('../src/features/library/library.css', import.meta.url)) });
  const libraryFill = await page.evaluate(() => {
    const probe = document.createElement('button');
    probe.className = 'library-primary';
    document.body.append(probe);
    const fill = getComputedStyle(probe).backgroundImage;
    probe.remove();
    return fill;
  });
  expect(libraryFill).toContain('linear-gradient');
});

test('preset backgrounds persist independently, support custom gradients and keep light chrome readable', async ({
  page,
}) => {
  let dialog = await openAppearance(page);
  await expect(dialog.locator('.appearance-preset')).toHaveCount(12);
  await dialog.getByRole('button', { name: 'Porcelain', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Porcelain', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Save appearance', exact: true }).click();
  const chrome = page.locator('[data-app-bar="true"]');
  await expect(chrome).toHaveCSS('background-color', 'rgb(242, 244, 247)');
  await expect(chrome.locator('.instance-brand-name')).toHaveCSS('color', 'rgb(0, 0, 0)');
  await expect(page.locator('.tool-tile-icon').first()).toHaveCSS('color', 'rgb(0, 0, 0)');
  await page.screenshot({ path: test.info().outputPath('porcelain-workspace.png') });
  dialog = await openAppearance(page);
  await page.screenshot({ path: test.info().outputPath('preset-choices.png') });
  await dialog.getByLabel('UI primary color', { exact: true }).fill('#b84a26');
  await dialog.getByRole('button', { name: 'Save appearance', exact: true }).click();
  await expect(chrome).toHaveCSS('background-color', 'rgb(242, 244, 247)');
  dialog = await openAppearance(page);
  await dialog.getByLabel('UI Interface background fill', { exact: true }).selectOption('radial');
  await dialog.getByLabel('UI Interface background', { exact: true }).fill('#1a2434');
  await dialog.getByLabel('UI Interface background second color', { exact: true }).fill('#203c41');
  await dialog.getByRole('button', { name: 'Save appearance', exact: true }).click();
  await page.reload();
  await expect(chrome).toHaveCSS('background-image', /radial-gradient/);
  dialog = await openAppearance(page);
  await expect(dialog.getByLabel('UI Interface background', { exact: true })).toHaveValue('#1a2434');
  await expect(dialog.getByLabel('UI Interface background fill', { exact: true })).toHaveValue('radial');
  await dialog.getByRole('checkbox', { name: 'Custom interface background', exact: true }).uncheck();
  await dialog.getByRole('button', { name: 'Save appearance', exact: true }).click();
  await expect(chrome).toHaveCSS('background-image', /linear-gradient/);
});
