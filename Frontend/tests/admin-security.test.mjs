import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement, act } from 'react';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const name of [
  'window',
  'document',
  'HTMLElement',
  'HTMLDialogElement',
  'Element',
  'Node',
  'MouseEvent',
  'Event',
  'localStorage',
])
  globalThis[name] = name === 'window' ? browser : browser[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const calls = [];
let handler;
globalThis.fetch = async (url, options) => {
  const body = options.body ? JSON.parse(options.body) : undefined;
  calls.push({ url, body });
  return handler(url, body);
};
const server = await createServer({
  configFile: false,
  define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('http') },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { default: AdminMfaReset } = await server.ssrLoadModule('/src/features/auth/pages/AdminMfaReset.tsx');
const { default: AdminIpPanel } = await server.ssrLoadModule('/src/features/auth/pages/AdminIpPanel.tsx');
await server.close();
const json = (data) =>
  new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
const tick = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
const click = async (element) => act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })));
const input = async (element, value) =>
  act(async () => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
async function mount(Component, props = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(createElement(Component, props)));
  await tick();
  return async () => {
    await act(async () => root.unmount());
    host.remove();
  };
}
const submit = async () => {
  await act(async () =>
    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );
  await tick();
};

test('MFA recovery verifies administrator before confirming and clears credentials on completion', async () => {
  calls.length = 0;
  handler = (url) =>
    url.endsWith('/start')
      ? json({ mfaRequired: true, challengeToken: 'target-bound-proof', method: 'authenticator' })
      : new Response(null, { status: 204 });
  const cleanup = await mount(AdminMfaReset, { userId: 'target', email: 'target@example.test' });
  try {
    await click(document.querySelector('button'));
    assert.ok(document.querySelector('dialog').classList.contains('app-modal-centered'));
    assert.ok(document.querySelector('dialog form').classList.contains('max-w-md'));
    await input(document.querySelector('input[type="password"]'), 'administrator-password');
    await input(document.querySelector('textarea'), 'Identity verified with support');
    await submit();
    assert.equal(calls.length, 1);
    assert.ok(calls[0].url.endsWith('/target/mfa/reset/start'));
    assert.ok(document.querySelector('input[autocomplete="one-time-code"]'));
    await input(document.querySelector('input[autocomplete="one-time-code"]'), '123456');
    await submit();
    assert.deepEqual(calls[1].body, {
      currentPassword: 'administrator-password',
      reason: 'Identity verified with support',
      challengeToken: 'target-bound-proof',
      code: '123456',
    });
    assert.equal(document.querySelector('dialog'), null);
    assert.match(document.querySelector('[role="status"]').textContent, /MFA reset/);
  } finally {
    await cleanup();
  }
});

test('IP panel filters and releases IPv6 bans with reason and refreshes records', async () => {
  calls.length = 0;
  handler = (url) =>
    url.endsWith('/release')
      ? new Response(null, { status: 204 })
      : json({
          total: 1,
          items: [
            {
              ip: '2001:db8::1',
              lastSeen: new Date().toISOString(),
              bannedUntil: new Date(Date.now() + 3600000).toISOString(),
              failedLogins: 10,
              unauthorized: 0,
              notFound: 0,
              rateLimited: 0,
              reason: 'failed_logins',
              releasedAt: null,
            },
          ],
        });
  const cleanup = await mount(AdminIpPanel);
  try {
    assert.match(document.querySelector('table').textContent, /2001:db8::1/);
    await click([...document.querySelectorAll('button')].find((button) => button.textContent.includes('Release /')));
    await input(document.querySelector('textarea'), 'Authorized penetration testing');
    await submit();
    const release = calls.find((call) => call.url.endsWith('/release'));
    assert.ok(release.url.includes('2001%3Adb8%3A%3A1'));
    assert.equal(release.body.reason, 'Authorized penetration testing');
    assert.equal(document.querySelector('dialog'), null);
    assert.ok(calls.filter((call) => call.url.includes('/security/ips?')).length >= 2);
  } finally {
    await cleanup();
  }
});

test('manual IP ban dialog submits address, duration and reason and refreshes banned records', async () => {
  calls.length = 0;
  handler = (url) =>
    url === '/api/v1/admin/security/ips' ? new Response(null, { status: 204 }) : json({ items: [], total: 0 });
  const cleanup = await mount(AdminIpPanel);
  try {
    await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Ban IP'));
    assert.ok(document.querySelector('dialog').classList.contains('app-modal-centered'));
    await input(document.querySelector('dialog input[autocomplete="off"]'), '2001:db8::123');
    await input(document.querySelector('dialog input[type="number"]'), '1440');
    await input(document.querySelector('dialog textarea'), 'Verified malicious activity');
    await submit();
    const ban = calls.find((call) => call.url === '/api/v1/admin/security/ips');
    assert.deepEqual(ban.body, { ip: '2001:db8::123', reason: 'Verified malicious activity', durationMinutes: 1440 });
    assert.equal(document.querySelector('dialog'), null);
    assert.ok(calls.filter((call) => call.url.includes('/security/ips?')).length >= 2);
  } finally {
    await cleanup();
  }
});

test('manual ban failure remains in the dialog and preserves the entered values', async () => {
  calls.length = 0;
  handler = (url) =>
    url === '/api/v1/admin/security/ips'
      ? new Response(JSON.stringify({ code: 'self_ip_ban', detail: 'You cannot ban your current IP address.' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      : json({ items: [], total: 0 });
  const cleanup = await mount(AdminIpPanel);
  try {
    await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Ban IP'));
    await input(document.querySelector('dialog input[autocomplete="off"]'), '192.0.2.1');
    await input(document.querySelector('dialog textarea'), 'Verified malicious activity');
    await submit();
    assert.match(document.querySelector('dialog [role="alert"]').textContent, /current IP/);
    assert.equal(document.querySelector('dialog input[autocomplete="off"]').value, '192.0.2.1');
  } finally {
    await cleanup();
  }
});
