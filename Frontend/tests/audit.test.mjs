import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-audit-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
const { changeLanguage } = await server.ssrLoadModule('/src/shared/i18n/index.ts');
const { default: AdminAuditPanel } = await server.ssrLoadModule('/src/features/auth/pages/AdminAuditPanel.tsx');
await server.close();

test('audit investigation renders accessible filters and explicit UTC display in both languages', async () => {
  await changeLanguage('en');
  const english = renderToStaticMarkup(createElement(AdminAuditPanel));
  assert.match(english, /Audit and security monitoring/);
  assert.match(english, /Target account ID/);
  assert.match(english, /Client IP/);
  assert.match(english, /Times are displayed in UTC/);
  assert.match(english, /No audit records match these filters/);
  assert.match(english, /<button disabled="">Previous/);
  await changeLanguage('pl');
  const polish = renderToStaticMarkup(createElement(AdminAuditPanel));
  assert.match(polish, /Audyt i monitorowanie bezpieczeństwa/);
  assert.match(polish, /ID konta docelowego/);
});
