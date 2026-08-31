import {
  useCallback,
  useRef,
  useState,
} from 'react';

import type {
  RefObject,
} from 'react';

import type {
  ChecklistEntry,
} from '@/entities/board/types';

import {
  emitNestedDragEnd,
  emitNestedDragMove,
} from '@/features/canvas/utils/nestedDrag';

interface UseChecklistDragOptions {
  entries: ChecklistEntry[];

  cardRef:
    RefObject<HTMLDivElement | null>;

  rowRefs:
    RefObject<
      Map<number, HTMLDivElement>
    >;

  updateEntries: (
    updater: (
      entries: ChecklistEntry[],
    ) => ChecklistEntry[],
  ) => void;

  onEntryDroppedOutside?: (
    entry: ChecklistEntry,
    clientX: number,
    clientY: number,
  ) => boolean;
}

export function useChecklistDrag({
  entries,
  cardRef,
  rowRefs,
  updateEntries,
  onEntryDroppedOutside,
}: UseChecklistDragOptions) {
  const [
    draggingIndex,
    setDraggingIndex,
  ] =
    useState<number | null>(
      null,
    );

  const [
    dropIndex,
    setDropIndex,
  ] =
    useState<number | null>(
      null,
    );

  const dropIndexRef =
    useRef<number | null>(
      null,
    );

  const entriesRef =
    useRef(entries);

  entriesRef.current =
    entries;

  const handleDragStart =
    useCallback(
      (
        fromIndex: number,
        event: React.MouseEvent,
      ) => {
        if (
          event.button !== 0
        ) {
          return;
        }

        event.stopPropagation();
        event.preventDefault();

        const card =
          cardRef.current;

        if (!card) return;

        /*
         * WAŻNE:
         * bierzemy element z fromIndex,
         * nie z draggingIndex.
         */
        const draggedEntry =
          entriesRef.current[
            fromIndex
          ];

        if (!draggedEntry) {
          return;
        }

        setDraggingIndex(
          fromIndex,
        );

        setDropIndex(
          fromIndex,
        );

        dropIndexRef.current =
          fromIndex;

        const getCenters =
          () => {
            const centers:
              number[] = [];

            for (
              let index = 0;
              index <
              entriesRef.current.length;
              index++
            ) {
              const element =
                rowRefs.current.get(
                  index,
                );

              if (!element) {
                centers.push(0);
                continue;
              }

              const rect =
                element.getBoundingClientRect();

              centers.push(
                rect.top +
                  rect.height / 2,
              );
            }

            return centers;
          };

        const handleMove = (
          moveEvent: MouseEvent,
        ) => {
          emitNestedDragMove(
            {
              kind:
                'checklist-entry',

              entry:
                draggedEntry,
            },
            moveEvent.clientX,
            moveEvent.clientY,
          );

          const rect =
            card.getBoundingClientRect();

          const inside =
            moveEvent.clientX >=
              rect.left - 24 &&
            moveEvent.clientX <=
              rect.right + 24 &&
            moveEvent.clientY >=
              rect.top - 24 &&
            moveEvent.clientY <=
              rect.bottom + 24;

          /*
           * Poza własną checklistą:
           * nie robimy lokalnego reorder.
           */
          if (!inside) {
            dropIndexRef.current =
              null;

            setDropIndex(null);

            return;
          }

          const centers =
            getCenters();

          let targetIndex =
            entriesRef.current.length;

          for (
            let index = 0;
            index <
            centers.length;
            index++
          ) {
            if (
              moveEvent.clientY <
              centers[index]!
            ) {
              targetIndex =
                index;
              break;
            }
          }

          dropIndexRef.current =
            targetIndex;

          setDropIndex(
            targetIndex,
          );
        };

        const handleUp = (
          upEvent: MouseEvent,
        ) => {
          document.removeEventListener(
            'mousemove',
            handleMove,
          );

          document.removeEventListener(
            'mouseup',
            handleUp,
          );

          emitNestedDragEnd(
            {
              kind:
                'checklist-entry',

              entry:
                draggedEntry,
            },
            upEvent.clientX,
            upEvent.clientY,
          );

          const rect =
            card.getBoundingClientRect();

          const inside =
            upEvent.clientX >=
              rect.left - 24 &&
            upEvent.clientX <=
              rect.right + 24 &&
            upEvent.clientY >=
              rect.top - 24 &&
            upEvent.clientY <=
              rect.bottom + 24;

          if (!inside) {
            /*
             * Canvas zwraca true tylko wtedy,
             * gdy faktycznie przyjął element
             * do innej checklisty.
             */
            const accepted =
              onEntryDroppedOutside?.(
                draggedEntry,
                upEvent.clientX,
                upEvent.clientY,
              ) ?? false;

            /*
             * Dopiero PO potwierdzeniu
             * usuwamy źródło.
             */
            if (accepted) {
              updateEntries(
                currentEntries =>
                  currentEntries.filter(
                    entry =>
                      entry.id !==
                      draggedEntry.id,
                  ),
              );
            }
          } else {
            const finalDropIndex =
              dropIndexRef.current;

            if (
              finalDropIndex !==
                null &&
              finalDropIndex !==
                fromIndex
            ) {
              updateEntries(
                currentEntries => {
                  const next = [
                    ...currentEntries,
                  ];

                  const sourceIndex =
                    next.findIndex(
                      entry =>
                        entry.id ===
                        draggedEntry.id,
                    );

                  if (
                    sourceIndex ===
                    -1
                  ) {
                    return currentEntries;
                  }

                  const [moved] =
                    next.splice(
                      sourceIndex,
                      1,
                    );

                  if (!moved) {
                    return currentEntries;
                  }

                  /*
                   * Po usunięciu elementu
                   * indeks docelowy może
                   * przesunąć się o 1.
                   */
                  let insertIndex =
                    finalDropIndex;

                  if (
                    sourceIndex <
                    finalDropIndex
                  ) {
                    insertIndex -= 1;
                  }

                  insertIndex =
                    Math.max(
                      0,
                      Math.min(
                        insertIndex,
                        next.length,
                      ),
                    );

                  next.splice(
                    insertIndex,
                    0,
                    moved,
                  );

                  return next;
                },
              );
            }
          }

          setDraggingIndex(null);
          setDropIndex(null);
          dropIndexRef.current =
            null;
        };

        document.addEventListener(
          'mousemove',
          handleMove,
        );

        document.addEventListener(
          'mouseup',
          handleUp,
        );
      },
      [
        cardRef,
        rowRefs,
        updateEntries,
        onEntryDroppedOutside,
      ],
    );

  return {
    draggingIndex,
    dropIndex,
    handleDragStart,
  };
}