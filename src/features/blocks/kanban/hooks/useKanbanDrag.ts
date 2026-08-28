import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';

import type { KanbanCard, KanbanColumn } from '@/entities/board/types';

interface DropTarget {
  columnId: string;
  index: number;
}

interface UseKanbanDragOptions {
  columns: KanbanColumn[];
  boardRef: RefObject<HTMLDivElement | null>;
  columnRefs: RefObject<Map<string, HTMLDivElement>>;
  cardRowRefs: RefObject<Map<string, HTMLDivElement>>;
  updateColumns: (updater: (columns: KanbanColumn[]) => KanbanColumn[]) => void;
  onCardDroppedOutside?: (
    card: KanbanCard,
    clientX: number,
    clientY: number,
  ) => void;
}

export function useKanbanDrag({
  columns,
  boardRef,
  columnRefs,
  cardRowRefs,
  updateColumns,
  onCardDroppedOutside,
}: UseKanbanDragOptions) {
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const dropTargetRef = useRef<DropTarget | null>(null);
  const columnsRef = useRef(columns);

  columnsRef.current = columns;

  const getColumnUnderCursor = useCallback(
    (clientX: number, fallbackColumnId: string) => {
      for (const [columnId, element] of columnRefs.current) {
        const rect = element.getBoundingClientRect();

        if (clientX >= rect.left && clientX <= rect.right) {
          return columnId;
        }
      }

      return fallbackColumnId;
    },
    [columnRefs],
  );

  const getDropIndex = useCallback(
    (columnId: string, clientY: number) => {
      const column = columnsRef.current.find(candidate => candidate.id === columnId);

      if (!column) return 0;

      for (let index = 0; index < column.cards.length; index++) {
        const card = column.cards[index];
        if (!card) continue;

        const element = cardRowRefs.current.get(card.id);
        if (!element) continue;

        const rect = element.getBoundingClientRect();

        if (clientY < rect.top + rect.height / 2) {
          return index;
        }
      }

      return column.cards.length;
    },
    [cardRowRefs],
  );

  const handleCardDragStart = useCallback(
    (sourceColumnId: string, cardId: string, event: React.MouseEvent) => {
      if (event.button !== 0) return;

      event.stopPropagation();
      event.preventDefault();

      const board = boardRef.current;
      if (!board) return;

      setDraggingCardId(cardId);

      const initialTarget = {
        columnId: sourceColumnId,
        index: getDropIndex(sourceColumnId, event.clientY),
      };

      setDropTarget(initialTarget);
      dropTargetRef.current = initialTarget;

      const handleMove = (moveEvent: MouseEvent) => {
        const rect = board.getBoundingClientRect();

        const inside =
          moveEvent.clientX >= rect.left - 24 &&
          moveEvent.clientX <= rect.right + 24 &&
          moveEvent.clientY >= rect.top - 24 &&
          moveEvent.clientY <= rect.bottom + 24;

        if (!inside) {
          dropTargetRef.current = null;
          setDropTarget(null);
          return;
        }

        const columnId = getColumnUnderCursor(moveEvent.clientX, sourceColumnId);
        const index = getDropIndex(columnId, moveEvent.clientY);

        const nextTarget = { columnId, index };

        dropTargetRef.current = nextTarget;
        setDropTarget(nextTarget);
      };

      const handleUp = (upEvent: MouseEvent) => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);

        const rect = board.getBoundingClientRect();

        const inside =
          upEvent.clientX >= rect.left - 24 &&
          upEvent.clientX <= rect.right + 24 &&
          upEvent.clientY >= rect.top - 24 &&
          upEvent.clientY <= rect.bottom + 24;

        const sourceColumn = columnsRef.current.find(
          column => column.id === sourceColumnId,
        );

        const card = sourceColumn?.cards.find(candidate => candidate.id === cardId);

        if (!inside) {
          if (card && onCardDroppedOutside) {
            updateColumns(currentColumns =>
              currentColumns.map(column =>
                column.id === sourceColumnId
                  ? {
                      ...column,
                      cards: column.cards.filter(currentCard => currentCard.id !== cardId),
                    }
                  : column,
              ),
            );

            onCardDroppedOutside(card, upEvent.clientX, upEvent.clientY);
          }
        } else {
          const target = dropTargetRef.current;

          if (card && target) {
            updateColumns(currentColumns => {
              let removedCard: KanbanCard | undefined;

              let nextColumns = currentColumns.map(column => {
                if (column.id !== sourceColumnId) return column;

                const index = column.cards.findIndex(
                  currentCard => currentCard.id === cardId,
                );

                if (index === -1) return column;

                const cards = [...column.cards];
                removedCard = cards.splice(index, 1)[0];

                return {
                  ...column,
                  cards,
                };
              });

              if (!removedCard) return currentColumns;

              nextColumns = nextColumns.map(column => {
                if (column.id !== target.columnId) return column;

                const cards = [...column.cards];

                const safeIndex = Math.max(
                  0,
                  Math.min(target.index, cards.length),
                );

                cards.splice(safeIndex, 0, removedCard!);

                return {
                  ...column,
                  cards,
                };
              });

              return nextColumns;
            });
          }
        }

        setDraggingCardId(null);
        setDropTarget(null);
        dropTargetRef.current = null;
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      boardRef,
      getColumnUnderCursor,
      getDropIndex,
      updateColumns,
      onCardDroppedOutside,
    ],
  );

  return {
    draggingCardId,
    dropTarget,
    handleCardDragStart,
  };
}