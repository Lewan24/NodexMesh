import { useCallback, useRef } from 'react';

import type { BoardItem } from '@/entities/board/types';

import { CANVAS_HISTORY_LIMIT } from '@/features/canvas/constants';

interface UseCanvasHistoryOptions {
  getItems: () => BoardItem[];
  restoreItems: (items: BoardItem[]) => void;
  limit?: number;
}

export function useCanvasHistory({
  getItems,
  restoreItems,
  limit = CANVAS_HISTORY_LIMIT,
}: UseCanvasHistoryOptions) {
  const historyRef = useRef<BoardItem[][]>([]);

  const pushHistory = useCallback(() => {
    const snapshot = getItems();

    historyRef.current.push(snapshot);

    if (historyRef.current.length > limit) {
      historyRef.current.shift();
    }
  }, [getItems, limit]);

  const undo = useCallback(() => {
    const previous = historyRef.current.pop();

    if (!previous) {
      return;
    }

    restoreItems(previous);
  }, [restoreItems]);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  return {
    pushHistory,
    undo,
    clearHistory,
  };
}