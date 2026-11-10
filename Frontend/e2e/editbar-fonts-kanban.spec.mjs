import { test, expect } from '@playwright/test';

test.setTimeout(45000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
});

test('font list renders real font previews and supports keyboard selection and Escape', async ({ page }, testInfo) => {
  await page.goto('/e2e/editbar/');
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'Item font family', exact: true });
  await picker.click();
  const list = page.getByRole('listbox', { name: 'Item font family', exact: true });
  await expect(list).toBeVisible();
  await expect(list.getByRole('option', { name: 'Kalam · Sketch', exact: true })).toHaveCSS('font-family', /Kalam/);
  await expect(list.getByRole('option', { name: 'Serif', exact: true })).toHaveCSS('font-family', /Noto Serif/);
  await page.screenshot({ path: testInfo.outputPath('font-list-previews.png') });
  await picker.press('End');
  await picker.press('Enter');
  await expect(picker).toHaveAttribute('aria-expanded', 'false');
  const selected = await picker.getAttribute('data-font-value');
  expect(selected).toBeTruthy();
  await picker.click();
  await picker.press('Home');
  await picker.press('Escape');
  await expect(picker).toHaveAttribute('data-font-value', selected);
  await expect(picker).toBeFocused();
  await picker.click();
  await picker.press('Home');
  await picker.press('Enter');
  await expect(picker).toHaveAttribute('data-font-value', '');
});

test('font list opens inside the mobile dialog and stays within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/e2e/editbar/');
  await page.getByRole('button', { name: 'Item style', exact: true }).click();
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  const picker = page.getByRole('combobox', { name: 'Item font family', exact: true });
  await picker.click();
  const list = page.getByRole('listbox');
  await expect(list).toBeVisible();
  const bounds = await list.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await list.getByRole('option', { name: 'Kalam · Sketch', exact: true }).click();
  await expect(picker).toHaveAttribute('data-font-value', 'kalam');
  await expect(picker).toHaveCSS('font-family', /Kalam/);
});

test('visible reset actions restore appearance and typography while retaining content and geometry', async ({
  page,
}) => {
  await page.goto('/e2e/editbar/');
  await page.getByRole('button', { name: 'Linear gradient', exact: true }).click();
  await page.getByRole('slider', { name: 'Background opacity', exact: true }).fill('45');
  await page.getByRole('button', { name: 'Reset appearance', exact: true }).click();
  const state = () =>
    page
      .locator('[data-fixture-state]')
      .textContent()
      .then((text) => JSON.parse(text).items[0]);
  const reset = await state();
  expect(reset.gradient).toBeUndefined();
  expect(reset.backgroundOpacity).toBeUndefined();
  expect(reset.color).toBe('#ffffff');
  await page.getByRole('tab', { name: 'Text', exact: true }).click();
  await page.getByLabel('Section font size', { exact: true }).fill('28');
  await page.getByRole('button', { name: 'Reset text style', exact: true }).click();
  const after = await state();
  expect(after.typography).toBeUndefined();
  expect(after.content).toBe(reset.content);
  expect(after.width).toBe(reset.width);
  expect(after.x).toBe(reset.x);
  expect(after.id).toBe(reset.id);
});

