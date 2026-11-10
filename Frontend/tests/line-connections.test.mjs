import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';
import { createElement, act } from 'react';
import { createServer } from 'vite';

const browser = new Window({ url: 'http://localhost' });
for (const key of [
  'window',
  'document',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'MouseEvent',
  'localStorage',
  'MutationObserver',
]) {
  globalThis[key] = key === 'window' ? browser : browser[key];
}
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = browser.requestAnimationFrame.bind(browser);
globalThis.cancelAnimationFrame = browser.cancelAnimationFrame.bind(browser);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import('react-dom/client');
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  server: { middlewareMode: true, watch: null, hmr: false },
});
after(() => server.close());
await (await server.ssrLoadModule('/src/shared/i18n/index.ts')).changeLanguage('en');
const { createCanvasItem } = await server.ssrLoadModule('/src/features/canvas/utils/createCanvasItem.ts');
const { resolveLineItem, getConnectionAttachment } = await server.ssrLoadModule(
  '/src/features/canvas/utils/lineGeometry.ts',
);
const { useLineDrag } = await server.ssrLoadModule('/src/features/canvas/hooks/useLineDrag.ts');
const { default: EditBar } = await server.ssrLoadModule('/src/features/blocks/editbar/EditBar.tsx');
const { default: LineControls } = await server.ssrLoadModule(
  '/src/features/blocks/editbar/components/LineControls.tsx',
);
const { default: CanvasItem } = await server.ssrLoadModule('/src/features/canvas/components/CanvasItem.tsx');
const { ThemeProvider } = await server.ssrLoadModule('/src/app/providers/ThemeProvider.tsx');
const { flattenItems } = await server.ssrLoadModule('/src/features/projects/services/boardAdapter.ts');

const note = (x, y, width = 320, height = 160) => ({ ...createCanvasItem('note', x, y), width, height });
const connect = (start, end, extra = {}) => ({
  ...createCanvasItem('line', 0, 0),
  staticAnchors: false,
  startItemId: start.id,
  endItemId: end.id,
  ...extra,
});
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
const dispatch = (element, type, x, y) =>
  act(async () => element.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y })));

test('vertical and horizontal connections align both endpoints within overlapping edge spans', () => {
  const a = note(0, 0);
  const b = note(96, 500, 640, 220);
  const line = connect(a, b, { startSide: 'bottom', endSide: 'top' });
  const resolved = resolveLineItem(line, [a, b]);
  assert.equal(resolved.x, 208);
  assert.equal(resolved.x2, 208);
  assert.equal(resolved.y, 160);
  assert.equal(resolved.y2, 500);
  assert.equal(resolveLineItem(resolved, [a, b]), resolved);
  const moved = { ...b, x: 300 };
  const narrowOverlap = resolveLineItem(line, [a, moved]);
  assert.equal(narrowOverlap.x, 310);
  assert.equal(narrowOverlap.x2, 310);
  const c = note(600, 80, 320, 400);
  const horizontal = resolveLineItem(connect(a, c, { startSide: 'right', endSide: 'left' }), [a, c]);
  assert.equal(horizontal.y, 120);
  assert.equal(horizontal.y2, 120);
});

test('static endpoints retain exact edge fractions through independent moves and resizes and saving', () => {
  const a = note(0, 0);
  const b = note(96, 500, 640, 220);
  const line = connect(a, b, {
    staticAnchors: true,
    startSide: 'bottom',
    startOffset: 0.125,
    endSide: 'top',
    endOffset: 0.875,
  });
  const initial = resolveLineItem(line, [a, b]);
  assert.deepEqual([initial.x, initial.y, initial.x2, initial.y2], [40, 160, 656, 500]);
  const changedA = { ...a, x: -120, y: 80, width: 640, height: 320 };
  const changedB = { ...b, x: 1000, y: -800 };
  const moved = resolveLineItem(initial, [changedA, changedB]);
  assert.deepEqual([moved.x, moved.y, moved.x2, moved.y2], [-40, 400, 1560, -800]);
  assert.equal(moved.startOffset, 0.125);
  assert.equal(moved.endOffset, 0.875);
  assert.equal(resolveLineItem(moved, [changedA, changedB]), moved);
  const saved = flattenItems([line], crypto.randomUUID())[0].item.data;
  assert.equal(saved.staticAnchors, true);
  assert.equal(saved.startOffset, 0.125);
  assert.throws(() => flattenItems([{ ...line, endOffset: 1.1 }], crypto.randomUUID()));
});

