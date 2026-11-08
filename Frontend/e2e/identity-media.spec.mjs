import { test, expect } from '@playwright/test';

const identity = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=',
  'base64',
);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'en'));
  let sequence = 1,
    logoId = null;
  let applicationName = 'NodexMesh';
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname.includes('/media/images/')) return route.fulfill({ contentType: 'image/gif', body: gif });
    if (url.pathname.endsWith('/avatar'))
      return route.fulfill({ json: { avatarId: request.method() === 'DELETE' ? null : identity(sequence++) } });
    if (url.pathname.endsWith('/logo')) {
      logoId = request.method() === 'DELETE' ? null : identity(sequence++);
      return route.fulfill({ json: { applicationName, logoId } });
    }
    if (url.pathname.endsWith('/branding')) {
      if (request.method() === 'PUT') applicationName = request.postDataJSON().applicationName;
      return route.fulfill({ json: { applicationName, logoId } });
    }
    return route.fulfill({ json: {} });
  });
  await page.goto('/e2e/workspace/?board=interactions&media=1');
  await expect(page.getByRole('heading', { name: 'Identity media fixture' })).toBeVisible();
});

test('GIF preview is local until saved, then appears in avatar and full-size preview', async ({ page }) => {
  let uploads = 0;
  page.on('request', (request) => {
    if (request.method() === 'PUT' && request.url().includes('/avatar')) uploads++;
  });
  await page.getByRole('button', { name: 'Change profile photo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Profile photo', exact: true });
  await dialog.getByLabel('Choose image').setInputFiles({ name: 'moving.gif', mimeType: 'image/gif', buffer: gif });
  await expect(dialog.getByRole('img', { name: 'New image preview' })).toHaveAttribute('src', /^blob:/);
  expect(uploads).toBe(0);
  await dialog.getByRole('button', { name: 'Save image', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(uploads).toBe(1);
  const avatar = page.getByRole('button', { name: 'View profile photo of Ada User', exact: true });
  await expect(avatar.locator('img')).toHaveAttribute('src', /media\/images\/10000000/);
  await avatar.click();
  await expect(
    page.getByRole('dialog', { name: 'Profile photo', exact: true }).getByRole('img', { name: 'Ada User' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Change profile photo', exact: true }).click();
  await dialog.getByRole('button', { name: 'Remove image', exact: true }).click();
  await expect(avatar).toHaveCount(0);
});

test('branding name, logo and favicon update together and the editor fits mobile', async ({ page }) => {
  await page.getByLabel('Application name', { exact: true }).fill('Company <example>');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.locator('header .instance-brand-name')).toHaveText('Company <example>');
  await expect(page).toHaveTitle('Company <example>');
  await page.getByRole('button', { name: 'Change application logo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Application logo', exact: true });
  await page.setViewportSize({ width: 390, height: 740 });
  await dialog.getByLabel('Choose image').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(dialog.getByRole('button', { name: 'Save image', exact: true })).toBeInViewport();
  const bounds = await dialog.boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  await dialog.getByRole('button', { name: 'Save image', exact: true }).click();
  await expect(page.locator('header img')).toHaveAttribute('src', /media\/images\/10000000/);
  await expect(page.locator('link[data-instance-icon]')).toHaveAttribute('href', /media\/images\/10000000/);
});

test('invalid files stay unsaved and cancelling a preview preserves the avatar', async ({ page }) => {
  await page.getByRole('button', { name: 'Change profile photo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Profile photo', exact: true });
  await dialog
    .getByLabel('Choose image')
    .setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(dialog.getByRole('alert')).toContainText('PNG');
  await expect(dialog.getByRole('button', { name: 'Save image', exact: true })).toBeDisabled();
  await dialog.getByLabel('Choose image').setInputFiles({ name: 'safe.gif', mimeType: 'image/gif', buffer: gif });
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View profile photo of Ada User', exact: true })).toHaveCount(0);
});

test('workspace exposes profile-photo editing and keeps the application brand legible', async ({ page }, testInfo) => {
  await page.route('**/version/check', (route) =>
    route.fulfill({ json: { currentVersion: 'test', latestVersion: 'test', updateAvailable: false, releaseUrl: '' } }),
  );
  await page.goto('/e2e/workspace/?board=interactions');
  await expect(page.locator('[data-canvas-root]')).toBeVisible();
  await expect(page.locator('.app-logo .instance-brand-name')).toHaveText('NodexMesh');
  await page.locator('.workspace-app-bar').screenshot({ path: testInfo.outputPath('appbar-brand.png') });
  await page.getByRole('button', { name: 'Account menu', exact: true }).click();
  await page.getByRole('button', { name: 'Profile and security', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your profile', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Change profile photo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Profile photo', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Choose image')).toBeDisabled();
  await expect(dialog.getByText('Image uploads are unavailable in the demo.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});
