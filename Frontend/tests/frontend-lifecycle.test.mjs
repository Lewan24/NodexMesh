import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement, act, lazy, Suspense } from 'react';
import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'Event', 'localStorage']) {
  globalThis[key] = key === 'window' ? browser : browser[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({
  configFile: false,
  cacheDir: 'node_modules/.vite-lifecycle-tests',
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { default: ErrorBoundary, reloadAfterSaving } = await server.ssrLoadModule(
  '/src/shared/components/ErrorBoundary.tsx',
);
const { registerSaveGuard, registerPersistentSaveGuard, flushPendingChanges } = await server.ssrLoadModule(
  '/src/shared/api/pendingChanges.ts',
);
const { useCollaborationPresence } = await server.ssrLoadModule(
  '/src/features/projects/hooks/useCollaborationPresence.ts',
);

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function mount(t) {
  const host = document.createElement('div');
  document.body.append(host);
  const root = createRoot(host);
  t.after(async () => {
    await act(async () => root.unmount());
    host.remove();
  });
  return { host, root };
}

test('a failed deferred editor is isolated, does not expose error details, and recovers with a new identity', async (t) => {
  const { host, root } = mount(t);
  const originalError = console.error;
  console.error = () => {};
  t.after(() => {
    console.error = originalError;
  });
  const FailedEditor = lazy(() =>
    Promise.reject(new Error('Failed to fetch dynamically imported module: secret-token')),
  );
  const render = (id, child) =>
    root.render(
      createElement(
        'div',
        null,
        createElement('input', { 'aria-label': 'Healthy item', defaultValue: 'Draft' }),
        createElement(ErrorBoundary, { resetKey: id }, createElement(Suspense, { fallback: 'Loading' }, child)),
      ),
    );
  await act(async () => render('failed', createElement(FailedEditor)));
  const input = host.querySelector('input');
  assert.match(host.textContent, /could not be downloaded/);
  assert.doesNotMatch(host.textContent, /secret-token/);
  input.value = 'Still editing';
  await act(async () => render('healthy', createElement('p', null, 'Recovered')));
  assert.match(host.textContent, /Recovered/);
  assert.equal(host.querySelector('input'), input);
  assert.equal(input.value, 'Still editing');
});

test('a render failure can be retried locally without reloading other items', async (t) => {
  const { host, root } = mount(t);
  const originalError = console.error;
  console.error = () => {};
  t.after(() => {
    console.error = originalError;
  });
  let broken = true;
  function Editor() {
    if (broken) throw new Error('private server details');
    return createElement('p', null, 'Recovered draft');
  }
  await act(async () => root.render(createElement(ErrorBoundary, null, createElement(Editor))));
  assert.match(host.textContent, /stopped working/);
  assert.doesNotMatch(host.textContent, /private server details/);
  const unregister = registerSaveGuard(async () => false);
  try {
    await act(async () => host.querySelectorAll('button')[1].click());
    assert.match(host.textContent, /Reload was cancelled/);
  } finally {
    unregister();
  }
  broken = false;
  await act(async () => host.querySelector('button').click());
  assert.equal(host.textContent, 'Recovered draft');
});

test('reload waits for all save guards and blocks failed or rejected saves', async () => {
  let reloads = 0;
  let finish;
  const unregister = registerSaveGuard(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  try {
    const result = reloadAfterSaving(() => reloads++);
    await tick();
    assert.equal(reloads, 0);
    finish(false);
    assert.equal(await result, false);
    assert.equal(reloads, 0);
  } finally {
    unregister();
  }
  const remove = registerSaveGuard(async () => {
    throw new Error('offline');
  });
  assert.equal(await reloadAfterSaving(() => reloads++), false);
  assert.equal(reloads, 0);
  remove();
  assert.equal(await reloadAfterSaving(() => reloads++), true);
  assert.equal(reloads, 1);
});

test('pending saves survive a failed view unmount and retain unload protection until a successful retry', async () => {
  let pending = true;
  let retryFlag = false;
  const detach = registerPersistentSaveGuard(
    async (retry) => {
      retryFlag = retry;
      return !pending;
    },
    () => pending,
  );
  detach();
  await tick();
  const unload = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unload);
  assert.equal(unload.defaultPrevented, true);
  assert.equal(await reloadAfterSaving(() => assert.fail('must not reload')), false);
  assert.equal(retryFlag, true);
  pending = false;
  assert.equal(await flushPendingChanges(true), true);
  const afterSave = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(afterSave);
  assert.equal(afterSave.defaultPrevented, false);
  assert.equal(await flushPendingChanges(), true);
});

test('an edit queued while a save finishes still blocks reload', async () => {
  let pending = true;
  const detach = registerPersistentSaveGuard(
    async () => true,
    () => pending,
  );
  try {
    assert.equal(await reloadAfterSaving(() => assert.fail('must not reload with a newer pending edit')), false);
    pending = false;
    assert.equal(await flushPendingChanges(), true);
  } finally {
    pending = false;
    detach();
  }
});

test('a new save guard registered during an in-flight save also blocks reload', async () => {
  let finish;
  const unregister = registerSaveGuard(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  let removeNewGuard;
  try {
    const result = reloadAfterSaving(() => assert.fail('must not skip the new view guard'));
    await tick();
    removeNewGuard = registerSaveGuard(async () => false);
    finish(true);
    assert.equal(await result, false);
  } finally {
    unregister();
    removeNewGuard?.();
  }
});

test('presence keeps its connection on selection changes and cancels publications from the old board', async (t) => {
  const originalBuild = HubConnectionBuilder.prototype.build;
  const connections = [];
  HubConnectionBuilder.prototype.build = function () {
    const handlers = {};
    const connection = {
      state: HubConnectionState.Disconnected,
      calls: [],
      on(name, handler) {
        handlers[name] = handler;
      },
      onreconnected(handler) {
        this.reconnected = handler;
      },
      onclose(handler) {
        this.closed = handler;
      },
      async start() {
        this.state = HubConnectionState.Connected;
      },
      async stop() {
        this.state = HubConnectionState.Disconnected;
      },
      async invoke(...args) {
        this.calls.push(args);
      },
      handlers,
    };
    connections.push(connection);
    return connection;
  };
  t.after(() => {
    HubConnectionBuilder.prototype.build = originalBuild;
  });
  const { root } = mount(t);
  const token = () => 'authenticated';
  let presence;
  function Harness({ board, selection }) {
    presence = useCollaborationPresence('project', board, 'self', selection, token);
    return null;
  }
  await act(async () => {
    root.render(createElement(Harness, { board: 'a', selection: ['first'] }));
    await tick();
  });
  const first = connections[0];
  assert.equal(connections.length, 1);
  const updateCursor = presence.updateCursor;
  await act(async () => root.render(createElement(Harness, { board: 'a', selection: ['second'] })));
  assert.equal(presence.updateCursor, updateCursor);
  assert.equal(connections.length, 1);
  presence.updateCursor({ x: 50, y: 70 });
  await act(async () => {
    root.render(createElement(Harness, { board: 'b', selection: ['third'] }));
    await tick();
  });
  assert.equal(first.state, HubConnectionState.Disconnected);
  const oldCalls = first.calls.length;
  await act(async () => {
    first.handlers.PresenceChanged({
      projectId: 'project',
      boardId: 'a',
      userId: 'late',
      itemIds: ['third'],
      expiresAt: '2099-01-01',
    });
    await new Promise((resolve) => setTimeout(resolve, 280));
  });
  assert.equal(first.calls.length, oldCalls);
  assert.deepEqual(presence.byItem, {});
  const second = connections[1];
  const latest = second.calls.filter(([name]) => name === 'UpdatePresence').at(-1)[1];
  assert.equal(latest.boardId, 'b');
  assert.deepEqual(latest.itemIds, ['third']);
  assert.equal(latest.cursorX, null);
});

test('metadata loads once across local rerenders, refreshes explicitly, and ignores obsolete responses and mutations', async (t) => {
  const { useProjectMetadata } = await server.ssrLoadModule('/src/features/board/hooks/useProjectMetadata.ts');
  const { root } = mount(t);
  let metadata;
  const requests = [];
  const listBoards = (projectId, signal) =>
    new Promise((resolve) => requests.push({ projectId, signal, resolve, kind: 'boards' }));
  const participants = (projectId, signal) =>
    new Promise((resolve) => requests.push({ projectId, signal, resolve, kind: 'participants' }));
  function Harness({ projectId, remoteVersion = 0, participantsRevision = 0 }) {
    metadata = useProjectMetadata({ projectId, remoteVersion, participantsRevision, listBoards, participants });
    return null;
  }
  await act(async () => root.render(createElement(Harness, { projectId: 'old' })));
  const oldSetBoards = metadata.setBoards;
  await act(async () => root.render(createElement(Harness, { projectId: 'old' })));
  assert.equal(requests.length, 2);
  await act(async () => root.render(createElement(Harness, { projectId: 'new' })));
  assert.equal(requests.length, 4);
  assert.ok(requests.slice(0, 2).every(({ signal }) => signal.aborted));
  await act(async () => {
    for (const request of requests) request.resolve([{ id: request.projectId }]);
  });
  assert.deepEqual(metadata.boards, [{ id: 'new' }]);
  assert.deepEqual(metadata.projectParticipants, [{ id: 'new' }]);
  await act(async () => oldSetBoards([{ id: 'obsolete operation' }]));
  assert.deepEqual(metadata.boards, [{ id: 'new' }]);
  await act(async () => root.render(createElement(Harness, { projectId: 'new', participantsRevision: 1 })));
  assert.equal(requests.length, 5);
  assert.equal(requests[4].kind, 'participants');
  await act(async () =>
    root.render(createElement(Harness, { projectId: 'new', participantsRevision: 1, remoteVersion: 1 })),
  );
  assert.equal(requests.length, 7);
  await act(async () => root.render(createElement(Harness, {})));
  assert.deepEqual(metadata.boards, []);
  assert.deepEqual(metadata.projectParticipants, []);
  assert.ok(requests.slice(4).every(({ signal }) => signal.aborted));
});

test('a delayed text preview cannot overwrite a newer file and identical props do not refetch', async (t) => {
  const { httpClient } = await server.ssrLoadModule('/src/app/services.ts');
  const originalRequest = httpClient.request;
  t.after(() => {
    httpClient.request = originalRequest;
  });
  const requests = [];
  let finishOld;
  httpClient.request = async (path, options) => {
    requests.push({ path, signal: options.signal });
    return {
      size: 4,
      slice() {
        return {
          text: () =>
            requests.length === 1
              ? new Promise((resolve) => {
                  finishOld = resolve;
                })
              : Promise.resolve('Current file'),
        };
      },
    };
  };
  const { default: FilePreviewDialog } = await server.ssrLoadModule('/src/features/library/FilePreviewDialog.tsx');
  const { root } = mount(t);
  const props = { name: 'example.txt', contentType: 'text/plain', size: 4, onClose() {} };
  const source = (id) => `library://00000000-0000-4000-8000-000000000001/00000000-0000-4000-8000-00000000000${id}`;
  await act(async () => {
    root.render(createElement(FilePreviewDialog, { ...props, source: source(2) }));
    await tick();
  });
  assert.equal(typeof finishOld, 'function');
  await act(async () => {
    root.render(createElement(FilePreviewDialog, { ...props, source: source(3) }));
    await tick();
  });
  assert.equal(requests[0].signal.aborted, true);
  assert.equal(document.querySelector('pre').textContent, 'Current file');
  await act(async () => {
    finishOld('Stale file');
    await tick();
  });
  assert.equal(document.querySelector('pre').textContent, 'Current file');
  await act(async () => root.render(createElement(FilePreviewDialog, { ...props, source: source(3) })));
  assert.equal(requests.length, 2);
});
