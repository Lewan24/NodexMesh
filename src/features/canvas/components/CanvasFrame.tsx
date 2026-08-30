import type { BoardItem, FrameItem } from '@/entities/board/types';

import BlockRenderer from '@/features/blocks/BlockRenderer';
import type { ResizeDirection } from '@/features/canvas/types';
import ResizeHandles from '@/features/canvas/components/ResizeHandles';

interface CanvasFrameProps {
  item: FrameItem;
  zoom: number;
  isSelected: boolean;
  isAnimating: boolean;
  selectedIds: string[];
  isSettling?: boolean;
  isDragging?: boolean;

  onMouseDown: (id: string, event: React.MouseEvent) => void;
  onAnimationEnd: (id: string) => void;

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

  onFitFrame: (id: string) => void;
}

export default function CanvasFrame({
  item,
  isSelected,
  isAnimating,
  selectedIds,
  isSettling = false,
  isDragging = false,
  onMouseDown,
  onAnimationEnd,
  onUpdateItem,
  onDeleteItem,
  onSelectItems,
  onRequestDelete,
  onItemResize,
  onFitFrame,
}: CanvasFrameProps) {
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
        left: item.x,
        top: item.y,
        zIndex: item.zIndex,
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

      {isSelected && (
        <ResizeHandles
          visible
          onResizeStart={(event, direction) => onItemResize(item.id, event, direction)}
        />
      )}

      <BlockRenderer
        item={item}
        isSelected={isSelected}
        onUpdate={updater => onUpdateItem(item.id, updater)}
        onDelete={() =>
          onRequestDelete(() => {
            onDeleteItem(item.id);
            onSelectItems(selectedIds.filter(id => id !== item.id));
          })
        }
        onFitFrame={() => onFitFrame(item.id)}
        onLineEndpointDrag={() => {}}
      />
    </div>
  );
}