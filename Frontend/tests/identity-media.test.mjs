import test, { after } from 'node:test';
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
  'HTMLInputElement',
  'HTMLDialogElement',
  'Element',
  'Node',
  'MouseEvent',
  'Event',
  'StorageEvent',
  'localStorage',
  'File',
])
  globalThis[name] = name === 'window' ? browser : browser[name];
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
let handler = () => new Response('{}');
globalThis.fetch = (url, options) => handler(url, options);
const created = [],
  revoked = [];
const originalCreate = URL.createObjectURL,
  originalRevoke = URL.revokeObjectURL;
URL.createObjectURL = () => {
  const url = `blob:test-${created.length}`;
  created.push(url);
  return url;
};
URL.revokeObjectURL = (url) => revoked.push(url);
const server = await createServer({
  configFile: false,
  define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('http') },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(async () => {
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  await server.close();
});
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { default: PhotoEditor } = await server.ssrLoadModule('/src/features/identity-media/PhotoEditor.tsx');
const { default: UserAvatar } = await server.ssrLoadModule('/src/shared/components/UserAvatar.tsx');
const { imageFileError, publicImageUrl } = await server.ssrLoadModule('/src/shared/lib/publicImage.ts');
const { identityMedia } = await server.ssrLoadModule('/src/features/identity-media/api.ts');
const { BrandingProvider, useBranding } = await server.ssrLoadModule('/src/features/branding/BrandingProvider.tsx');
const { default: Brand } = await server.ssrLoadModule('/src/features/branding/Brand.tsx');
const { createHttpAuthService } = await server.ssrLoadModule('/src/features/auth/services/httpAuthService.ts');
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const json = (data) => new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
const click = async (target) => act(async () => target.click());
const tick = async () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 5));
  });
