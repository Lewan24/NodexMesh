import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { BoardItem } from '@/entities/board/types';
import { CANVAS_HISTORY_LIMIT } from '@/features/canvas/constants';
import { ItemHistory } from '../utils/itemHistory';

interface UseCanvasHistoryOptions {
  getItems: () => BoardItem[];
  restoreItems: (items: BoardItem[]) => void;
  projectId: string;
  limit?: number;
}

export function useCanvasHistory({
  getItems,
  restoreItems,
  projectId,
  limit = CANVAS_HISTORY_LIMIT,
}: UseCanvasHistoryOptions) {
  const state = useRef<{ id: string; history: ItemHistory } | null>(null);
  if (!state.current || state.current.id !== projectId)
    state.current = { id: projectId, history: new ItemHistory(getItems(), limit) };
  const history = state.current.history;
  // Covers every persisted block mutation, including nested blocks and portal editors.
  useLayoutEffect(() => {
    history.observe(getItems());
  });
  const pushHistory = useCallback(() => {
    history.observe(getItems());
    history.boundary();
  }, [history, getItems]);
  const undo = useCallback(() => {
    const previous = history.undo(getItems());
    if (previous) restoreItems(previous);
  }, [history, getItems, restoreItems]);
  const clearHistory = useCallback(() => history.clear(getItems()), [history, getItems]);
  useEffect(() => {
    let typingTarget: EventTarget | null = null;
    let lastKey = 0;
    const boundary = () => {
      typingTarget = null;
      pushHistory();
    };
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') return;
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.matches('textarea,input:not([type=checkbox]):not([type=range]):not([type=color])'));
      const now = Date.now();
      if (!typing || target !== typingTarget || now - lastKey > 1000 || event.key === 'Enter') pushHistory();
      typingTarget = typing ? target : null;
      lastKey = now;
    };
    window.addEventListener('pointerdown', boundary, true);
    window.addEventListener('keydown', key, true);
    return () => {
      window.removeEventListener('pointerdown', boundary, true);
      window.removeEventListener('keydown', key, true);
    };
  }, [pushHistory]);
  return { pushHistory, undo, clearHistory };
}
