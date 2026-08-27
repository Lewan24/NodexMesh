import type {
  BoardItem,
} from '@/entities/board/types';

import EditBar from '@/layout/EditBar';

import type {
  SelectedColumnItem,
} from '@/features/canvas/hooks/useColumnSelection';

interface CanvasEditBarProps {
  selectedItems: BoardItem[];

  selectedColumnItem:
    SelectedColumnItem | null;

  onUpdateItem: (
    id: string,
    updater: (
      item: BoardItem,
    ) => BoardItem,
  ) => void;

  onDeleteItems: (
    ids: string[],
  ) => void;

  onSelectItems: (
    ids: string[],
  ) => void;

  onGroupSelected:
    () => void;

  onFitFrame: (
    frameId: string,
  ) => void;

  onUpdateColumnItem: (
    columnId: string,
    updater: (
      item: BoardItem,
    ) => BoardItem,
  ) => void;

  deleteSelectedColumnItem:
    () => void;

  clearColumnSelection:
    () => void;

  pushHistory:
    () => void;

  requestDelete: (
    execute: () => void,
    count?: number,
  ) => void;
}

export default function CanvasEditBar({
  selectedItems,
  selectedColumnItem,

  onUpdateItem,
  onDeleteItems,
  onSelectItems,

  onGroupSelected,
  onFitFrame,

  onUpdateColumnItem,

  deleteSelectedColumnItem,
  clearColumnSelection,

  pushHistory,
  requestDelete,
}: CanvasEditBarProps) {
  const hasSelection =
    selectedItems.length > 0 ||
    selectedColumnItem !== null;

  if (!hasSelection) {
    return null;
  }

  return (
    <EditBar
      selectedItems={
        selectedItems
      }

      onUpdateItem={
        onUpdateItem
      }

      onDeleteItems={
        ids =>
          requestDelete(
            () => {
              onDeleteItems(ids);
              onSelectItems([]);
            },
            ids.length,
          )
      }

      onGroupItems={() => {
        pushHistory();
        onGroupSelected();
      }}

      onFitFrame={
        onFitFrame
      }

      onClose={() => {
        onSelectItems([]);
        clearColumnSelection();
      }}

      columnItem={
        selectedColumnItem
          ?.item
      }

      onUpdateColumnItem={
        selectedColumnItem
          ? updater =>
              onUpdateColumnItem(
                selectedColumnItem.columnId,
                updater,
              )
          : undefined
      }

      onDeleteColumnItem={
        selectedColumnItem
          ? () =>
              requestDelete(
                deleteSelectedColumnItem,
              )
          : undefined
      }
    />
  );
}