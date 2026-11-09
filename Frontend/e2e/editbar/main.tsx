import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import '@/app/styles/index.css';
import { changeLanguage } from '@/shared/i18n';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import type { BoardItem } from '@/entities/board/types';
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
  const [current, setCurrent] = useState(() => selection('note'));
  const update = (id: string, updater: (item: BoardItem) => BoardItem) =>
    setCurrent((state) => ({
      items: state.items.map((item) => (item.id === id ? updater(item) : item)),
      nested: state.nested?.id === id ? updater(state.nested) : state.nested,
    }));
  const noop = () => {};
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