test('the edit bar freezes the currently visible endpoints and can return to sliding mode', async (t) => {
  const { host, root } = mount(t);
  const a = note(0, 0),
    b = note(96, 500, 640);
  let current = connect(a, b, { startSide: 'bottom', endSide: 'top' });
  const render = () =>
    root.render(
      createElement(LineControls, {
        item: resolveLineItem(current, [a, b]),
        onUpdate(update) {
          current = update(current);
          render();
        },
      }),
    );
  await act(async () => render());
  const before = resolveLineItem(current, [a, b]);
  const button = [...host.querySelectorAll('button')].find((button) => button.textContent === 'Static endpoints');
  await dispatch(button, 'click', 0, 0);
  assert.equal(current.staticAnchors, true);
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  const after = resolveLineItem(current, [a, b]);
  assert.deepEqual([after.x, after.y, after.x2, after.y2], [before.x, before.y, before.x2, before.y2]);
  await dispatch(button, 'click', 0, 0);
  assert.equal(current.staticAnchors, false);
});

test('dragging endpoints highlights the nearest edge and saves the indicated position', async (t) => {
  const { root } = mount(t);
  const a = note(0, 0),
    b = note(100, 500);
  const line = {
    ...connect(a, b),
    x: 40,
    y: 160,
    x2: 140,
    y2: 500,
    staticAnchors: true,
    startSide: 'bottom',
    startOffset: 0.125,
    endSide: 'top',
    endOffset: 0.125,
  };
  const projectRef = { current: { items: [a, b, line] } };
  let gestures;
  function Harness() {
    gestures = useLineDrag({
      projectRef,
      zoomRef: { current: 1 },
      measuredSizes: new Map(),
      pushHistory() {},
      onUpdateItem(id, update) {
        projectRef.current.items = projectRef.current.items.map((item) => (item.id === id ? update(item) : item));
      },
      onAddItem() {},
      onDeleteItem() {},
      onSelectItems() {},
      onOpenQuickCreate() {},
    });
    return null;
  }
  await act(async () => root.render(createElement(Harness)));
  await act(async () =>
    gestures.handleLineEndpointDrag(
      line.id,
      { button: 0, clientX: 140, clientY: 500, preventDefault() {}, stopPropagation() {} },
      2,
    ),
  );
  // A drop just outside the top edge still attaches, with the exact horizontal position.
  await dispatch(document, 'mousemove', 180, 494);
  assert.deepEqual(gestures.attachHover, { id: b.id, side: 'top', offset: 0.25 });
  await dispatch(document, 'mouseup', 180, 494);
  const attached = projectRef.current.items.find((item) => item.id === line.id);
  assert.equal(attached.endSide, 'top');
  assert.equal(attached.endOffset, 0.25);
  assert.deepEqual([attached.x2, attached.y2], [180, 500]);
  assert.equal(gestures.attachHover, null);
  const right = getConnectionAttachment({ x: 0, y: 0, width: 320, height: 160 }, 325, 40);
  assert.equal(right.side, 'right');
  assert.equal(right.offset, 0.25);
});

