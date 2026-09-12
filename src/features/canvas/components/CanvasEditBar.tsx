import type { ReactNode } from 'react';
import type { BoardItem } from '@/entities/board/types';

import { lazy, Suspense } from 'react';
const EditBar = lazy(() => import('@/features/blocks/editbar/EditBar'));

import type { SelectedColumnItem } from '@/features/canvas/hooks/useColumnSelection';

interface CanvasEditBarProps {
  selectedItems: BoardItem[];
  frameControls?: ReactNode;
  onJoinDrawings?: () => void;
  selectedColumnItem: SelectedColumnItem | null;

  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;

  onDeleteItems: (ids: string[]) => void;
  onSelectItems: (ids: string[]) => void;
  onGroupSelected: () => void;
  onFitFrame: (frameId: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;

  onUpdateColumnItem: (columnId: string, updater: (item: BoardItem) => BoardItem) => void;

  deleteSelectedColumnItem: () => void;
  clearColumnSelection: () => void;
  pushHistory: () => void;

  requestDelete: (execute: () => void, count?: number) => void;
}

export default function CanvasEditBar({
  selectedItems,
  frameControls,
  onJoinDrawings,
  selectedColumnItem,
  onUpdateItem,
  onDeleteItems,
  onSelectItems,
  onGroupSelected,
  onFitFrame,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onUpdateColumnItem,
  deleteSelectedColumnItem,
  clearColumnSelection,
  pushHistory,
  requestDelete,
}: CanvasEditBarProps) {
  const hasSelection = selectedItems.length > 0 || selectedColumnItem !== null;

  if (!hasSelection) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <EditBar
        selectedItems={selectedItems}
        frameControls={selectedColumnItem ? undefined : frameControls}
        onJoinDrawings={onJoinDrawings}
        onUpdateItem={onUpdateItem}
        onDeleteItems={(ids) =>
          requestDelete(() => {
            onDeleteItems(ids);
            onSelectItems([]);
          }, ids.length)
        }
        onBringForward={onBringForward}
        onSendBackward={onSendBackward}
        onBringToFront={onBringToFront}
        onSendToBack={onSendToBack}
        onGroupItems={() => {
          pushHistory();
          onGroupSelected();
        }}
        onFitFrame={onFitFrame}
        onClose={() => {
          onSelectItems([]);
          clearColumnSelection();
        }}
        columnItem={selectedColumnItem?.item}
        onUpdateColumnItem={
          selectedColumnItem ? (updater) => onUpdateColumnItem(selectedColumnItem.columnId, updater) : undefined
        }
        onDeleteColumnItem={selectedColumnItem ? () => requestDelete(deleteSelectedColumnItem) : undefined}
      />
    </Suspense>
  );
}
