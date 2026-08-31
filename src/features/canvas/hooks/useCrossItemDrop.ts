import {
  useCallback,
} from 'react';

import type {
  RefObject,
} from 'react';

import type {
  BoardItem,
  ChecklistEntry,
  ChecklistItem,
  KanbanCard,
  KanbanItem,
} from '@/entities/board/types';

import type {
  Project,
} from '@/entities/project/types';

interface UseCrossItemDropOptions {
  projectRef:
    RefObject<Project>;

  onUpdateItem: (
    id: string,
    updater: (
      item: BoardItem,
    ) => BoardItem,
  ) => void;
}

export function useCrossItemDrop({
  projectRef,
  onUpdateItem,
}: UseCrossItemDropOptions) {
  const handleChecklistDropOutside =
    useCallback(
      (
        sourceChecklistId: string,
        entry: ChecklistEntry,
        clientX: number,
        clientY: number,
      ): boolean => {
        const target =
          document.elementFromPoint(
            clientX,
            clientY,
          ) as HTMLElement | null;

        if (!target) {
          return false;
        }

        const checklistElement =
          target.closest<HTMLElement>(
            '[data-checklist-id]',
          );

        if (!checklistElement) {
          return false;
        }

        const targetChecklistId =
          checklistElement.dataset
            .checklistId;

        if (
          !targetChecklistId ||
          targetChecklistId ===
            sourceChecklistId
        ) {
          return false;
        }

        const targetChecklist =
          projectRef.current.items.find(
            item =>
              item.id ===
                targetChecklistId &&
              item.type ===
                'checklist',
          ) as
            | ChecklistItem
            | undefined;

        if (!targetChecklist) {
          return false;
        }

        /*
         * Obliczamy indeks dropu
         * na podstawie prawdziwych
         * elementów DOM.
         */
        const rowElements =
          Array.from(
            checklistElement.querySelectorAll<HTMLElement>(
              '[data-checklist-entry-index]',
            ),
          );

        let insertIndex =
          rowElements.length;

        for (
          let index = 0;
          index <
          rowElements.length;
          index++
        ) {
          const row =
            rowElements[index];

          if (!row) continue;

          const rect =
            row.getBoundingClientRect();

          if (
            clientY <
            rect.top +
              rect.height / 2
          ) {
            insertIndex =
              index;

            break;
          }
        }

        onUpdateItem(
          targetChecklistId,
          current => {
            if (
              current.type !==
              'checklist'
            ) {
              return current;
            }

            const entries = [
              ...current.entries,
            ];

            const safeIndex =
              Math.max(
                0,
                Math.min(
                  insertIndex,
                  entries.length,
                ),
              );

            entries.splice(
              safeIndex,
              0,
              entry,
            );

            return {
              ...current,
              entries,
            };
          },
        );

        return true;
      },
      [
        projectRef,
        onUpdateItem,
      ],
    );

  const handleKanbanCardDropOutside =
    useCallback(
      (
        sourceKanbanId: string,
        card: KanbanCard,
        clientX: number,
        clientY: number,
      ): boolean => {
        const target =
          document.elementFromPoint(
            clientX,
            clientY,
          ) as HTMLElement | null;

        if (!target) {
          return false;
        }

        /*
         * Najpierw próbujemy
         * dokładnej kolumny.
         */
        const columnElement =
          target.closest<HTMLElement>(
            '[data-kanban-column-id]',
          );

        /*
         * Jeśli jesteśmy np. nad
         * headerem Kanbana, znajdź
         * sam board.
         */
        const kanbanElement =
          target.closest<HTMLElement>(
            '[data-kanban-id]',
          );

        if (!kanbanElement) {
          return false;
        }

        const targetKanbanId =
          kanbanElement.dataset
            .kanbanId;

        if (
          !targetKanbanId ||
          targetKanbanId ===
            sourceKanbanId
        ) {
          return false;
        }

        const targetKanban =
          projectRef.current.items.find(
            item =>
              item.id ===
                targetKanbanId &&
              item.type ===
                'kanban',
          ) as
            | KanbanItem
            | undefined;

        if (
          !targetKanban ||
          targetKanban.columns.length ===
            0
        ) {
          return false;
        }

        const requestedColumnId =
          columnElement?.dataset
            .kanbanColumnId;

        const targetColumn =
          targetKanban.columns.find(
            column =>
              column.id ===
              requestedColumnId,
          ) ??
          targetKanban.columns[0];

        if (!targetColumn) {
          return false;
        }

        /*
         * Ustal pozycję karty
         * w docelowej kolumnie.
         */
        const targetColumnElement =
          columnElement &&
          columnElement.dataset
            .kanbanId ===
            targetKanbanId
            ? columnElement
            : kanbanElement.querySelector<HTMLElement>(
                `[data-kanban-column-id="${targetColumn.id}"]`,
              );

        let insertIndex =
          targetColumn.cards.length;

        if (targetColumnElement) {
          const cardElements =
            Array.from(
              targetColumnElement.querySelectorAll<HTMLElement>(
                '[data-kanban-card-id]',
              ),
            );

          insertIndex =
            cardElements.length;

          for (
            let index = 0;
            index <
            cardElements.length;
            index++
          ) {
            const element =
              cardElements[index];

            if (!element) {
              continue;
            }

            const rect =
              element.getBoundingClientRect();

            if (
              clientY <
              rect.top +
                rect.height / 2
            ) {
              insertIndex =
                index;

              break;
            }
          }
        }

        onUpdateItem(
          targetKanbanId,
          current => {
            if (
              current.type !==
              'kanban'
            ) {
              return current;
            }

            return {
              ...current,

              columns:
                current.columns.map(
                  column => {
                    if (
                      column.id !==
                      targetColumn.id
                    ) {
                      return column;
                    }

                    const cards = [
                      ...column.cards,
                    ];

                    const safeIndex =
                      Math.max(
                        0,
                        Math.min(
                          insertIndex,
                          cards.length,
                        ),
                      );

                    cards.splice(
                      safeIndex,
                      0,
                      card,
                    );

                    return {
                      ...column,
                      cards,
                    };
                  },
                ),
            };
          },
        );

        return true;
      },
      [
        projectRef,
        onUpdateItem,
      ],
    );

  return {
    handleChecklistDropOutside,
    handleKanbanCardDropOutside,
  };
}