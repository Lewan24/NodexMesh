import { useCallback, useRef, useState } from 'react';

import type { BoardItem } from '@/entities/board/types';

export interface SelectedColumnItem {
  columnId: string;
  item: BoardItem;
}

interface UseColumnSelectionOptions {
  items?: BoardItem[];
  onSelectItems: (ids: string[]) => void;

  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
}

export function useColumnSelection({ items, onSelectItems, onUpdateItem }: UseColumnSelectionOptions) {
  const [selectedColumnItem, setSelectedColumnItem] = useState<SelectedColumnItem | null>(null);

  const selectedColumnItemRef = useRef<SelectedColumnItem | null>(null);

  const column = selectedColumnItem && items?.find((item) => item.id === selectedColumnItem.columnId);
  const latestItem =
    column?.type === 'column' ? column.items.find((item) => item.id === selectedColumnItem?.item.id) : undefined;
  const currentSelection =
    items && selectedColumnItem
      ? latestItem
        ? { ...selectedColumnItem, item: latestItem }
        : null
      : selectedColumnItem;
  selectedColumnItemRef.current = currentSelection;

  const clearColumnSelection = useCallback(() => {
    setSelectedColumnItem(null);
  }, []);

  const handleSelectColumnItem = useCallback(
    (columnId: string, item: BoardItem | null) => {
      if (!item) {
        setSelectedColumnItem(null);

        return;
      }

      setSelectedColumnItem({ columnId, item });

      onSelectItems([]);
    },
    [onSelectItems],
  );

  const handleUpdateColumnItem = useCallback(
    (columnId: string, updater: (item: BoardItem) => BoardItem) => {
      const current = selectedColumnItemRef.current;

      if (!current || current.columnId !== columnId) {
        return;
      }

      const itemId = current.item.id;

      setSelectedColumnItem((previous) => (previous ? { ...previous, item: updater(previous.item) } : null));

      onUpdateItem(columnId, (column) => {
        if (column.type !== 'column') {
          return column;
        }

        return { ...column, items: column.items.map((item) => (item.id === itemId ? updater(item) : item)) };
      });
    },
    [onUpdateItem],
  );

  const deleteSelectedColumnItem = useCallback(() => {
    const current = selectedColumnItemRef.current;

    if (!current) {
      return;
    }

    onUpdateItem(current.columnId, (column) => {
      if (column.type !== 'column') {
        return column;
      }

      return { ...column, items: column.items.filter((item) => item.id !== current.item.id) };
    });

    setSelectedColumnItem(null);
  }, [onUpdateItem]);

  return {
    selectedColumnItem: currentSelection,
    clearColumnSelection,
    handleSelectColumnItem,
    handleUpdateColumnItem,
    deleteSelectedColumnItem,
  };
}
