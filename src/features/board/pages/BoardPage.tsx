import {
  useCallback,
} from 'react';

import type {
  BoardItem,
  ColumnItem,
  FrameItem,
} from '@/entities/board/types';

import { useProjects } from '@/features/projects/hooks/useProjects';
import { useProjectItems } from '@/features/projects/hooks/useProjectItems';
import { useBoardView } from '@/features/board/hooks/useBoardView';
import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';

import AppBar from '@/layout/AppBar';
import Sidebar from '@/layout/Sidebar';
import Canvas from '@/features/canvas/components/Canvas';

interface BoardPageProps {
  userId: string;
}

function createId(): string {
  return Math.random()
    .toString(36)
    .slice(2, 10);
}

export default function BoardPage({
  userId,
}: BoardPageProps) {
  const {
    projects,
    activeProject,
    activeProjectId,
    setProjects,
    addProject,
    selectProject,
    createFirstProject,
  } = useProjects(userId);

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

  const {
    addItem,
    updateItem,
    restoreItems,
    deleteItem,
    deleteItems,
    bringToFront,
    getNextZIndex
  } = useProjectItems({
    activeProjectId,
    setProjects,
  });

  const handleAddProject = useCallback(
    (name: string) => {
      addProject(name);
      resetViewport();
    },
    [
      addProject,
      resetViewport,
    ],
  );

  const handleSelectProject =
    useCallback(
      (id: string) => {
        selectProject(id);
        resetBoardView();
      },
      [
        selectProject,
        resetBoardView,
      ],
    );

  const handleDropOnColumn =
    useCallback(
      (
        itemId: string,
        columnId: string,
      ) => {
        setProjects(previous =>
          previous.map(project => {
            if (
              project.id !== activeProjectId
            ) {
              return project;
            }

            const droppedItem =
              project.items.find(
                item => item.id === itemId,
              );

            if (!droppedItem) {
              return project;
            }

            return {
              ...project,
              items: project.items
                .filter(
                  item =>
                    item.id !== itemId,
                )
                .map(item => {
                  if (
                    item.id !== columnId ||
                    item.type !== 'column'
                  ) {
                    return item;
                  }

                  return {
                    ...item,
                    items: [
                      ...item.items,
                      {
                        ...droppedItem,
                        x: 0,
                        y: 0,
                        zIndex: 1,
                      },
                    ],
                  };
                }),
            };
          }),
        );
      },
      [
        activeProjectId,
        setProjects,
      ],
    );

    const handleEjectFromColumn = useCallback(
    (
        columnId: string,
        ejectedItem: BoardItem,
    ) => {
        setProjects(previous =>
        previous.map(project => {
            if (project.id !== activeProjectId) {
            return project;
            }

            const column = project.items.find(
            item =>
                item.id === columnId &&
                item.type === 'column',
            ) as ColumnItem | undefined;

            if (!column) {
            return project;
            }

            const newItem: BoardItem = {
            ...ejectedItem,
            id: createId(),
            x: column.x + column.width + 24,
            y: column.y + 40,
            zIndex: getNextZIndex(),
            };

            const updatedColumn: ColumnItem = {
            ...column,
            items: column.items.filter(
                item => item.id !== ejectedItem.id,
            ),
            };

            return {
            ...project,
            items: [
                ...project.items.filter(
                item => item.id !== columnId,
                ),
                updatedColumn,
                newItem,
            ],
            };
        }),
        );
    },
    [
        activeProjectId,
        setProjects,
        getNextZIndex,
    ],
    );

  const handleGroupSelected =
    useCallback(() => {
      if (
        selectedIds.length < 2 ||
        !activeProject
      ) {
        return;
      }

      const selectedItems =
        activeProject.items.filter(
          item =>
            selectedIds.includes(
              item.id,
            ),
        );

      if (
        selectedItems.length < 2
      ) {
        return;
      }

      const padding = 32;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (
        const item of selectedItems
      ) {
        const size =
          getApproxItemSize(item);

        minX = Math.min(
          minX,
          item.x,
        );

        minY = Math.min(
          minY,
          item.y,
        );

        maxX = Math.max(
          maxX,
          item.x + size.width,
        );

        maxY = Math.max(
          maxY,
          item.y + size.height,
        );
      }

      const frame: FrameItem = {
        id: createId(),

        type: 'frame',

        x: minX - padding,
        y: minY - padding,

        zIndex: 0,

        title: 'Group',

        width:
          maxX -
          minX +
          padding * 2,

        height:
          maxY -
          minY +
          padding * 2,

        color: '#7C3AED',
      };

      addItem(frame);
      setSelectedIds([]);
    }, [
      selectedIds,
      activeProject,
      addItem,
      setSelectedIds,
    ]);

  if (!activeProject) {
    return (
      <div
        className="
          flex
          h-screen
          w-screen
          items-center
          justify-center
        "
        style={{
          backgroundColor:
            'var(--color-app-bg)',
        }}
      >
        <button
          className="
            btn-accent
            rounded-xl
            px-4
            py-2.5
            text-sm
            font-semibold
          "
          onClick={
            createFirstProject
          }
        >
          Create your first board
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <AppBar
        projects={projects}
        activeProjectId={
          activeProjectId
        }
        onSelectProject={
          handleSelectProject
        }
        onAddProject={
          handleAddProject
        }
      />

      <div
        className="
          relative
          flex
          h-screen
          w-screen
          overflow-hidden
        "
        style={{
          backgroundColor:
            'var(--color-app-bg)',
        }}
      >
        <Sidebar
          selectedTool={
            selectedTool
          }
          onSelectTool={
            selectTool
          }
        />

        <Canvas
          key={activeProjectId}
          project={
            activeProject
          }
          selectedTool={
            selectedTool
          }
          pan={pan}
          zoom={zoom}
          selectedIds={
            selectedIds
          }
          onPanChange={setPan}
          onZoomChange={setZoom}
          onSelectTool={
            setSelectedTool
          }
          onSelectItems={
            setSelectedIds
          }
          onGroupSelected={
            handleGroupSelected
          }
          onAddItem={
            addItem
          }
          onUpdateItem={
            updateItem
          }
          onDeleteItem={
            deleteItem
          }
          onDeleteItems={
            deleteItems
          }
          onBringToFront={
            bringToFront
          }
          onDropOnColumn={
            handleDropOnColumn
          }
          onEjectFromColumn={
            handleEjectFromColumn
          }
          onRestoreItems={
            restoreItems
          }
        />
      </div>
    </div>
  );
}