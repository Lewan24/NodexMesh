import { useCallback } from 'react';

import type { Dispatch, SetStateAction } from 'react';

import type { BoardItem } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';

interface UseProjectItemsOptions {
  activeProjectId: string;
  setProjects: Dispatch<SetStateAction<Project[]>>;
}

type LayerAction = 'forward' | 'backward' | 'front' | 'back';

function detachLines(items: BoardItem[], removedIds: string[]): BoardItem[] {
  const removed = new Set(removedIds);

  return items.map(item => {
    if (item.type !== 'line') return item;

    let nextItem = item;

    if (item.startItemId && removed.has(item.startItemId)) {
      nextItem = { ...nextItem, startItemId: undefined };
    }

    if (item.endItemId && removed.has(item.endItemId)) {
      nextItem = { ...nextItem, endItemId: undefined };
    }

    return nextItem;
  });
}

function getNextZIndex(items: BoardItem[]): number {
  return Math.max(0, ...items.map(item => item.zIndex)) + 1;
}

function normalizeLayers(items: BoardItem[]): BoardItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      if (a.item.zIndex !== b.item.zIndex) return a.item.zIndex - b.item.zIndex;
      return a.index - b.index;
    })
    .map(({ item }, index) => ({
      ...item,
      zIndex: index + 1,
    }));
}

function changeItemLayer(
  items: BoardItem[],
  id: string,
  action: LayerAction,
): BoardItem[] {
  const normalized = normalizeLayers(items);
  const currentIndex = normalized.findIndex(item => item.id === id);

  if (currentIndex === -1) return items;

  const next = [...normalized];

  if (action === 'forward') {
    if (currentIndex === next.length - 1) return normalized;

    [next[currentIndex], next[currentIndex + 1]] = [
      next[currentIndex + 1]!,
      next[currentIndex]!,
    ];
  }

  if (action === 'backward') {
    if (currentIndex === 0) return normalized;

    [next[currentIndex], next[currentIndex - 1]] = [
      next[currentIndex - 1]!,
      next[currentIndex]!,
    ];
  }

  if (action === 'front') {
    if (currentIndex === next.length - 1) return normalized;

    const [target] = next.splice(currentIndex, 1);
    if (target) next.push(target);
  }

  if (action === 'back') {
    if (currentIndex === 0) return normalized;

    const [target] = next.splice(currentIndex, 1);
    if (target) next.unshift(target);
  }

  return next.map((item, index) => ({
    ...item,
    zIndex: index + 1,
  }));
}

export function useProjectItems({
  activeProjectId,
  setProjects,
}: UseProjectItemsOptions) {
  const updateItems = useCallback(
    (update: (items: BoardItem[]) => BoardItem[]) => {
      setProjects(previous =>
        previous.map(project =>
          project.id === activeProjectId
            ? { ...project, items: update(project.items) }
            : project,
        ),
      );
    },
    [activeProjectId, setProjects],
  );

  const addItem = useCallback(
    (item: BoardItem) => {
      updateItems(items => [
        ...items,
        {
          ...item,
          zIndex: getNextZIndex(items),
        },
      ]);
    },
    [updateItems],
  );

  const updateItem = useCallback(
    (
      id: string,
      update: (item: BoardItem) => BoardItem,
    ) => {
      updateItems(items =>
        items.map(item =>
          item.id === id ? update(item) : item,
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
          items.filter(item => item.id !== id),
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
          items.filter(item => !removed.has(item.id)),
          ids,
        ),
      );
    },
    [updateItems],
  );

  const bringForward = useCallback(
    (id: string) => {
      updateItems(items =>
        changeItemLayer(items, id, 'forward'),
      );
    },
    [updateItems],
  );

  const sendBackward = useCallback(
    (id: string) => {
      updateItems(items =>
        changeItemLayer(items, id, 'backward'),
      );
    },
    [updateItems],
  );

  const bringToFront = useCallback(
    (id: string) => {
      updateItems(items =>
        changeItemLayer(items, id, 'front'),
      );
    },
    [updateItems],
  );

  const sendToBack = useCallback(
    (id: string) => {
      updateItems(items =>
        changeItemLayer(items, id, 'back'),
      );
    },
    [updateItems],
  );

  return {
    addItem,
    updateItem,
    restoreItems,
    deleteItem,
    deleteItems,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
  };
}