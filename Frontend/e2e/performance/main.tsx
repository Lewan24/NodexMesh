import '@/shared/i18n';
import '@/app/styles/index.css';
import { useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import Canvas from '@/features/canvas/components/Canvas';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { createCanvasItem } from '@/features/canvas/utils/createCanvasItem';
import type { BoardItem } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';
import type { ProjectParticipant } from '@/entities/project/shareTypes';
import type { ToolType } from '@/entities/board/toolTypes';
import type { RemotePresence } from '@/features/projects/hooks/useCollaborationPresence';

// This entry is built separately; it is never included in the application build.
const count = Number(new URLSearchParams(location.search).get('count') ?? 500);
const noop = () => {};
const participants: ProjectParticipant[] = [];
const initialItems = Array.from({ length: count }, (_, index) => {
  const item = createCanvasItem('note', (index % 30) * 280, Math.floor(index / 30) * 240);
  if (!item || item.type !== 'note') throw new Error('The fixture requires note items.');
  return {
    ...item,
    id: `note-${index}`,
    content: `Note ${index}\nA representative planning note for the performance fixture.`,
    frameId: null,
    width: 220,
    height: 170,
    zIndex: index + 1,
  };
});

function Fixture() {
  const [items, setItems] = useState<BoardItem[]>(initialItems);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [remotePresence, setRemotePresence] = useState<Record<string, RemotePresence[]>>({});
  const project = useMemo<Project>(
    () => ({
      id: 'fixture',
      boardId: 'fixture-board',
      ownerId: 'fixture-user',
      name: 'Fixture',
      color: '#7c3aed',
      items,
    }),
    [items],
  );
  const updateItem = useCallback(
    (id: string, update: (item: BoardItem) => BoardItem) =>
      setItems((current) => current.map((item) => (item.id === id ? update(item) : item))),
    [],
  );
  const updateItems = useCallback(
    (updates: ReadonlyMap<string, (item: BoardItem) => BoardItem>) =>
      setItems((current) => current.map((item) => updates.get(item.id)?.(item) ?? item)),
    [],
  );
  const addItem = useCallback((item: BoardItem) => setItems((current) => [...current, item]), []);
  const removeItem = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  const removeItems = useCallback(
    (ids: string[]) => setItems((current) => current.filter((item) => !ids.includes(item.id))),
    [],
  );
  const callbacks = useMemo(
    () => ({
      onSelectTool: noop,
      onGroupSelected: noop,
      onBringForward: noop,
      onSendBackward: noop,
      onBringToFront: noop,
      onSendToBack: noop,
      onDropOnColumn: noop,
      onEjectFromColumn: noop,
      onOpenTrash: noop,
      onRestoreTrashItem: noop,
    }),
    [],
  );
  Object.assign(window, {
    canvasFixture: {
      setCamera: (nextPan: typeof pan, nextZoom = zoom) =>
        flushSync(() => {
          setPan(nextPan);
          setZoom(nextZoom);
        }),
      select: (ids: string[]) => flushSync(() => setSelectedIds(ids)),
      search: (query: string) => flushSync(() => setSearchQuery(query)),
      setItems: (next: BoardItem[]) => flushSync(() => setItems(next)),
      createItem: (type: ToolType, id: string, extra: Partial<BoardItem>) => ({
        ...createCanvasItem(type, 0, 0),
        id,
        ...extra,
      }),
      attend: (id: string) =>
        flushSync(() =>
          setRemotePresence({
            [id]: [
              { userId: 'remote', displayName: 'Remote user', itemIds: [id], mode: 'editing', expiresAt: '2099-01-01' },
            ],
          }),
        ),
      getState: () => ({ items, pan, zoom, selectedIds }),
    },
  });
  return (
    <div style={{ display: 'flex', height: '100dvh' }}>
      <Canvas
        remotePresence={remotePresence}
        projectParticipants={participants}
        project={project}
        pan={pan}
        zoom={zoom}
        selectedIds={selectedIds}
        selectedTool="select"
        searchQuery={searchQuery}
        onPanChange={setPan}
        onZoomChange={setZoom}
        onSelectItems={setSelectedIds}
        onRestoreItems={setItems}
        onUpdateItem={updateItem}
        onUpdateItems={updateItems}
        onAddItem={addItem}
        onDeleteItem={removeItem}
        onDeleteItems={removeItems}
        {...callbacks}
      />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <Fixture />
  </ThemeProvider>,
);
