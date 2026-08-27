import {
  useCallback,
  useRef,
} from 'react';

import type { Dispatch, SetStateAction } from 'react';

import type { BoardItem } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';

interface UseProjectItemsOptions {
  activeProjectId: string;
  setProjects: Dispatch<SetStateAction<Project[]>>;
}

function detachLines(
  items: BoardItem[],
  removedIds: string[],
): BoardItem[] {
  const removed = new Set(removedIds);

  return items.map(item => {
    if (item.type !== 'line') {
      return item;
    }

    let nextItem = item;

    if (
      item.startItemId &&
      removed.has(item.startItemId)
    ) {
      nextItem = {
        ...nextItem,
        startItemId: undefined,
      };
    }

    if (
      item.endItemId &&
      removed.has(item.endItemId)
    ) {
      nextItem = {
        ...nextItem,
        endItemId: undefined,
      };
    }

    return nextItem;
  });
}

export function useProjectItems({
  activeProjectId,
  setProjects,
}: UseProjectItemsOptions) {
  const maxZRef = useRef(30);

  const getNextZIndex = useCallback(() => {
    maxZRef.current += 1;
    return maxZRef.current;
  }, []);

  const updateItems = useCallback(
    (
      update: (
        items: BoardItem[],
      ) => BoardItem[],
    ) => {
      setProjects(previous =>
        previous.map(project =>
          project.id === activeProjectId
            ? {
                ...project,
                items: update(project.items),
              }
            : project,
        ),
      );
    },
    [activeProjectId, setProjects],
  );

  const addItem = useCallback(
    (item: BoardItem) => {
      const zIndex =
        item.type === 'frame'
          ? 0
          : getNextZIndex();

      updateItems(items => [
        ...items,
        {
          ...item,
          zIndex,
        },
      ]);
    },
    [updateItems, getNextZIndex],
  );

  const updateItem = useCallback(
    (
      id: string,
      update: (
        item: BoardItem,
      ) => BoardItem,
    ) => {
      updateItems(items =>
        items.map(item =>
          item.id === id
            ? update(item)
            : item,
        ),
      );
    },
    [updateItems],
  );

  const restoreItems = useCallback(
    (items: BoardItem[]) => {
      updateItems(() => items);
    },
    [updateItems],
  );

  const deleteItem = useCallback(
    (id: string) => {
      updateItems(items =>
        detachLines(
          items.filter(
            item => item.id !== id,
          ),
          [id],
        ),
      );
    },
    [updateItems],
  );

  const deleteItems = useCallback(
    (ids: string[]) => {
      const removed = new Set(ids);

      updateItems(items =>
        detachLines(
          items.filter(
            item => !removed.has(item.id),
          ),
          ids,
        ),
      );
    },
    [updateItems],
  );

  const bringToFront = useCallback(
    (id: string) => {
      setProjects(previous =>
        previous.map(project => {
          if (project.id !== activeProjectId) {
            return project;
          }

          const target = project.items.find(
            item => item.id === id,
          );

          if (!target || target.type === 'frame') {
            return project;
          }

          const zIndex = getNextZIndex();

          return {
            ...project,
            items: project.items.map(item =>
              item.id === id
                ? {
                    ...item,
                    zIndex,
                  }
                : item,
            ),
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

  return {
    addItem,
    updateItem,
    restoreItems,
    deleteItem,
    deleteItems,
    bringToFront,
    getNextZIndex,
  };
}