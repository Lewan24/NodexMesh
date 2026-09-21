import SharingDialog from '@/features/projects/components/SharingDialog';
import ReadOnlyBoard from '@/features/projects/components/ReadOnlyBoard';
import { collaborationToken, sharingApi } from '@/app/services';
import { flushPendingChanges } from '@/shared/api/pendingChanges';
import { createId } from '@/shared/lib/createId';
const AppearanceDialog = lazy(() => import('@/features/appearance/AppearanceDialog'));
import { useTheme } from '@/app/providers/ThemeProvider';
import { useCallback, useState, useEffect, lazy, Suspense } from 'react';
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
import { useCollaborationPresence } from '@/features/projects/hooks/useCollaborationPresence';

interface BoardPageProps {
  userId: string;
  onOpenAdminPanel: () => void;
  onOpenProfile: () => void;
}

export default function BoardPage({ userId, onOpenAdminPanel, onOpenProfile }: BoardPageProps) {
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
    createBoard,
    renameBoard,
    deleteBoard,
    createFirstProject,
    resetDemo,
    importProject,
    renameProject,
    trashProject,
    restoreProject,
    emptyTrash,
  } = useProjects(userId);

  const [boardTrail, setBoardTrail] = useState<Array<{ id: string; name: string }>>([]);
  const [boards, setBoards] = useState<BoardRecord[]>([]);
  useEffect(() => {
    if (!activeProject) {
      setBoards([]);
      return;
    }
    let cancelled = false;
    void listBoards(activeProject.id)
      .then((value) => {
        if (!cancelled) setBoards(value);
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load the project boards.');
      });
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id, listBoards]);

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
        toast.error('Could not open this board.');
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
        toast.error('Could not open this board.');
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
        .catch(() => toast.error('Could not create the linked board. Please try again.'));
    },
    [activeProject, createBoard, addItem],
  );

  const handleRenameBoard = useCallback(
    (boardId: string, name: string) => {
      if (!activeProject || !name.trim()) return;
      void renameBoard(activeProject.id, boardId, name.trim())
        .then((record) => setBoards((current) => current.map((board) => (board.id === record.id ? record : board))))
        .catch(() => toast.error('Could not rename this board.'));
    },
    [activeProject, renameBoard],
  );

  const handleDeleteBoard = useCallback(
    async (boardId: string) => {
      if (!activeProject || boardId === boards[0]?.id) return;
      const board = boards.find((entry) => entry.id === boardId);
      if (!board || !window.confirm(`Delete board “${board.name}” and all its content?`)) return;

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
        toast.error('Could not delete this board.');
      }
    },
    [activeProject, boards, deleteBoard, resetBoardView, selectBoard, setProjects],
  );

  const handleDeleteItems = useCallback(
    (ids: string[]) => {
      const linkedBoards =
        activeProject?.items
          .filter(
            (item): item is Extract<BoardItem, { type: 'board' }> => item.type === 'board' && ids.includes(item.id),
          )
          .map((item) => item.boardId)
          .filter((boardId): boardId is string => Boolean(boardId)) ?? [];
      deleteItems(ids);
      if (!activeProject) return;
      void Promise.all(linkedBoards.map((boardId) => deleteBoard(activeProject.id, boardId)))
        .then(() => setBoards((current) => current.filter((board) => !linkedBoards.includes(board.id))))
        .catch(() => toast.error('The board card was removed, but its board could not be deleted.'));
    },
    [activeProject, deleteBoard, deleteItems],
  );

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
      title: 'Group',
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
        Loading projects…
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="flex flex-col h-dvh w-full" style={{ backgroundColor: 'var(--color-app-bg)' }}>
        {appBar}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-theme-muted">
          <p>No active projects. Create a board or restore one from the project trash.</p>
          <button className="btn-accent rounded-xl px-4 py-2.5 text-sm font-semibold" onClick={createFirstProject}>
            Create your first board
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
        {(boardTrail.length > 0 || boards.length > 1) && (
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
              ← Main board
            </button>
            <span style={{ color: 'var(--color-text-muted)' }}>/</span>
            {boards.map((board) => (
              <span key={board.id} className="inline-flex items-center rounded hover:bg-black/5 dark:hover:bg-white/10">
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5"
                  aria-current={board.id === activeProject.boardId ? 'page' : undefined}
                  onClick={() => void handleSelectListedBoard(board.id)}
                >
                  {board.name}
                </button>
                {board.id !== boards[0]?.id && (
                  <button
                    type="button"
                    className="rounded px-1 text-[10px] opacity-50 hover:bg-rose-500/15 hover:text-rose-600 hover:opacity-100"
                    aria-label={`Delete board ${board.name}`}
                    title="Delete board"
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
          </div>
        )}
        {!readOnly && <Sidebar selectedTool={selectedTool} onSelectTool={selectTool} />}

        {readOnly ? (
          <ReadOnlyBoard key={activeProjectId} items={activeProject.items} />
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
            onDeleteItem={deleteItem}
            onDeleteItems={handleDeleteItems}
            onBringForward={bringForward}
            onSendBackward={sendBackward}
            onBringToFront={bringToFront}
            onSendToBack={sendToBack}
            onDropOnColumn={handleDropOnColumn}
            onEjectFromColumn={handleEjectFromColumn}
            onRestoreItems={restoreItems}
            searchQuery={searchQuery}
          />
        )}
      </div>
    </div>
  );
}