async function mount(component) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  await act(async () => root.render(component));
  return async () => {
    await act(async () => root.unmount());
    host.remove();
  };
}
const chooseFile = async (file) =>
  act(async () => {
    const input = document.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
const submit = async () =>
  act(async () =>
    document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
  );

test('image references stay on the configured API and reject arbitrary URLs or paths', () => {
  assert.equal(publicImageUrl(id(1)), `/api/v1/media/images/${id(1)}`);
  for (const value of ['../../secret', 'https://attacker.example/pixel', 'javascript:alert(1)', '<svg/>', null])
    assert.equal(publicImageUrl(value), undefined);
  assert.equal(imageFileError(new File(['gif'], 'avatar.gif')), undefined);
  assert.ok(imageFileError(new File(['<svg/>'], 'avatar.svg')));
  assert.equal(imageFileError(new File(['<svg/>'], 'brand.svg'), true), undefined);
  assert.ok(imageFileError({ size: 10 * 1024 * 1024 + 1, name: 'large.gif' }));
});

test('photo selection previews locally, saves only on submit and revokes preview URLs', async () => {
  const saved = [];
  let closed = 0;
  const cleanup = await mount(
    createElement(PhotoEditor, {
      title: 'Profile photo',
      imageId: id(1),
      onClose() {
        closed++;
      },
      async onSave(file) {
        saved.push(file);
      },
    }),
  );
  const first = new File(['first'], 'one.gif', { type: 'image/gif' });
  const second = new File(['second'], 'two.png', { type: 'image/png' });
  let latest;
  try {
    await chooseFile(first);
    assert.equal(saved.length, 0);
    const previous = document.querySelector('img').src;
    await chooseFile(second);
    latest = document.querySelector('img').src;
    assert.notEqual(previous, latest);
    assert.ok(revoked.includes(previous));
    await submit();
    assert.deepEqual(saved, [second]);
    assert.equal(closed, 1);
  } finally {
    await cleanup();
  }
  assert.ok(revoked.includes(latest));
});

test('invalid selection and failed upload keep the dialog and current photo available', async () => {
  let calls = 0,
    closed = 0;
  const cleanup = await mount(
    createElement(PhotoEditor, {
      title: 'Profile photo',
      imageId: id(1),
      onClose() {
        closed++;
      },
      async onSave() {
        calls++;
        throw new Error('Upload failed');
      },
    }),
  );
  try {
    await chooseFile(new File(['payload'], 'unsafe.svg'));
    assert.match(document.querySelector('[role="alert"]').textContent, /PNG/);
    await submit();
    assert.equal(calls, 0);
    await chooseFile(new File(['gif'], 'photo.gif'));
    await submit();
    assert.equal(calls, 1);
    assert.equal(closed, 0);
    assert.match(document.querySelector('[role="alert"]').textContent, /operation failed/);
  } finally {
    await cleanup();
  }
});

test('repeated submissions while an image upload is pending produce only one API mutation', async () => {
  let calls = 0;
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const cleanup = await mount(
    createElement(PhotoEditor, {
      title: 'Profile photo',
      onClose() {},
      onSave() {
        calls++;
        return pending;
      },
    }),
  );
  try {
    await chooseFile(new File(['gif'], 'photo.gif'));
    await act(async () => {
      const form = document.querySelector('form');
      form.dispatchEvent(new browser.Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new browser.Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(calls, 1);
    assert.equal(document.querySelector('button[type="submit"]').disabled, true);
    await act(async () => {
      finish();
      await pending;
    });
  } finally {
    await cleanup();
  }
});

test('removing a photo is explicit and avatar click opens the original at a larger size', async () => {
  const saved = [];
  const cleanup = await mount(
    createElement(PhotoEditor, {
      title: 'Profile photo',
      imageId: id(1),
      onClose() {},
      async onSave(file) {
        saved.push(file);
      },
    }),
  );
  try {
    await click([...document.querySelectorAll('button')].find((button) => button.textContent === 'Remove image'));
    assert.deepEqual(saved, [null]);
  } finally {
    await cleanup();
  }
  const cleanupAvatar = await mount(createElement(UserAvatar, { avatarId: id(2), name: 'Alice Example' }));
  try {
    await click(document.querySelector('button'));
    const preview = document.querySelector('dialog img');
    assert.equal(preview.src, `http://localhost/api/v1/media/images/${id(2)}`);
    assert.equal(preview.alt, 'Alice Example');
    await click(document.querySelector('dialog button'));
    assert.equal(document.querySelector('dialog'), null);
  } finally {
    await cleanupAvatar();
  }
});

test('media adapter sends binary files without JSON wrapping and uses separate admin routes', async () => {
  const calls = [];
  handler = (url, options) => {
    calls.push({ url, options });
    return Promise.resolve(json({ avatarId: id(1) }));
  };
  const file = new File(['gif'], 'private.name.. + test.gif');
  await identityMedia.avatar(file);
  await identityMedia.avatar(null, id(2));
  assert.equal(calls[0].url, '/api/v1/auth/profile/avatar?name=image.gif');
  assert.equal(calls[0].options.body, file);
  assert.equal(calls[0].options.headers['Content-Type'], undefined);
  assert.equal(calls[0].options.credentials, 'include');
  assert.equal(calls[1].url, `/api/v1/admin/users/${id(2)}/avatar`);
  assert.equal(calls[1].options.method, 'DELETE');
});

test('authentication refresh retains the current image after login and moderation', async () => {
  let avatarId = id(1);
  const profile = () => ({ id: id(2), email: 'a@example.com', displayName: 'Alice', isAdmin: false, avatarId });
  const service = createHttpAuthService(async (url) =>
    json(url.endsWith('/login') ? { accessToken: 'test', user: profile() } : profile()),
  );
  assert.equal((await service.auth.login({ username: 'a@example.com', password: 'password' })).avatarId, avatarId);
  avatarId = null;
  assert.equal((await service.auth.refreshProfile()).avatarId, null);
  assert.equal((await service.auth.me()).avatarId, null);
});

test('branding is shared by logo and browser metadata and treats names as text', async () => {
  const name = 'Company <img src=x onerror=alert(1)>';
  handler = async () => json({ applicationName: name, logoId: id(1) });
  const cleanup = await mount(createElement(BrandingProvider, null, createElement(Brand, { chrome: true })));
  try {
    await tick();
    assert.equal(document.title, name);
    assert.equal(document.querySelector('.instance-brand-name').textContent, name);
    assert.equal(document.querySelector('[onerror]'), null);
    assert.equal(
      document.querySelector('link[data-instance-icon]').getAttribute('href'),
      `/api/v1/media/images/${id(1)}`,
    );
  } finally {
    await cleanup();
  }
});

test('an older profile request cannot restore a replaced avatar in the authentication cache', async () => {
  const pending = [];
  const profile = (avatarId) => ({ id: id(2), email: 'a@example.com', displayName: 'Alice', isAdmin: false, avatarId });
  const service = createHttpAuthService((url) =>
    url.endsWith('/login')
      ? Promise.resolve(json({ accessToken: 'test', user: profile(id(1)) }))
      : new Promise((resolve) => pending.push(resolve)),
  );
  await service.auth.login({ username: 'a@example.com', password: 'password' });
  const first = service.auth.refreshProfile();
  const second = service.auth.refreshProfile();
  await new Promise((resolve) => setTimeout(resolve, 0));
  pending[1](json(profile(id(3))));
  await second;
  pending[0](json(profile(id(1))));
  await first;
  assert.equal((await service.auth.me()).avatarId, id(3));
});

test('a stale branding request cannot overwrite a newly saved name', async () => {
  let resolve;
  handler = () =>
    new Promise((done) => {
      resolve = done;
    });
  function Rename() {
    const branding = useBranding();
    return createElement(
      'button',
      { onClick: () => branding.update({ applicationName: 'New company', logoId: null }) },
      branding.applicationName,
    );
  }
  const cleanup = await mount(createElement(BrandingProvider, null, createElement(Rename)));
  try {
    await click(document.querySelector('button'));
    await act(async () => resolve(json({ applicationName: 'Old company', logoId: id(1) })));
    assert.equal(document.querySelector('button').textContent, 'New company');
    assert.equal(document.title, 'New company');
  } finally {
    await cleanup();
  }
});
