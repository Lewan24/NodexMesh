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

interface UseChecklistDragOptions {
  entries:
    ChecklistEntry[];

  cardRef:
    RefObject<HTMLDivElement | null>;

  rowRefs:
    RefObject<
      Map<
        number,
        HTMLDivElement
      >
    >;

  updateEntries: (
    updater: (
      entries:
        ChecklistEntry[],
    ) => ChecklistEntry[],
  ) => void;

  onEntryDroppedOutside?: (
    entry:
      ChecklistEntry,

    clientX:
      number,

    clientY:
      number,
  ) => void;
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
    useRef(
      entries,
    );

  entriesRef.current =
    entries;

  const handleDragStart =
    useCallback(
      (
        fromIndex:
          number,

        event:
          React.MouseEvent,
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

        if (!card) {
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
              entriesRef.current
                .length;
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
          moveEvent:
            MouseEvent,
        ) => {
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

          if (!inside) {
            dropIndexRef.current =
              null;

            setDropIndex(
              null,
            );

            return;
          }

          const centers =
            getCenters();

          let targetIndex =
            fromIndex;

          for (
            let index = 0;
            index <
            centers.length;
            index++
          ) {
            if (
              moveEvent.clientY >
              centers[index]!
            ) {
              targetIndex =
                index;
            }
          }

          dropIndexRef.current =
            targetIndex;

          setDropIndex(
            targetIndex,
          );
        };

        const handleUp = (
          upEvent:
            MouseEvent,
        ) => {
          document.removeEventListener(
            'mousemove',
            handleMove,
          );

          document.removeEventListener(
            'mouseup',
            handleUp,
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

          const entry =
            entriesRef.current[
              fromIndex
            ];

          if (!inside) {
            /*
             * Jeśli parent nie obsługuje cross-checklist
             * drop, nie usuwamy wpisu.
             */
            if (
              entry &&
              onEntryDroppedOutside
            ) {
              updateEntries(
                currentEntries =>
                  currentEntries.filter(
                    candidate =>
                      candidate.id !==
                      entry.id,
                  ),
              );

              onEntryDroppedOutside(
                entry,
                upEvent.clientX,
                upEvent.clientY,
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

                  const [moved] =
                    next.splice(
                      fromIndex,
                      1,
                    );

                  if (!moved) {
                    return currentEntries;
                  }

                  next.splice(
                    finalDropIndex,
                    0,
                    moved,
                  );

                  return next;
                },
              );
            }
          }

          setDraggingIndex(
            null,
          );

          setDropIndex(
            null,
          );

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