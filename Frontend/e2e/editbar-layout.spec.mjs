import { test, expect } from '@playwright/test';

test.setTimeout(180000);
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
  await page.goto('/e2e/editbar/');
  await expect(page.getByLabel('Selection', { exact: true })).toBeVisible();
});

async function checkBounds(page) {
  const bar = page.locator('[data-edit-bar]');
  const inspector = page.locator('[data-item-inspector]');
  const bounds = await bar.boundingBox();
  const details = await inspector.boundingBox();
  expect(bounds.width).toBeLessThanOrEqual(569);
  expect(bounds.height).toBeLessThanOrEqual(361);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(details.x - 8);
  const overflow = await bar.evaluate((element) =>
    [...element.querySelectorAll('[role="tabpanel"], .edit-bar-section-body')]
      .filter((node) => node.clientWidth > 0)
      .map((node) => ({ width: node.clientWidth, scroll: node.scrollWidth })),
  );
  for (const node of overflow) expect(node.scroll).toBeLessThanOrEqual(node.width + 1);
}

for (const width of [1280, 1024, 920]) {
  test(`all item types and selection modes fit beside the inspector at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const selections = await page.getByLabel('Selection', { exact: true }).locator('option').allTextContents();
    expect(selections.length).toBeGreaterThan(25);
    for (const selection of selections) {
      await page.getByLabel('Selection', { exact: true }).selectOption(selection);
      await expect(page.getByRole('tab', { name: 'Appearance', exact: true })).toHaveAttribute('aria-selected', 'true');
      await checkBounds(page);
      const categories = page.getByRole('group', { name: 'Appearance options', exact: true }).getByRole('button');
      const names = await page
        .getByRole('group', { name: 'Appearance options', exact: true })
        .locator('button[aria-pressed]')
        .allTextContents();
      for (const name of names) {
        await categories.filter({ hasText: name }).click();
        await checkBounds(page);
      }
      for (const name of ['Text', 'Layout']) {
        const tab = page.getByRole('tab', { name, exact: true });
        if (await tab.count()) {
          await tab.click();
          await checkBounds(page);
        }
      }
    }
  });
}

test('fill, gradients, borders, arrow labels and mixed drawing controls remain editable', async ({
  page,
}, testInfo) => {
  const choose = (name) =>
    page
      .getByRole('group', { name: 'Appearance options', exact: true })
      .getByRole('button', { name, exact: true })
      .click();
  await page.getByRole('button', { name: 'Linear gradient', exact: true }).click();
  await checkBounds(page);
  await page.getByRole('slider', { name: 'Background opacity' }).fill('65');
  await choose('Top accent strip');
  await page.getByRole('button', { name: 'Radial gradient', exact: true }).click();
  await checkBounds(page);
  await choose('Border');
  await page.getByRole('button', { name: 'Add border', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Gradient border' }).check();
  await checkBounds(page);
  await page.screenshot({ path: testInfo.outputPath('compact-border.png') });
  await page.getByLabel('Selection', { exact: true }).selectOption('line');
  await page.getByLabel('Line thickness', { exact: true }).selectOption('5');
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  await page.getByTitle('Line label', { exact: true }).fill('Connected');
  await checkBounds(page);
  const state = JSON.parse(await page.locator('[data-fixture-state]').textContent());
  expect(state.items[0].strokeWidth).toBe(5);
  expect(state.items[0].label).toBe('Connected');
  await page.screenshot({ path: testInfo.outputPath('compact-line-text.png') });
  await page.getByLabel('Selection', { exact: true }).selectOption('mixed');
  await page.getByLabel('Drawing stroke width', { exact: true }).fill('7');
  const mixed = JSON.parse(await page.locator('[data-fixture-state]').textContent());
  expect(mixed.items.find((item) => item.type === 'drawing').strokeWidth).toBe(7);
  expect(mixed.items.find((item) => item.type === 'line').strokeWidth).toBe(2);

  await page.getByLabel('Selection', { exact: true }).selectOption('column');
  await page.getByRole('tab', { name: 'Layout', exact: true }).click();
  await page.getByRole('button', { name: 'Grid layout', exact: true }).click();
  await page.getByTitle('4 columns', { exact: true }).click();
  await checkBounds(page);
  const column = JSON.parse(await page.locator('[data-fixture-state]').textContent());
  expect(column.items[0].gridColumns).toBe(4);

  await page.getByLabel('Selection', { exact: true }).selectOption('frame');
  await page.getByRole('slider').fill('0.55');
  const frame = JSON.parse(await page.locator('[data-fixture-state]').textContent());
  expect(frame.items[0].opacity).toBe(0.55);

  await page.getByLabel('Selection', { exact: true }).selectOption('note');
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  await page.getByRole('combobox', { name: 'Item font family', exact: true }).click();
  await page.getByRole('option', { name: 'Serif', exact: true }).click();
  await page.getByLabel('Section font size', { exact: true }).fill('24');
  await page.getByRole('button', { name: 'Center', exact: true }).click();
  await checkBounds(page);
  const typography = JSON.parse(await page.locator('[data-fixture-state]').textContent()).items[0].typography;
  expect(typography.fontFamily).toBe('serif');
  expect(typography.sections.body.fontSize).toBe(24);
  expect(typography.sections.body.textAlign).toBe('center');
});

test('compact controls remain readable in the mobile sheet', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Item style', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Appearance', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page
    .getByRole('group', { name: 'Appearance options', exact: true })
    .getByRole('button', { name: 'Border', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Add border', exact: true })).toBeVisible();
  const panel = await page.locator('[data-edit-bar]').boundingBox();
  expect(panel.width).toBeLessThanOrEqual(390);
  expect(panel.x).toBeGreaterThanOrEqual(0);
  expect(panel.x + panel.width).toBeLessThanOrEqual(391);
  await page.screenshot({ path: testInfo.outputPath('compact-editbar-mobile.png') });
});
