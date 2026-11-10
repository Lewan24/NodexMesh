import { test, expect } from '@playwright/test';

test.setTimeout(60000);
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
});
const openFilter = async (page) => {
  await page.getByRole('button', { name: 'Filter tasks', exact: true }).click();
  return page.getByRole('dialog', { name: 'Filter tasks', exact: true });
};
const apply = (dialog) => dialog.getByRole('button', { name: 'Apply filters', exact: true }).click();
const cards = (page) => page.locator('[data-kanban-card-id]');

test('filters combine assignees, multiple categories, title-only tasks and deadlines without restoring completed tasks', async ({
  page,
}, testInfo) => {
  await page.goto('/e2e/editbar/?mode=filters');
  await expect(cards(page)).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Reset filters', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Only unfinished tasks', exact: true }).click();
  await expect(cards(page)).toHaveCount(5);
  let dialog = await openFilter(page);
  await dialog.getByRole('checkbox', { name: 'All assigned people', exact: true }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Anna', exact: true }).check();
  await apply(dialog);
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).filter({ hasText: 'Title only' })).toHaveCount(1);
  await expect(cards(page).filter({ hasText: 'Completed Anna' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Filter tasks', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Reset filters', exact: true })).toBeEnabled();
  dialog = await openFilter(page);
  await dialog.getByRole('checkbox', { name: 'Include unassigned tasks', exact: true }).uncheck();
  await apply(dialog);
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first()).toContainText('Anna urgent');
  await page.getByRole('button', { name: 'Show all tasks', exact: true }).click();
  await expect(cards(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Only unfinished tasks', exact: true }).click();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(cards(page)).toHaveCount(5);
  dialog = await openFilter(page);
  await dialog.getByRole('checkbox', { name: 'Important', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Medium priority', exact: true }).check();
  await dialog.getByLabel('Deadline before', { exact: true }).fill('2026-11-10');
  await page.screenshot({ path: testInfo.outputPath('kanban-filter-dialog.png') });
  await apply(dialog);
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).filter({ hasText: 'Bob medium' })).toHaveCount(0);
  const state = JSON.parse(await page.locator('[data-fixture-state]').textContent());
  expect(state.items[0].columns.flatMap((column) => column.cards)).toHaveLength(6);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  dialog = await openFilter(page);
  await dialog.getByLabel('Deadline before', { exact: true }).fill('2026-11-09');
  await dialog.getByRole('checkbox', { name: 'Include tasks without a deadline', exact: true }).check();
  await apply(dialog);
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).filter({ hasText: 'Title only' })).toHaveCount(1);
});

test('filtered drag keeps hidden cards and marking a task complete respects the unfinished toggle', async ({
  page,
}) => {
  await page.goto('/e2e/editbar/?mode=filters');
  await page.getByRole('button', { name: 'Only unfinished tasks', exact: true }).click();
  const dialog = await openFilter(page);
  await dialog.getByRole('checkbox', { name: 'Important', exact: true }).check();
  await apply(dialog);
  await expect(cards(page)).toHaveCount(3);
  const source = cards(page).filter({ hasText: 'Anna urgent' });
  const handle = source.getByTitle('Drag card', { exact: true });
  const target = page.locator('[data-kanban-column-id]').nth(1);
  const start = await handle.boundingBox();
  const end = await target.boundingBox();
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(end.x + end.width / 2, end.y + end.height - 15, { steps: 10 });
  await page.mouse.up();
  await expect(target.locator('[data-kanban-card-id]')).toHaveCount(1);
  const state = JSON.parse(await page.locator('[data-fixture-state]').textContent());
  expect(state.items[0].columns.flatMap((column) => column.cards)).toHaveLength(6);
  await target.getByRole('checkbox', { name: 'Complete Anna urgent', exact: true }).click();
  await expect(cards(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(cards(page)).toHaveCount(4);
});

test('locking an auto-height note fixes its height, keeps editing and scrolling available and explains the lock', async ({
  page,
}, testInfo) => {
  await page.route('**/api/**', (route) =>
    route.request().url().endsWith('/version/check')
      ? route.fulfill({
          json: { currentVersion: 'test', latestVersion: 'test', updateAvailable: false, releaseUrl: '' },
        })
      : route.abort(),
  );
  await page.goto('/e2e/workspace/?board=interactions');
  const note = page.locator('[data-board-item-id="10000000-0000-4000-8000-000000000010"]');
  await expect(note).toBeVisible();
  await note.hover();
  await note.getByRole('button', { name: 'Auto-fit', exact: true }).click();
  await note.locator('.note-rich-text').dblclick();
  const editor = note.getByRole('textbox', { name: 'Note text', exact: true });
  await editor.fill('One\nTwo\nThree\nFour\nFive\nSix');
  await editor.press('Escape');
  await expect(editor).toHaveCount(0);
  const before = await note.boundingBox();
  await page
    .locator('[data-item-inspector]')
    .getByRole('button', { name: /Lock position/ })
    .click();
  const badge = note.getByRole('button', { name: 'Item locked', exact: true });
  await expect(badge).toBeVisible();
  await badge.hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText('current height stays fixed');
  await expect(tooltip).toContainText('Content can still be edited');
  await page.screenshot({ path: testInfo.outputPath('locked-note-tooltip.png') });
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  await note.locator('.note-rich-text').dblclick();
  await editor.fill(Array.from({ length: 50 }, (_, index) => `Long line ${index}`).join('\n'));
  await editor.press('Escape');
  const after = await note.boundingBox();
  expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
  await expect
    .poll(() =>
      note.evaluate((element) =>
        [...element.querySelectorAll('[data-wheel-scroll]')].some((node) => node.scrollHeight > node.clientHeight + 1),
      ),
    )
    .toBe(true);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const data = JSON.parse(localStorage.getItem('nodexmesh_api_mock_v1_00000000-0000-4000-8000-000000000002'));
        return [...Object.values(data.boards).flat(), ...data.projects.map((snapshot) => snapshot.board)].some(
          (board) =>
            board.items.some(
              (item) =>
                item.id === '10000000-0000-4000-8000-000000000010' &&
                item.locked &&
                item.data.content.includes('Long line 49'),
            ),
        );
      }),
    )
    .toBe(true);
  await page.reload();
  await expect(note.getByRole('button', { name: 'Item locked', exact: true })).toBeVisible();
  const restored = await note.boundingBox();
  expect(Math.abs(restored.height - before.height)).toBeLessThanOrEqual(1);
});
