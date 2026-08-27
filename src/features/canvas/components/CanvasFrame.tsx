import type {
  BoardItem,
  FrameItem,
} from '@/entities/board/types';

import BlockRenderer from '@/features/blocks/BlockRenderer';

interface CanvasFrameProps {
  item: FrameItem;

  zoom: number;

  isSelected: boolean;

  isAnimating: boolean;

  selectedIds: string[];

  onMouseDown: (
    id: string,
    event: React.MouseEvent,
  ) => void;

  onAnimationEnd: (
    id: string,
  ) => void;

  onUpdateItem: (
    id: string,
    updater: (
      item: BoardItem,
    ) => BoardItem,
  ) => void;

  onDeleteItem: (
    id: string,
  ) => void;

  onSelectItems: (
    ids: string[],
  ) => void;

  onRequestDelete: (
    execute: () => void,
    count?: number,
  ) => void;

  onFrameResize: (
    id: string,
    event: React.MouseEvent,
    width: number,
    height: number,
  ) => void;

  onFitFrame: (
    id: string,
  ) => void;
}

export default function CanvasFrame({
  item,

  isSelected,
  isAnimating,

  selectedIds,

  onMouseDown,
  onAnimationEnd,

  onUpdateItem,
  onDeleteItem,
  onSelectItems,

  onRequestDelete,

  onFrameResize,
  onFitFrame,
}: CanvasFrameProps) {
  return (
    <div
      data-board-item="true"
      className={`
        absolute
        ${isAnimating
          ? 'board-item-enter'
          : ''
        }
      `}
      style={{
        left: item.x,
        top: item.y,
        zIndex: item.zIndex,
      }}
      onMouseDown={
        event =>
          onMouseDown(
            item.id,
            event,
          )
      }
      onAnimationEnd={
        () =>
          onAnimationEnd(
            item.id,
          )
      }
    >
      {isSelected && (
        <div
          className="
            absolute
            pointer-events-none
            rounded-2xl
          "
          style={{
            inset: -4,

            boxShadow:
              '0 0 0 2px var(--color-accent), 0 0 12px rgba(124, 58, 237,0.25)',
          }}
        />
      )}

      <BlockRenderer
        item={item}
        isSelected={isSelected}
        onUpdate={
          updater =>
            onUpdateItem(
              item.id,
              updater,
            )
        }
        onDelete={() =>
          onRequestDelete(
            () => {
              onDeleteItem(
                item.id,
              );

              onSelectItems(
                selectedIds.filter(
                  id =>
                    id !==
                    item.id,
                ),
              );
            },
          )
        }
        onFrameResize={(
          event,
          width,
          height,
        ) =>
          onFrameResize(
            item.id,
            event,
            width,
            height,
          )
        }
        onFitFrame={() =>
          onFitFrame(
            item.id,
          )
        }
        onBlockResize={() => { }}
        onLineEndpointDrag={() => { }}
      />
    </div>
  );
}