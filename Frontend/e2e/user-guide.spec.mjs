import { test, expect } from '@playwright/test';
import path from 'node:path';

test.setTimeout(45000);
test.use({ actionTimeout: 10000 });

const id = (number) => `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const item = (page, number) => page.locator(`[data-board-item-id="${id(number)}"]`);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'pl'));
  await page.route('**/api/**', (route) =>
    route.request().url().endsWith('/version/check')
      ? route.fulfill({
          json: { currentVersion: 'test', latestVersion: 'test', updateAvailable: false, releaseUrl: '' },
        })
      : route.abort(),
  );
});

async function workspace(page, board = 'guide') {
  await page.goto(`/e2e/workspace/?board=${board}`);
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  await expect(page.locator('[data-block-loading]')).toHaveCount(0);
}

async function openGuide(page) {
  await page.getByRole('button', { name: 'Instrukcja obsługi', exact: true }).click();
  const guide = page.getByRole('dialog', { name: 'Instrukcja obsługi', exact: true });
  await expect(guide).toBeVisible();
  return guide;
}

test('first visit highlights the guide and do-not-show survives reload', async ({ page }) => {
  await page.goto('/e2e/workspace/?board=guide&welcome=1');
  const welcome = page.getByRole('dialog', { name: 'Pierwszy raz? Zacznij od instrukcji', exact: true });
  await expect(welcome).toBeVisible();
  const button = page.getByRole('button', { name: 'Instrukcja obsługi', exact: true });
  await expect(button).toHaveAttribute('data-guide-highlight', 'true');
  await welcome.getByRole('checkbox', { name: 'Nie pokazuj ponownie', exact: true }).check();
  await welcome.getByRole('button', { name: 'Może później', exact: true }).click();
  await expect(welcome).toHaveCount(0);
  await expect(button).not.toHaveAttribute('data-guide-highlight');
  await page.reload();
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  await expect(welcome).toHaveCount(0);
  await openGuide(page);
});

test('guide searches all chapters, enlarges screenshots and restores focus', async ({ page }, testInfo) => {
  await workspace(page);
  const guide = await openGuide(page);
  await expect(guide.getByRole('navigation', { name: 'Rozdziały instrukcji' }).getByRole('button')).toHaveCount(21);
  await guide.getByRole('searchbox', { name: 'Szukaj w instrukcji', exact: true }).fill('deadline');
  await expect(guide.getByRole('heading', { name: 'Checklisty i Kanban', exact: true })).toBeVisible();
  await expect(guide.getByText('Filtry są ustawieniem bieżącego widoku Kanbana.', { exact: false })).toBeVisible();
  const image = guide.getByRole('button', { name: /^Powiększ zrzut:/ });
  await image.click();
  await expect(page.locator('.user-guide-lightbox img')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.user-guide-lightbox')).toHaveCount(0);
  await expect(guide).toBeVisible();
  await expect(image).toBeFocused();
  await guide.getByRole('searchbox').fill('audyt');
  await guide
    .getByRole('navigation')
    .getByRole('button', { name: /Administracja: audyt i incydenty/ })
    .click();
  await expect(guide.getByText('Wymagane uprawnienia administratora', { exact: true })).toBeVisible();
  await guide.getByRole('searchbox').fill('nieistniejacyrozdzial123');
  await expect(guide.getByRole('heading', { name: 'Nie znaleziono rozdziałów' })).toBeVisible();
  await guide.getByRole('button', { name: 'Wyczyść wyszukiwanie', exact: true }).click();
  await guide.screenshot({ path: testInfo.outputPath('user-guide-desktop.png') });
  await page.keyboard.press('Escape');
  await expect(guide).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Instrukcja obsługi', exact: true })).toBeFocused();
});

test('shared popups support hover, keyboard, Escape and disabled controls', async ({ page }, testInfo) => {
  await workspace(page);
  const collapse = page.getByRole('button', { name: 'Zwiń pasek boczny', exact: true });
  await collapse.focus();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toHaveText('Zwiń pasek boczny');
  await expect(collapse).toHaveAttribute('aria-describedby', /.+/);
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
  await expect(collapse).toBeFocused();
  await collapse.blur();
  await expect(collapse).toHaveAttribute('title', 'Zwiń pasek boczny');
  const share = page.getByRole('button', { name: 'Udostępnij', exact: true });
  await expect(share).toBeDisabled();
  await share.hover();
  await expect(tooltip).toContainText('Udostępnianie wymaga');
  const bounds = await tooltip.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(1280);
  await tooltip.screenshot({ path: testInfo.outputPath('shared-tooltip.png') });
  await page.mouse.move(600, 760);
  await expect(tooltip).toHaveCount(0);
  await collapse.click();
  const guideButton = page.getByRole('button', { name: 'Instrukcja obsługi', exact: true });
  await expect(guideButton.locator('span')).toHaveCount(0);
  await openGuide(page);
});

test('mobile guide fits the viewport and remains available through Tools', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await workspace(page);
  await page.getByRole('button', { name: 'Narzędzia', exact: true }).click();
  const guide = await openGuide(page);
  const bounds = await guide.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(740);
  await expect(guide.getByRole('button', { name: 'Zamknij instrukcję obsługi' })).toBeInViewport();
  await guide.getByRole('searchbox').fill('import');
  await guide
    .getByRole('navigation')
    .getByRole('button', { name: /Eksport i import/ })
    .click();
  await expect(guide.getByRole('heading', { name: 'Eksport i import danych' })).toBeVisible();
  await guide.screenshot({ path: testInfo.outputPath('user-guide-mobile.png') });
  await guide.getByRole('button', { name: 'Zamknij instrukcję obsługi' }).click();
  await expect(guide).toHaveCount(0);
});

test('popups stay readable inside native dialogs and Escape closes only the popup first', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await workspace(page, 'interactions');
  await item(page, 17).click();
  await page.getByRole('button', { name: 'Edytuj ikonę', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Wybierz ikonę', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Rakieta', exact: true }).hover();
  const popup = page.getByRole('tooltip');
  await expect(popup).toHaveText('Rakieta');
  await popup.hover();
  await expect(popup).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popup).toHaveCount(0);
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('English guide and profile entry are available', async ({ page }) => {
  await workspace(page);
  await page.getByRole('button', { name: 'Menu konta', exact: true }).click();
  await page.getByRole('combobox', { name: 'Język', exact: true }).selectOption('en');
  await page.getByRole('button', { name: 'Profile and security', exact: true }).click();
  await page.getByRole('button', { name: 'User guide', exact: true }).click();
  const guide = page.getByRole('dialog', { name: 'User guide', exact: true });
  await expect(guide.getByRole('heading', { name: 'Getting started and finding your way' })).toBeVisible();
  await guide.getByRole('searchbox').fill('MFA');
  await expect(guide.getByRole('navigation').getByRole('button', { name: /Profile, password/ })).toBeVisible();
});

test('capture workspace illustrations', async ({ page }) => {
  test.skip(
    process.env.UPDATE_GUIDE_SCREENSHOTS !== '1',
    'Run guide:screenshots:workspace to regenerate checked-in screenshots.',
  );
  const capture = async (name) => {
    await page.evaluate(() => document.fonts.ready);
    await page.mouse.move(1270, 790);
    await page.screenshot({
      path: path.resolve('public/user-guide', `${name}.png`),
      animations: 'disabled',
      caret: 'hide',
    });
  };
  await workspace(page);
  await capture('workspace');
  await item(page, 11).click();
  await expect(page.getByRole('tab', { name: 'Wygląd', exact: true })).toBeVisible();
  await capture('editbar');
  await capture('inspector');
  await page.getByRole('tab', { name: 'Wygląd', exact: true }).click();
  await item(page, 11).click({ button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await capture('context-menu');
  await page.keyboard.press('Escape');
  await workspace(page, 'guide-notes');
  await capture('notes');
  await workspace(page, 'guide-planning');
  await capture('planning');
  await workspace(page, 'guide-connections');
  const line = await item(page, 12).locator('svg').first().boundingBox();
  await page.mouse.click(line.x + line.width / 2, line.y + line.height / 2);
  await capture('connections');
  await workspace(page);
  await page.getByRole('button', { name: 'Filtruj', exact: true }).click();
  await expect(page.locator('.kanban-filter-dialog')).toBeVisible();
  await capture('kanban');
  await page.keyboard.press('Escape');
  await page.locator('.project-trigger').click();
  await expect(page.locator('.project-panel')).toBeVisible();
  await capture('projects');
  await page.locator('.project-trigger').click();
  await page.getByRole('button', { name: 'Narzędzia projektu', exact: true }).click();
  await capture('project-tools');
  await page.getByRole('button', { name: 'Wygląd', exact: true }).click();
  await expect(page.locator('.settings-dialog')).toBeVisible();
  await capture('appearance');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Menu konta', exact: true }).click();
  await page.getByRole('button', { name: 'Profil i bezpieczeństwo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Twój profil', exact: true })).toBeVisible();
  await capture('profile');
});