test('dispenser notes keep the same content DOM during camera motion and show the indicated edge', async (t) => {
  const { host, root } = mount(t);
  const item = {
    ...note(0, 0),
    dispenserId: crypto.randomUUID(),
    content: 'Stable centered note',
    typography: { textAlign: 'center', verticalAlign: 'middle', fontSize: 28 },
  };
  const noop = () => {};
  const props = {
    item,
    renderedItem: item,
    zoom: 1,
    isSelected: false,
    isAttachTarget: false,
    isDragOver: false,
    isAnimating: false,
    selectedIds: [],
    onMouseDown: noop,
    onAnimationEnd: noop,
    onResize: noop,
    onUpdateItem: noop,
    onDeleteItem: noop,
    onSelectItems: noop,
    onRequestDelete: noop,
    onItemResize: noop,
    onLineEndpointDrag: noop,
    onEjectFromColumn: noop,
    onSelectColumnItem: noop,
    onChecklistDropOutside: noop,
    onKanbanCardDropOutside: noop,
    onQuickConnectStart: noop,
  };
  const render = (extra = {}) =>
    root.render(createElement(ThemeProvider, null, createElement(CanvasItem, { ...props, ...extra })));
  await act(async () => render());
  const content = host.querySelector('.note-rich-text');
  assert.ok(content);
  for (const motionPreview of [true, false, true, false]) {
    await act(async () => render({ motionPreview }));
    assert.equal(host.querySelector('.note-rich-text'), content);
    assert.equal(host.querySelector('[data-camera-preview]'), null);
    assert.equal(content.style.textAlign, 'center');
    assert.equal(content.parentElement.style.justifyContent, 'center');
  }
  await act(async () => render({ isAttachTarget: true, attachSide: 'bottom', attachOffset: 0.25 }));
  const edge = host.querySelector('[data-attach-edge="bottom"]');
  assert.ok(edge);
  assert.equal(edge.lastElementChild.style.left, '25%');
  assert.equal(edge.lastElementChild.style.top, '100%');
});

test('new arrows use static endpoints by default while dividers remain unconnected', () => {
  assert.equal(createCanvasItem('line', 0, 0).staticAnchors, true);
  assert.equal(createCanvasItem('divider', 0, 0).staticAnchors, false);
});

test('the edit bar immediately opens the first tab for each single, multi and nested selection', async (t) => {
  const { host, root } = mount(t);
  const a = note(0, 0),
    b = note(400, 0),
    c = note(800, 0);
  const noop = () => {};
  const props = {
    onUpdateItem: noop,
    onDeleteItems: noop,
    onGroupItems: noop,
    onFitFrame: noop,
    onClose: noop,
    onBringForward: noop,
    onSendBackward: noop,
    onBringToFront: noop,
    onSendToBack: noop,
    onUpdateColumnItem: noop,
  };
  const render = (selectedItems, columnItem) =>
    root.render(createElement(ThemeProvider, null, createElement(EditBar, { ...props, selectedItems, columnItem })));
  const active = () => host.querySelector('[role="tab"][aria-selected="true"]')?.textContent;
  const tab = (title) => host.querySelector(`[role="tab"][title="${title}"]`);
  await act(async () => render([a]));
  assert.equal(active(), 'Appearance');
  assert.ok(host.querySelector('#edit-bar-panel-appearance'));
  await dispatch(tab('Text'), 'click', 0, 0);
  assert.equal(active(), 'Text');
  // Editing content does not reset the user's current tab.
  await act(async () => render([{ ...a, content: 'Changed' }]));
  assert.equal(active(), 'Text');
  await act(async () => render([b]));
  assert.equal(active(), 'Appearance');
  await act(async () => render([a]));
  assert.equal(active(), 'Appearance');
  await act(async () => render([a, b]));
  assert.equal(active(), 'Appearance');
  await dispatch(tab('Appearance'), 'click', 0, 0);
  assert.equal(active(), undefined);
  await act(async () => render([b, c]));
  assert.equal(active(), 'Appearance');
  await act(async () => render([b, c], a));
  assert.equal(active(), 'Appearance');
  await dispatch(tab('Text'), 'click', 0, 0);
  await act(async () => render([b, c], b));
  assert.equal(active(), 'Appearance');
});
