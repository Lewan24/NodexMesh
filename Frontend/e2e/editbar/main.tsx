import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import '@/app/styles/index.css';
import { changeLanguage } from '@/shared/i18n';
import { ThemeProvider, useTheme } from '@/app/providers/ThemeProvider';
import { ProjectTasksProvider } from '@/features/blocks/shared/ProjectTasksContext';
import KanbanBlock from '@/features/blocks/kanban/KanbanBlock';
import type { BoardItem, KanbanItem } from '@/entities/board/types';
import type { ToolType } from '@/entities/board/toolTypes';
import { ITEM_WIDTH } from '@/features/canvas/constants';
import { createCanvasItem } from '@/features/canvas/utils/createCanvasItem';
import { createDrawing } from '@/features/blocks/drawing/drawingUtils';
import EditBar from '@/features/blocks/editbar/EditBar';
import ItemInspector from '@/features/inspector/ItemInspector';
import MobilePanel from '@/shared/components/dialogs/MobilePanel';

await changeLanguage('en');
const types = [...Object.keys(ITEM_WIDTH), 'divider', 'multi', 'mixed', 'drawings', 'group', 'nested', 'locked'];
function create(type: string): BoardItem {
  const item =
    type === 'drawing'
      ? createDrawing(
          [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
          1,
        )
      : createCanvasItem(type as ToolType, 0, 0);
  if (!item) throw new Error(`Unsupported fixture: ${type}`);
  return item;
}
function selection(mode: string): { items: BoardItem[]; nested?: BoardItem } {
  if (mode === 'multi') return { items: [create('note'), create('checklist')] };
  if (mode === 'mixed') return { items: [create('note'), create('drawing'), create('line')] };
  if (mode === 'drawings') return { items: [create('drawing'), create('drawing')] };
  if (mode === 'group')
    return { items: [create('note'), create('note')].map((item) => ({ ...item, groupId: 'group' })) };
  if (mode === 'nested') return { items: [create('column')], nested: create('note') };
  if (mode === 'locked') return { items: [{ ...create('note'), locked: true }] };
  return { items: [create(mode)] };
}
function Harness() {
  const { theme, setTheme } = useTheme();
  const mode = new URLSearchParams(location.search).get('mode');
  const kanbanMode = mode === 'kanban' || mode === 'filters';
  const [current, setCurrent] = useState(() => {
    const initial = selection(kanbanMode ? 'kanban' : 'note');
    if (mode === 'filters' && initial.items[0]?.type === 'kanban') {
      const make = (text: string, extra = {}) => ({ id: crypto.randomUUID(), text, done: false, ...extra });
      initial.items[0].columns[0]!.cards = [
        make('Anna urgent', { assigneeUserId: 'anna', categoryIds: ['important'], deadline: '2026-11-08' }),
        make('Bob medium', { assigneeUserId: 'bob', categoryIds: ['medium'], deadline: '2026-11-10' }),
        make('Title only'),
        make('Completed Anna', { assigneeUserId: 'anna', categoryIds: ['medium'], deadline: '2026-11-12', done: true }),
        make('Unassigned urgent', { categoryId: 'important', deadline: '2026-11-09' }),
        make('Bob multi-category', {
          assigneeUserId: 'bob',
          categoryIds: ['important', 'medium'],
          deadline: '2026-11-11',
        }),
      ];
    }
    return initial;
  });
  const update = (id: string, updater: (item: BoardItem) => BoardItem) =>
    setCurrent((state) => ({
      items: state.items.map((item) => (item.id === id ? updater(item) : item)),
      nested: state.nested?.id === id ? updater(state.nested) : state.nested,
    }));
  const noop = () => {};
  if (kanbanMode) {
    const item = current.items[0] as KanbanItem;
    return (
      <main className="p-6">
        <div className="flex gap-4 mb-4 text-sm">
          <label>
            Background{' '}
            <input
              aria-label="Test background"
              type="color"
              value={item.color ?? '#ffffff'}
              onChange={(event) => update(item.id, (current) => ({ ...current, color: event.target.value }))}
            />
          </label>
          <label>
            Theme{' '}
            <select
              aria-label="Test theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value as 'light' | 'dark')}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <button type="button" onClick={() => update(item.id, (current) => ({ ...current, width: 596 }))}>
            Narrow columns
          </button>
        </div>
        <ProjectTasksProvider
          projectId=""
          readOnly={false}
          participants={[
            { userId: 'anna', displayName: 'Anna', role: 'Owner' },
            { userId: 'bob', displayName: 'Bob', role: 'Editor' },
          ]}
        >
          <KanbanBlock item={item} onUpdate={(updater) => update(item.id, updater)} onDelete={noop} />
        </ProjectTasksProvider>
        <output data-fixture-state="true" className="hidden">
          {JSON.stringify(current)}
        </output>
      </main>
    );
  }
  return (
    <>
      <header className="flex items-center gap-4 p-2 text-sm" style={{ height: 48 }}>
        <label>
          Selection{' '}
          <select
            aria-label="Selection"
            defaultValue="note"
            onChange={(event) => setCurrent(selection(event.target.value))}
          >
            {types.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
      </header>
      <main
        data-editbar-fixture="true"
        className="absolute bottom-0 left-0 top-12"
        style={{ width: 'calc(100% - 240px)' }}
      >
        <MobilePanel title="Item style" slot="edit">
          <EditBar
            selectedItems={current.items}
            columnItem={current.nested}
            onUpdateItem={update}
            onUpdateColumnItem={current.nested ? (updater) => update(current.nested!.id, updater) : undefined}
            onDeleteItems={noop}
            onGroupItems={noop}
            onFitFrame={noop}
            onClose={noop}
            onBringForward={noop}
            onSendBackward={noop}
            onBringToFront={noop}
            onSendToBack={noop}
            onJoinDrawings={current.items.filter((item) => item.type === 'drawing').length > 1 ? noop : undefined}
            frameControls={
              <label className="text-xs">
                Frame{' '}
                <select>
                  <option>No frame</option>
                </select>
              </label>
            }
          />
        </MobilePanel>
        <ItemInspector
          items={current.nested ? [current.nested] : current.items}
          onUpdateAll={(updater) => {
            for (const item of current.nested ? [current.nested] : current.items) update(item.id, updater);
          }}
          onClose={noop}
        />
        <output data-fixture-state="true" className="hidden">
          {JSON.stringify(current)}
        </output>
      </main>
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Harness />
  </ThemeProvider>,
);