test('Kanban column headers separate deletion, resizing and reorder controls and allow custom icons', async ({
  page,
}, testInfo) => {
  await page.goto('/e2e/editbar/?mode=kanban');
  const columns = page.locator('[data-kanban-column-id]');
  await expect(columns).toHaveCount(3);
  const first = columns.first();
  await first.getByRole('button', { name: /^Edit icon for/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Edit Kanban column', exact: true });
  await dialog.getByLabel('Column name', { exact: true }).fill('Backlog');
  await dialog
    .getByRole('group', { name: 'Column icons', exact: true })
    .getByRole('button', { name: 'Rocket', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Save column', exact: true }).click();
  await expect(first.locator('.kanban-column-icon .lucide-rocket')).toBeVisible();
  await expect(first.getByRole('button', { name: 'Backlog', exact: true })).toBeVisible();
  await first.getByRole('button', { name: 'Move Backlog Right', exact: true }).click();
  await expect(columns.nth(1).getByRole('button', { name: 'Backlog', exact: true })).toBeVisible();
  const backlog = columns.nth(1);
  const grip = backlog.getByRole('button', { name: 'Reorder column Backlog', exact: true });
  await grip.press('Alt+ArrowLeft');
  await expect(columns.first().getByRole('button', { name: 'Backlog', exact: true })).toBeVisible();
  await columns
    .first()
    .getByRole('button', { name: /^Edit icon for/ })
    .click();
  await dialog.getByLabel('Custom emoji', { exact: true }).fill('🧭');
  await dialog.getByRole('button', { name: 'Save column', exact: true }).click();
  await expect(columns.first().locator('.kanban-column-icon')).toHaveText('🧭');
  await page.screenshot({ path: testInfo.outputPath('kanban-column-headers.png') });
  const remove = columns.first().getByRole('button', { name: 'Delete column Backlog', exact: true });
  const hit = await remove.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    return [
      [rect.x + 2, rect.y + rect.height / 2],
      [rect.right - 2, rect.y + rect.height / 2],
    ].every(([x, y]) => button.contains(document.elementFromPoint(x, y)));
  });
  expect(hit).toBe(true);
  await remove.click();
  await expect(columns).toHaveCount(2);
});

test('Kanban header buttons follow the board background in either theme and stay on the title row', async ({
  page,
}, testInfo) => {
  await page.goto('/e2e/editbar/?mode=kanban');
  const columns = page.locator('[data-kanban-column-id]');
  await expect(columns).toHaveCount(3);
  const contrast = (foreground, background) => {
    const luminance = (channels) => {
      const linear = channels.map((n) => {
        const v = n / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      });
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
    };
    const rgb = foreground
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number);
    const hex = [0, 2, 4].map((offset) => parseInt(background.slice(1 + offset, 3 + offset), 16));
    const a = luminance(rgb),
      b = luminance(hex);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  for (const theme of ['light', 'dark']) {
    await page.getByLabel('Test theme', { exact: true }).selectOption(theme);
    for (const background of ['#111827', '#fafafa', '#8bb9ac']) {
      await page.getByLabel('Test background', { exact: true }).fill(background);
      for (const button of await page.locator('.kanban-column-toolbar button:enabled').all()) {
        const color = await button.evaluate((element) => getComputedStyle(element).color);
        expect(contrast(color, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  }
  await page.getByLabel('Test theme', { exact: true }).selectOption('light');
  await page.getByLabel('Test background', { exact: true }).fill('#111827');
  await expect(columns.first().locator('.lucide-pencil')).toHaveCount(0);
  const icon = columns.first().locator('.kanban-column-icon');
  await icon.click();
  const dialog = page.getByRole('dialog', { name: 'Edit Kanban column', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await columns.first().locator('.kanban-column-title').click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('kanban-dark-background-light-theme.png') });
  await page.getByRole('button', { name: 'Narrow columns', exact: true }).click();
  for (const header of await page.locator('.kanban-column-header').all()) {
    const row = await header.evaluate((element) => {
      const title = element.querySelector('.kanban-column-title').getBoundingClientRect();
      const buttons = [...element.querySelectorAll('.kanban-column-toolbar button')].map((button) =>
        button.getBoundingClientRect(),
      );
      return {
        center: title.y + title.height / 2,
        buttons: buttons.map((rect) => rect.y + rect.height / 2),
        width: element.clientWidth,
        scrollWidth: element.scrollWidth,
      };
    });
    for (const y of row.buttons) expect(Math.abs(y - row.center)).toBeLessThanOrEqual(1.5);
    expect(row.scrollWidth).toBeLessThanOrEqual(row.width + 1);
  }
});
