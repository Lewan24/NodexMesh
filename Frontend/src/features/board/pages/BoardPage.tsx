import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import SharingDialog from '@/features/projects/components/SharingDialog';
import ReadOnlyBoard from '@/features/projects/components/ReadOnlyBoard';
import { collaborationToken, sharingApi } from '@/app/services';
import { flushPendingChanges } from '@/shared/api/pendingChanges';
import { createId } from '@/shared/lib/createId';
const AppearanceDialog = lazy(() => import('@/features/appearance/AppearanceDialog'));
import { useTheme } from '@/app/providers/ThemeProvider';
import { useCallback, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

import type { BoardItem, ColumnItem, FrameItem } from '@/entities/board/types';
import type { BoardRecord } from '@/entities/board/records';

import { useBoardView } from '@/features/board/hooks/useBoardView';
import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';
import { useProjectItems } from '@/features/projects/hooks/useProjectItems';
import { useProjects } from '@/features/projects/hooks/useProjects';

import Canvas from '@/features/canvas/components/Canvas';
import AppBar from '@/layout/appbar/AppBar';
import Sidebar from '@/layout/sidebar/Sidebar';
import SaveStatus from '@/features/projects/components/SaveStatus';
import ItemTrashPanel from '@/features/projects/components/ItemTrashPanel';
import { useCollaborationPresence } from '@/features/projects/hooks/useCollaborationPresence';
import type { TrashedItemRecord } from '@/entities/board/records';

interface BoardPageProps {
  userId: string;
  onOpenAdminPanel: () => void;
  onOpenProfile: () => void;
}

function linkedBoardIdFromItem(item: BoardItem | undefined): string | undefined {
  return item?.type === 'board' ? (item.boardId ?? undefined) : undefined;
}

function linkedBoardIdFromTrash(entry: TrashedItemRecord): string | undefined {
  if (entry.item.type !== 'board') return undefined;
  const boardId = (entry.item.data as { boardId?: unknown }).boardId;
  return typeof boardId === 'string' ? boardId : undefined;
}

export default function BoardPage({ userId, onOpenAdminPanel, onOpenProfile }: BoardPageProps) {
  useTranslation();
  const {
    status,
    remoteVersion,
    liveStatus,
    error,
    retry,
    reload,
    projects,
    activeProject,
    activeProjectId,
    setProjects,
    addProject,
    selectProject,
    selectBoard,
    listBoards,
    saveComments,
    createBoard,
    renameBoard,
    deleteBoard,
    listItemTrash,
    restoreTrashItem,
    purgeTrashItem,
    emptyItemTrash,
    createFirstProject,
    resetDemo,
    importProject,
    renameProject,
    trashProject,
    restoreProject,
    emptyTrash,
    purgeProject,
    exportProject,
    defaultProjectId,
    setDefaultProject,
  } = useProjects(userId);

  const [boardTrail, setBoardTrail] = useState<Array<{ id: string; name: string }>>([]);
  const [boards, setBoards] = useState<BoardRecord[]>([]);
  const [boardNavigationVisible, setBoardNavigationVisible] = useState(true);
  const trashRequest = useRef(0);
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashedItems, setTrashedItems] = useState<TrashedItemRecord[]>([]);
  useEffect(() => {
    if (!activeProject) {
      setBoards([]);
      return;
    }
    if (status !== 'saved') return;
    let cancelled = false;
    void listBoards(activeProject.id)
      .then((value) => {
        if (!cancelled) setBoards(value);
      })
      .catch(() => {
        if (!cancelled) toast.error(translate('Could not load the project boards.'));
      });
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, listBoards, status]);
  useEffect(() => {
    ++trashRequest.current;
    setTrashOpen(false);
    setTrashedItems([]);
  }, [activeProject?.id]);

  const { setScope } = useTheme();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [sharingOpen, setSharingOpen] = useState(false);
  const readOnly = activeProject?.role === 'Viewer' || activeProject?.role === 'Commenter';
  useEffect(() => {
    setScope(userId, activeProjectId);
  }, [userId, activeProjectId, setScope]);
  useEffect(() => () => setScope('', ''), [setScope]);

  const {
    selectedTool,
    setSelectedTool,
    selectTool,
    selectedIds,
    setSelectedIds,
    pan,
    setPan,
    zoom,
    setZoom,
    resetViewport,
    resetBoardView,
  } = useBoardView();

  const remotePresence = useCollaborationPresence(
    activeProjectId,
    activeProject?.boardId,
    userId,
    selectedIds,
    collaborationToken,
  );

  const {
    addItem,
    updateItem,
    restoreItems,
    deleteItem,
    deleteItems,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
  } = useProjectItems({ activeProjectId, setProjects });

  const [searchQuery, setSearchQuery] = useState('');

  const handleAddProject = useCallback(
    (name: string) => {
      addProject(name);
      resetViewport();
    },
    [addProject, resetViewport],
  );

  const handleSelectProject = useCallback(
    (id: string) => {
      selectProject(id);
      resetBoardView();
    },
    [selectProject, resetBoardView],
  );

  const handleOpenBoard = useCallback(
    async (boardId: string) => {
      if (!activeProject || boardId === activeProject.boardId) return;

      const sourceBoard = boards.find((board) => board.id === activeProject.boardId);
      try {
        await selectBoard(activeProject.id, boardId);
        setBoardTrail((trail) => [
          ...trail,
          { id: activeProject.boardId ?? '', name: sourceBoard?.name ?? activeProject.name },
        ]);
        resetBoardView();
      } catch {
        toast.error(translate('Could not open this board.'));
      }
    },
    [activeProject, boards, selectBoard, resetBoardView],
  );

  const handleSelectListedBoard = useCallback(
    async (boardId: string) => {
      if (!activeProject || boardId === activeProject.boardId) return;

      try {
        await selectBoard(activeProject.id, boardId);
        if (boardId === boards[0]?.id) setBoardTrail([]);
        else if (boardTrail.length === 0) {
          const sourceBoard = boards.find((board) => board.id === activeProject.boardId);
          setBoardTrail([{ id: activeProject.boardId ?? '', name: sourceBoard?.name ?? activeProject.name }]);
        }
        resetBoardView();
      } catch {
        toast.error(translate('Could not open this board.'));
      }
    },
    [activeProject, boardTrail.length, boards, selectBoard, resetBoardView],
  );

  const handleAddItem = useCallback(
    (item: BoardItem) => {
      if (item.type !== 'board' || !activeProject) {
        addItem(item);
        return;
      }

      // Provision the linked board first so a placed card is never persisted with
      // a broken destination. Canvas keeps the selected ID while this completes.
      void createBoard(activeProject.id, item.title)
        .then((board) => {
          setBoards((current) =>
            current.some((entry) => entry.id === board.board.id) ? current : [...current, board.board],
          );
          addItem({ ...item, boardId: board.board.id });
        })
        .catch(() => toast.error(translate('Could not create the linked board. Please try again.')));
    },
    [activeProject, createBoard, addItem],
  );

  const handleRenameBoard = useCallback(
    (boardId: string, name: string) => {
      if (!activeProject || !name.trim()) return;
      void renameBoard(activeProject.id, boardId, name.trim())
        .then((record) => setBoards((current) => current.map((board) => (board.id === record.id ? record : board))))
        .catch(() => toast.error(translate('Could not rename this board.')));
    },
    [activeProject, renameBoard],
  );

  const handleDeleteBoard = useCallback(
    async (boardId: string) => {
      if (!activeProject || boardId === boards[0]?.id) return;
      const board = boards.find((entry) => entry.id === boardId);
      if (
        !board ||
        !window.confirm(translate('Delete board “{{value1}}” and all its content?', { value1: board.name }))
      )
        return;

      const mainBoardId = boards[0]?.id;
      try {
        await deleteBoard(activeProject.id, boardId);
        setBoards((current) => current.filter((entry) => entry.id !== boardId));
        if (activeProject.boardId === boardId && mainBoardId) {
          await selectBoard(activeProject.id, mainBoardId);
          setBoardTrail([]);
          resetBoardView();
        }
        setProjects((projects) =>
          projects.map((project) =>
            project.id === activeProject.id
              ? { ...project, items: project.items.filter((item) => item.type !== 'board' || item.boardId !== boardId) }
              : project,
          ),
        );
      } catch {
        toast.error(translate('Could not delete this board.'));
      }
    },
    [activeProject, boards, deleteBoard, resetBoardView, selectBoard, setProjects],
  );

  const refreshItemTrash = useCallback(async () => {
    if (!activeProject) return;
    const request = ++trashRequest.current;
    setTrashLoading(true);
    try {
      const items = await listItemTrash(activeProject.id);
      if (request === trashRequest.current) setTrashedItems(items);
    } catch {
      if (request === trashRequest.current) toast.error(translate('Could not load the item trash.'));
    } finally {
      if (request === trashRequest.current) setTrashLoading(false);
    }
  }, [activeProject, listItemTrash]);

  const handleDeleteItem = useCallback(
    (id: string) => {
      const linkedBoardId = linkedBoardIdFromItem(activeProject?.items.find((item) => item.id === id));
      if (linkedBoardId) {
        const deletedAt = new Date().toISOString();
        setBoards((boards) => boards.map((board) => (board.id === linkedBoardId ? { ...board, deletedAt } : board)));
      }
      deleteItem(id);
      if (trashOpen) void refreshItemTrash();
    },
    [activeProject, deleteItem, refreshItemTrash, trashOpen],
  );

  const handleDeleteItems = useCallback(
    (ids: string[]) => {
      // Linked boards stay intact while their cards are in trash, so restoring a
      // board card can never produce a broken destination.
      const linkedBoardIds = new Set(
        activeProject?.items
          .filter((item) => ids.includes(item.id))
          .map(linkedBoardIdFromItem)
          .filter((id): id is string => Boolean(id)) ?? [],
      );
      if (linkedBoardIds.size) {
        const deletedAt = new Date().toISOString();
        setBoards((boards) => boards.map((board) => (linkedBoardIds.has(board.id) ? { ...board, deletedAt } : board)));
      }
      deleteItems(ids);
      if (trashOpen) void refreshItemTrash();
    },
    [activeProject, deleteItems, refreshItemTrash, trashOpen],
  );

  const handleRestoreTrashItem = useCallback(
    async (entry: TrashedItemRecord, position?: { x: number; y: number }) => {
      if (!activeProject?.boardId) return;
      const targetBoardId = position ? activeProject.boardId : entry.item.boardId;
      try {
        await restoreTrashItem(activeProject.id, entry.item.id, targetBoardId, position);
        setBoards(await listBoards(activeProject.id));
        setTrashedItems((items) => items.filter((item) => item.item.id !== entry.item.id));
        toast.success(position ? translate('Item restored to the canvas.') : translate('Item restored.'));
      } catch {
        toast.error(translate('Could not restore this item.'));
      }
    },
    [activeProject, listBoards, restoreTrashItem],
  );

  const handlePurgeTrashItem = useCallback(
    async (entry: TrashedItemRecord) => {
      if (!activeProject || !window.confirm(translate('Permanently delete this item? This cannot be undone.'))) return;
      try {
        ++trashRequest.current;
        await purgeTrashItem(activeProject.id, entry.item.id);
        ++trashRequest.current;
        setTrashLoading(false);
        const linkedBoardId = linkedBoardIdFromTrash(entry);
        if (linkedBoardId) setBoards((boards) => boards.filter((board) => board.id !== linkedBoardId));
        setTrashedItems((items) => items.filter((item) => item.item.id !== entry.item.id));
        await refreshItemTrash();
      } catch {
        setTrashLoading(false);
        toast.error(translate('Could not permanently delete this item.'));
      }
    },
    [activeProject, purgeTrashItem, refreshItemTrash],
  );

  const handleEmptyItemTrash = useCallback(async () => {
    if (!activeProject || !window.confirm(translate('Permanently delete every item in this project trash?'))) return;
    try {
      ++trashRequest.current;
      await emptyItemTrash(activeProject.id);
      ++trashRequest.current;
      setTrashLoading(false);
      const linkedBoardIds = new Set(
        trashedItems.map(linkedBoardIdFromTrash).filter((id): id is string => typeof id === 'string'),
      );
      setBoards((boards) => boards.filter((board) => !linkedBoardIds.has(board.id)));
      setTrashedItems([]);
    } catch {
      setTrashLoading(false);
      toast.error(translate('Could not empty the item trash.'));
    }
  }, [activeProject, emptyItemTrash, trashedItems]);

  const handleDropOnColumn = useCallback(
    (itemId: string, columnId: string) => {
      setProjects((previous) =>
        previous.map((project) => {
          if (project.id !== activeProjectId) {
            return project;
          }

          const droppedItem = project.items.find((item) => item.id === itemId);

          if (!droppedItem) {
            return project;
          }

          return {
            ...project,
            items: project.items
              .filter((item) => item.id !== itemId)
              .map((item) => {
                if (item.id !== columnId || item.type !== 'column') {
                  return item;
                }

                return { ...item, items: [...item.items, { ...droppedItem, x: 0, y: 0, zIndex: 1 }] };
              }),
          };
        }),
      );
    },
    [activeProjectId, setProjects],
  );

  const handleEjectFromColumn = useCallback(
    (columnId: string, ejectedItem: BoardItem, position?: { x: number; y: number }) => {
      setProjects((previous) =>
        previous.map((project) => {
          if (project.id !== activeProjectId) {
            return project;
          }

          const column = project.items.find((item) => item.id === columnId && item.type === 'column') as
            | ColumnItem
            | undefined;

          if (!column) {
            return project;
          }

          const newItem: BoardItem = {
            ...ejectedItem,

            id: ejectedItem.id,

            x: position?.x ?? column.x + column.width + 24,

            y: position?.y ?? column.y + 40,

            zIndex: Math.max(0, ...project.items.map((item) => item.zIndex)) + 1,
          };

          const updatedColumn: ColumnItem = {
            ...column,

            items: column.items.filter((item) => item.id !== ejectedItem.id),
          };

          return {
            ...project,

            items: [...project.items.filter((item) => item.id !== columnId), updatedColumn, newItem],
          };
        }),
      );
    },
    [activeProjectId, setProjects],
  );

  const handleGroupSelected = useCallback(() => {
    if (selectedIds.length < 2 || !activeProject) {
      return;
    }

    const selectedItems = activeProject.items.filter((item) => selectedIds.includes(item.id));

    if (selectedItems.length < 2) {
      return;
    }

    const padding = 32;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const item of selectedItems) {
      const size = getApproxItemSize(item);

      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);

      maxX = Math.max(maxX, item.x + size.width);
      maxY = Math.max(maxY, item.y + size.height);
    }

    const frame: FrameItem = {
      id: createId(),
      type: 'frame',
      x: minX - padding,
      y: minY - padding,
      zIndex: Math.max(0, Math.min(...selectedItems.map((item) => item.zIndex)) - 1),
      title: translate('Group'),
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2,
      color: '#7C3AED',
    };

    addItem(frame);
    selectedItems
      .filter((item) => item.type !== 'frame' && !item.locked)
      .forEach((item) => updateItem(item.id, (current) => ({ ...current, frameId: frame.id })));
    setSelectedIds([]);
  }, [selectedIds, activeProject, addItem, updateItem, setSelectedIds]);

  const appBar = (
    <>
      <AppBar
        onOpenAdminPanel={onOpenAdminPanel}
        onOpenProfile={onOpenProfile}
        onShare={activeProject && sharingApi && status === 'saved' ? () => setSharingOpen(true) : undefined}
        onRefresh={async () => {
          if (await flushPendingChanges()) await reload();
        }}
        liveStatus={liveStatus}
        onAppearance={() => setAppearanceOpen(true)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onAddProject={handleAddProject}
        onRenameProject={renameProject}
        onTrashProject={(id) => {
          trashProject(id);
          resetBoardView();
        }}
        onEmptyTrash={emptyTrash}
        onPurgeProject={purgeProject}
        onExportProject={exportProject}
        defaultProjectId={defaultProjectId}
        onSetDefaultProject={setDefaultProject}
        onRestoreProject={(id) => {
          restoreProject(id);
          resetBoardView();
        }}
        onResetDemo={resetDemo}
        onImportProject={importProject}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
      <SaveStatus status={status} error={error} projects={projects} retry={retry} reload={reload} />
      {sharingOpen && activeProject && sharingApi && (
        <SharingDialog
          key={activeProject.id}
          project={activeProject}
          userId={userId}
          onClose={() => setSharingOpen(false)}
          onLeave={() => {
            setSharingOpen(false);
            void reload();
          }}
        />
      )}
      {appearanceOpen && (
        <Suspense fallback={null}>
          <AppearanceDialog projects={projects} onClose={() => setAppearanceOpen(false)} />
        </Suspense>
      )}
    </>
  );

  if (status === 'loading') {
    return (
      <div className="flex h-dvh items-center justify-center" role="status">
        {translate('Loading projects…')}
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col h-dvh w-full" style={{ backgroundColor: 'var(--color-app-bg)' }}>
        {appBar}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-theme-muted">
          <p>{translate('No active projects. Create a board or restore one from the project trash.')}</p>
          <button className="btn-accent rounded-xl px-4 py-2.5 text-sm font-semibold" onClick={createFirstProject}>
            {translate('Create your first board')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="board-shell flex flex-col h-dvh w-full overflow-clip">
      {appBar}

      <div
        className="relative isolate z-0 flex flex-1 min-h-0 min-w-0 w-full overflow-hidden"
        style={{ backgroundColor: 'var(--color-app-bg)' }}
      >
        {(boardTrail.length > 0 || boards.length > 1) && boardNavigationVisible && (
          <div
            className="absolute left-1/2 top-9 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-lg"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            <button
              type="button"
              className="font-medium hover:underline"
              onClick={() => {
                const mainBoardId = boards[0]?.id || boardTrail[0]?.id;
                if (mainBoardId) void handleSelectListedBoard(mainBoardId);
              }}
            >
              {translate('← Main board')}
            </button>
            <span style={{ color: 'var(--color-text-muted)' }}>/</span>
            {boards.map((board) => (
              <span
                key={board.id}
                className={`inline-flex items-center rounded ${board.deletedAt ? 'cursor-not-allowed opacity-45' : 'hover:bg-black/5 dark:hover:bg-white/10'}`}
                title={
                  board.deletedAt
                    ? translate('This board is in item trash. Restore its board card to access it.')
                    : undefined
                }
              >
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5"
                  aria-current={board.id === activeProject.boardId ? 'page' : undefined}
                  disabled={Boolean(board.deletedAt)}
                  aria-label={board.deletedAt ? translate('{{value1}} (deleted)', { value1: board.name }) : board.name}
                  onClick={() => void handleSelectListedBoard(board.id)}
                >
                  {board.name}
                </button>
                {board.id !== boards[0]?.id && !board.deletedAt && (
                  <button
                    type="button"
                    className="rounded px-1 text-[10px] opacity-50 hover:bg-rose-500/15 hover:text-rose-600 hover:opacity-100"
                    aria-label={translate('Delete board {{value1}}', { value1: board.name })}
                    title={translate('Delete board')}
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDeleteBoard(board.id);
                    }}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            <button
              type="button"
              className="-mr-1 flex size-6 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              aria-label={translate('Hide board navigation')}
              title={translate('Hide board navigation')}
              onClick={() => setBoardNavigationVisible(false)}
            >
              <ChevronUp size={16} aria-hidden="true" />
            </button>
          </div>
        )}
        {(boardTrail.length > 0 || boards.length > 1) && !boardNavigationVisible && (
          <button
            type="button"
            className="absolute left-1/2 top-2 z-30 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border shadow-md transition-transform hover:scale-105"
            style={{
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            aria-label={translate('Show board navigation')}
            title={translate('Show board navigation')}
            onClick={() => setBoardNavigationVisible(true)}
          >
            <ChevronDown size={17} aria-hidden="true" />
          </button>
        )}
        {!readOnly && <Sidebar selectedTool={selectedTool} onSelectTool={selectTool} />}

        {readOnly ? (
          <ReadOnlyBoard
            key={`${activeProjectId}:${activeProject.boardId}`}
            items={activeProject.items}
            inspect
            canComment={activeProject.role === 'Commenter'}
            currentUserId={userId}
            onSaveComments={(itemId, comments) => saveComments(activeProjectId, itemId, comments)}
            onOpenBoard={(boardId) => {
              void selectBoard(activeProjectId, boardId).catch(() => toast.error(translate('Could not open board.')));
            }}
          />
        ) : (
          <Canvas
            key={`${activeProjectId}:${activeProject.boardId ?? ''}`}
            project={activeProject}
            remoteVersion={remoteVersion}
            remotePresence={remotePresence}
            selectedTool={selectedTool}
            pan={pan}
            zoom={zoom}
            selectedIds={selectedIds}
            onPanChange={setPan}
            onZoomChange={setZoom}
            onSelectTool={setSelectedTool}
            onSelectItems={setSelectedIds}
            onGroupSelected={handleGroupSelected}
            onAddItem={handleAddItem}
            onOpenBoard={handleOpenBoard}
            onRenameBoard={handleRenameBoard}
            onUpdateItem={updateItem}
            onDeleteItem={handleDeleteItem}
            onDeleteItems={handleDeleteItems}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
            onDropOnColumn={handleDropOnColumn}
            onEjectFromColumn={handleEjectFromColumn}
            onRestoreItems={restoreItems}
            searchQuery={searchQuery}
            onOpenTrash={() => {
              setTrashOpen(true);
              void refreshItemTrash();
            }}
            onRestoreTrashItem={(itemId, position) => {
              const entry = trashedItems.find((item) => item.item.id === itemId);
              if (entry) void handleRestoreTrashItem(entry, position);
            }}
          />
        )}
        {trashOpen && !readOnly && (
          <ItemTrashPanel
            items={trashedItems}
            loading={trashLoading}
            onClose={() => setTrashOpen(false)}
            onRestore={(entry) => void handleRestoreTrashItem(entry)}
            onPurge={(entry) => void handlePurgeTrashItem(entry)}
            onEmpty={() => void handleEmptyItemTrash()}
          />
        )}
      </div>
    </div>
  );
}
