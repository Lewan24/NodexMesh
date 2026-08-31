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

  isSettling?: boolean;
  isDragging?: boolean;
  dragTilt?: number;

  isSelected: boolean;
  isAttachTarget: boolean;
  isDragOver: boolean;
  isAnimating: boolean;

  selectedIds: string[];
  selectedColumnItemId?: string | null;

  isFrameCapturePreview?: boolean;

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
    clientX?: number,
    clientY?: number,
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
  ) => boolean;

  onKanbanCardDropOutside: (
    sourceId: string,
    card: KanbanCard,
    clientX: number,
    clientY: number,
  ) => boolean;

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
  isFrameCapturePreview = false,
  isSettling = false,
  isDragging = false,
  dragTilt = 0,
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
  onKanbanCardDropOutside
}: CanvasItemProps) {
  return (
    <div
      data-board-item="true"
      className={`absolute ${
        isAnimating
          ? 'board-item-enter'
          : ''
      } ${
        isDragging
          ? 'board-item-dragging'
          : ''
      } ${
        isSettling
          ? 'board-item-settling'
          : ''
      }`}
      style={{
        left: renderedItem.x,
        top: renderedItem.y,
        zIndex: item.zIndex,
        cursor: 'grab',
        transform: isDragging
          ? `
              perspective(900px)
              rotateY(${dragTilt}deg)
              rotateZ(${dragTilt * 0.18}deg)
              translateZ(8px)
              scale(1.012)
            `
          : undefined,

        transformOrigin: 'center center',
      }}
      onMouseDown={event => onMouseDown(item.id, event)}
      onAnimationEnd={() => onAnimationEnd(item.id)}
    >
      {isSelected && (
        <div
          className="absolute pointer-events-none rounded-sm"
          style={{
            inset: -2,
            boxShadow:
              '0 0 0 2px var(--color-accent), 0 0 12px rgba(124, 58, 237,0.25)',
          }}
        />
      )}

      {isFrameCapturePreview && !isSelected && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{
            inset: -5,
            outline: '2px dashed var(--color-accent)',
            outlineOffset: 2,
            backgroundColor: 'rgba(124, 58, 237, 0.06)',
            boxShadow: '0 0 16px rgba(124, 58, 237, 0.2)',
            zIndex: 30,
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
              ? (
                  ejectedItem,
                  clientX,
                  clientY,
                ) =>
                  onEjectFromColumn(
                    item.id,
                    ejectedItem,
                    clientX,
                    clientY,
                  )
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
              ? (
                  entry,
                  clientX,
                  clientY,
                ) =>
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
              ? (
                  card,
                  clientX,
                  clientY,
                ) =>
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