import { test, expect } from '@playwright/test';
import path from 'node:path';

const id = (number) => `20000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
const users = [
  {
    id: id(1),
    email: 'anna@example.invalid',
    displayName: 'Anna Kowalska',
    isAdmin: true,
    isBlocked: false,
    createdAt: '2026-11-01T09:00:00Z',
  },
  {
    id: id(3),
    email: 'piotr@example.invalid',
    displayName: 'Piotr Nowak',
    isAdmin: false,
    isBlocked: false,
    createdAt: '2026-11-02T09:00:00Z',
  },
];
const files = [
  { id: id(10), name: 'Wymagania — wydanie 2.pdf', contentType: 'application/pdf', size: 128000, shared: false },
  {
    id: id(11),
    name: 'Plan wdrożenia.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    size: 32000,
    shared: false,
  },
  { id: id(12), name: 'Ustalenia spotkania.txt', contentType: 'text/plain', size: 2800, shared: false },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('nodexmesh_language', 'pl'));
  await page.route('**/api/v1/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname.replace('/api/v1', '');
    const json = (value) => route.fulfill({ json: value });
    if (pathname === '/auth/login' || pathname === '/auth/refresh')
      return json({ accessToken: 'guide-fixture-token', user: users[0] });
    if (pathname === '/admin/users') return json(users);
    if (pathname === '/admin/projects') return json([]);
    if (pathname === '/admin/settings/registration') return json({ enabled: true });
    if (pathname === '/appearance') return json({ defaults: null, projects: {} });
    if (pathname === '/branding') return json({ applicationName: 'NodexMesh', logoId: null });
    if (pathname.endsWith('/library')) return json({ assets: files, canManage: true, canShare: true });
    if (pathname.includes('/library/'))
      return route.fulfill({
        contentType: 'text/plain',
        body: 'Ustalenia spotkania\n1. Przygotować makiety.\n2. Zweryfikować dostępność.\n3. Zaplanować testy.',
      });
    if (pathname.endsWith('/members'))
      return json([
        {
          userId: users[1].id,
          email: users[1].email,
          displayName: users[1].displayName,
          role: 'Editor',
          createdAt: '2026-11-08T09:00:00Z',
        },
      ]);
    if (pathname.endsWith('/share-links')) return json([]);
    if (pathname === '/admin/audit/statistics')
      return json({ counts: [{ eventType: 'auth.login.failed', count: 3 }], persistenceFailuresSinceStartup: 0 });
    if (pathname === '/admin/audit/events')
      return json({
        items: [
          {
            id: id(30),
            occurredAt: '2026-11-10T09:30:00Z',
            eventType: 'auth.login.failed',
            severity: 'Warning',
            route: '/api/v1/auth/login',
            method: 'POST',
            outcome: 'Denied',
            actorId: null,
            targetUserId: id(3),
            projectId: null,
            requestId: 'training-request-01',
          },
        ],
        total: 1,
      });
    if (pathname === '/admin/audit/incidents') return json({ items: [], total: 0 });
    if (pathname === '/admin/security/ips')
      return json({
        items: [
          {
            ip: '192.0.2.42',
            lastSeen: '2026-11-10T09:30:00Z',
            windowStart: '2026-11-10T09:20:00Z',
            failedLogins: 8,
            unauthorized: 0,
            notFound: 0,
            rateLimited: 2,
            bannedUntil: '9999-12-31T23:59:59Z',
            reason: 'Przykład szkoleniowy',
            releasedAt: null,
          },
        ],
        total: 1,
      });
    throw new Error(`Unexpected guide fixture request: ${pathname}`);
  });
});

async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(1270, 790);
  await page.screenshot({
    path: path.resolve('public/user-guide', `${name}.png`),
    animations: 'disabled',
    caret: 'hide',
  });
}

test('capture actual server-connected screens with fictional data', async ({ page }) => {
  await page.goto('/e2e/guide/?panel=library');
  await expect(page.getByRole('dialog', { name: 'Biblioteka projektu', exact: true })).toBeVisible();
  await page.getByRole('button').filter({ hasText: 'Ustalenia spotkania.txt' }).click();
  await capture(page, 'library');
  await page.goto('/e2e/guide/?panel=sharing');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Piotr Nowak', exact: true })).toBeVisible();
  await capture(page, 'sharing');
  await page.goto('/e2e/guide/?panel=admin');
  await expect(page.getByRole('heading', { name: 'Administracja', exact: true })).toBeVisible();
  await expect(page.getByText('piotr@example.invalid', { exact: true })).toBeVisible();
  await capture(page, 'admin-users');
  await page.getByRole('tab', { name: 'Audyt', exact: true }).click();
  await expect(page.getByText('auth.login.failed', { exact: true })).toBeVisible();
  await capture(page, 'admin-audit');
  await page.getByRole('tab', { name: 'Bezpieczeństwo', exact: true }).click();
  await expect(page.getByText('192.0.2.42', { exact: true })).toBeVisible();
  await capture(page, 'admin-security');
  await page.getByRole('tab', { name: 'Nazwa i logo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Nazwa i logo aplikacji', exact: true })).toBeVisible();
  await capture(page, 'branding');
});
