import { useEffect } from 'react';

import type { RefObject } from 'react';

import type { ToolType } from '@/entities/board/toolTypes';

interface UseCanvasKeyboardOptions {
  selectedIdsRef: RefObject<string[]>;

  onSelectItems: (
    ids: string[],
  ) => void;

  onSelectTool: (
    tool: ToolType,
  ) => void;

  onDeleteItems: (
    ids: string[],
  ) => void;

  requestDelete: (
    execute: () => void,
    count?: number,
  ) => void;

  clearColumnSelection: () => void;

  undo: () => void;
}

export function useCanvasKeyboard({
  selectedIdsRef,
  onSelectItems,
  onSelectTool,
  onDeleteItems,
  requestDelete,
  clearColumnSelection,
  undo,
}: UseCanvasKeyboardOptions) {
  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      const inField =
        event.target instanceof
          HTMLInputElement ||
        event.target instanceof
          HTMLTextAreaElement;

      if (
        event.key ===
        'Escape'
      ) {
        onSelectItems([]);
        onSelectTool('select');
        clearColumnSelection();
      }

      const deletePressed =
        event.key ===
          'Delete' ||
        event.key ===
          'Backspace';

      if (
        deletePressed &&
        !inField
      ) {
        const ids =
          selectedIdsRef.current;

        if (
          ids &&
          ids.length > 0
        ) {
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
        (
          event.metaKey ||
          event.ctrlKey
        ) &&
        !event.shiftKey &&
        event.key
          .toLowerCase() ===
          'z';

      if (
        undoPressed &&
        !inField
      ) {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [
    selectedIdsRef,
    onSelectItems,
    onSelectTool,
    onDeleteItems,
    requestDelete,
    clearColumnSelection,
    undo,
  ]);
}