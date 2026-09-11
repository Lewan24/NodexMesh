import { useEffect } from 'react';

import type { RefObject } from 'react';

import type { ToolType } from '@/entities/board/toolTypes';

interface UseCanvasKeyboardOptions {
  selectedIdsRef: RefObject<string[]>;
  onSelectItems: (ids: string[]) => void;
  onSelectTool: (tool: ToolType) => void;
  onDeleteItems: (ids: string[]) => void;

  requestDelete: (
    execute: () => void,
    count?: number,
  ) => void;

  clearColumnSelection: () => void;
  undo: () => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;
  deleteNested?: () => void;
}

export function useCanvasKeyboard({
  selectedIdsRef,
  onSelectItems,
  onSelectTool,
  onDeleteItems,
  requestDelete,
  clearColumnSelection,
  undo,
  copy,
  paste,
  duplicate,
  deleteNested,
}: UseCanvasKeyboardOptions) {
  useEffect(() => {
    const handleUndoCapture = (event: KeyboardEvent) => {
      const textField = event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.matches('textarea,input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=button]):not([type=number]):not([type=date]):not([type=time]):not([type=datetime-local])'));
      const modal = event.target instanceof Element ? event.target.closest('[role="dialog"], [role="menu"]') : null;
      if (!event.defaultPrevented && !textField && (!modal || modal.hasAttribute('data-board-history')) && (event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === 'z') {
        event.preventDefault(); event.stopPropagation(); undo(); return;
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('[role="dialog"], [role="menu"]'))) return;
      const inField =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target instanceof HTMLElement && event.target.isContentEditable);

      if (!inField && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
        const action = { c: copy, v: paste, d: duplicate }[event.key.toLowerCase()];
        if (action) { event.preventDefault(); action(); return; }
      }

      if (event.key === 'Escape') {
        onSelectItems([]);
        onSelectTool('select');
        clearColumnSelection();
      }

      const deletePressed =
        event.key === 'Delete' ||
        event.key === 'Backspace';

      if (deletePressed && !inField) {
        event.preventDefault();
        if (deleteNested) { deleteNested(); return; }
        const ids = selectedIdsRef.current;

        if (ids && ids.length > 0) {
          requestDelete(
            () => {
              onDeleteItems(ids);
              onSelectItems([]);
            },
            ids.length,
          );
        }
      }

      const undoPressed =
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'z';

      if (undoPressed && !inField) {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener('keydown', handleUndoCapture, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleUndoCapture, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedIdsRef,
    onSelectItems,
    onSelectTool,
    onDeleteItems,
    requestDelete,
    clearColumnSelection,
    undo,
    copy,
    paste,
    duplicate,
    deleteNested,
  ]);
}
