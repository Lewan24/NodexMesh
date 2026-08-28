import type {
  BoardItem,
  ChecklistEntry,
  KanbanCard,
} from '@/entities/board/types';

import BlockRenderer from '@/features/blocks/BlockRenderer';
import ItemWatcher from '@/features/canvas/components/ItemWatcher';

import type { ResizeDirection } from '@/features/canvas/types';
import ResizeHandles from '@/features/canvas/components/ResizeHandles';

interface CanvasItemProps {
  item: BoardItem;
  renderedItem: BoardItem;
  zoom: number;

  isSelected: boolean;
  isAttachTarget: boolean;
  isDragOver: boolean;
  isAnimating: boolean;

  selectedIds: string[];
  selectedColumnItemId?: string | null;

  onMouseDown: (id: string, event: React.MouseEvent) => void;
  onAnimationEnd: (id: string) => void;
  onResize: (id: string, width: number, height: number) => void;

  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;

  onDeleteItem: (id: string) => void;
  onSelectItems: (ids: string[]) => void;

  onRequestDelete: (
    execute: () => void,
    count?: number,
  ) => void;

  onItemResize: (
    id: string,
    event: React.MouseEvent,
    direction: ResizeDirection,
  ) => void;

  onLineEndpointDrag: (
    id: string,
    event: React.MouseEvent,
    endpoint: 1 | 2,
  ) => void;

  onEjectFromColumn: (
    columnId: string,
    ejectedItem: BoardItem,
  ) => void;

  onSelectColumnItem: (
    columnId: string,
    item: BoardItem | null,
  ) => void;

  onChecklistDropOutside: (
    sourceId: string,
    entry: ChecklistEntry,
    clientX: number,
    clientY: number,
  ) => void;

  onKanbanCardDropOutside: (
    sourceId: string,
    card: KanbanCard,
    clientX: number,
    clientY: number,
  ) => void;

  pushHistory: () => void;
}

export default function CanvasItem({
  item,
  renderedItem,
  isSelected,
  isAttachTarget,
  isDragOver,
  isAnimating,
  selectedIds,
  selectedColumnItemId,
  onMouseDown,
  onAnimationEnd,
  onResize,
  onUpdateItem,
  onDeleteItem,
  onSelectItems,
  onRequestDelete,
  onItemResize,
  onLineEndpointDrag,
  onEjectFromColumn,
  onSelectColumnItem,
  onChecklistDropOutside,
  onKanbanCardDropOutside,
  pushHistory,
}: CanvasItemProps) {
  return (
    <div
      data-board-item="true"
      className={`absolute ${isAnimating ? 'board-item-enter' : ''}`}
      style={{
        left: renderedItem.x,
        top: renderedItem.y,
        zIndex: item.zIndex,
        cursor: 'grab',
      }}
      onMouseDown={event => onMouseDown(item.id, event)}
      onAnimationEnd={() => onAnimationEnd(item.id)}
    >
      {isSelected && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{
            inset: -4,
            boxShadow:
              '0 0 0 2px var(--color-accent), 0 0 12px rgba(124, 58, 237,0.25)',
          }}
        />
      )}

      {item.type !== 'line' && (
        <ResizeHandles
          visible={isSelected}
          onResizeStart={(event, direction) => onItemResize(item.id, event, direction)}
        />
      )}

      {isAttachTarget && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{
            inset: -6,
            boxShadow:
              '0 0 0 3px var(--color-accent), 0 0 18px rgba(124, 58, 237,0.35)',
          }}
        />
      )}

      <ItemWatcher
        itemId={item.id}
        onResize={onResize}
      >
        <BlockRenderer
          item={renderedItem}
          isSelected={isSelected}
          isDragOver={isDragOver}
          selectedColumnItemId={selectedColumnItemId}
          onUpdate={updater => onUpdateItem(item.id, updater)}
          onDelete={() =>
            onRequestDelete(() => {
              onDeleteItem(item.id);
              onSelectItems(selectedIds.filter(id => id !== item.id));
            })
          }
          onFitFrame={() => {}}
          onLineEndpointDrag={(event, endpoint) =>
            onLineEndpointDrag(item.id, event, endpoint)
          }
          onEjectItem={
            item.type === 'column'
              ? ejectedItem => {
                  pushHistory();
                  onEjectFromColumn(item.id, ejectedItem);
                }
              : undefined
          }
          onSelectColumnItem={
            item.type === 'column'
              ? columnItem => onSelectColumnItem(item.id, columnItem)
              : undefined
          }
          onRequestDelete={onRequestDelete}
          onEntryDroppedOutside={
            item.type === 'checklist'
              ? (entry, clientX, clientY) =>
                  onChecklistDropOutside(
                    item.id,
                    entry,
                    clientX,
                    clientY,
                  )
              : undefined
          }
          onCardDroppedOutside={
            item.type === 'kanban'
              ? (card, clientX, clientY) =>
                  onKanbanCardDropOutside(
                    item.id,
                    card,
                    clientX,
                    clientY,
                  )
              : undefined
          }
        />
      </ItemWatcher>
    </div>
  );
}