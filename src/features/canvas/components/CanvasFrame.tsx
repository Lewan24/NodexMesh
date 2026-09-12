import SectionLabel, { sectionTitleScale } from '@/features/blocks/shared/SectionLabel';

import type { BoardItem, FrameItem } from '@/entities/board/types';

import BlockRenderer from '@/features/blocks/BlockRenderer';
import ResizeHandles from '@/features/canvas/components/ResizeHandles';
import type { ResizeDirection } from '@/features/canvas/types';
import ConnectionHandles, { ConnectionSide } from './ConnectionHandles';
import ItemLockBadge from './ItemLockBadge';
import ItemCommentBadge from '@/features/comments/ItemCommentBadge';

interface CanvasFrameProps {
  item: FrameItem;
  movementLocked?: boolean;
  zoom: number;
  isSelected: boolean;
  isAnimating: boolean;
  selectedIds: string[];

  isSettling?: boolean;
  isDragging?: boolean;
  dragTilt?: number;
  isAttachTarget?: boolean;

  searchActive?: boolean;
  isSearchMatch?: boolean;
  isSearchContext?: boolean;

  onMouseDown: (id: string, event: React.MouseEvent) => void;
  onAnimationEnd: (id: string) => void;

  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;

  onDeleteItem: (id: string) => void;
  onSelectItems: (ids: string[]) => void;

  onRequestDelete: (execute: () => void, count?: number) => void;

  onItemResize: (id: string, event: React.MouseEvent, direction: ResizeDirection) => void;

  onFitFrame: (id: string) => void;
  onQuickConnectStart: (id: string, event: React.MouseEvent, side: ConnectionSide) => void;
}

export default function CanvasFrame({
  item,
  isSelected,
  isAnimating,
  selectedIds,
  isSettling = false,
  isDragging = false,
  dragTilt = 0,
  isAttachTarget = false,
  zoom,

  searchActive = false,
  isSearchMatch = false,
  isSearchContext = false,

  onMouseDown,
  onAnimationEnd,
  onUpdateItem,
  onDeleteItem,
  onSelectItems,
  onRequestDelete,
  onItemResize,
  onFitFrame,
  onQuickConnectStart,
  movementLocked = false,
}: CanvasFrameProps) {
  const labelScale = sectionTitleScale(zoom);

  return (
    <div
      data-board-item="true"
      data-board-item-id={item.id}
      data-frame-id={item.id}
      className={`absolute ${isAnimating ? 'board-item-enter' : ''} ${isDragging ? 'board-item-dragging' : ''} ${
        isSettling ? 'board-item-settling' : ''
      }`}
      style={{
        left: item.x,
        top: item.y,
        zIndex: 0,
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

        opacity: !searchActive ? 1 : isSearchMatch ? 1 : isSearchContext ? 0.65 : 0.12,

        transition: 'opacity 0.18s ease, filter 0.18s ease',

        filter: searchActive && !isSearchMatch && !isSearchContext ? 'saturate(0.45)' : undefined,
      }}
      onMouseDown={(event) => onMouseDown(item.id, event)}
      onAnimationEnd={() => onAnimationEnd(item.id)}
    >
      {(item.locked || movementLocked) && <ItemLockBadge inherited={!item.locked} />}
      <ItemCommentBadge comments={item.comments} />

      {/* Semantic frame label */}
      <div
        className="absolute pointer-events-auto"
        style={{
          left: 8,
          top: -10,
          transform: `translateY(-100%) scale(${labelScale})`,
          transformOrigin: 'bottom left',
          zIndex: 50,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <SectionLabel
          item={item}
          title={item.title}
          color={item.color}
          zoom={zoom}
          onChange={(title) =>
            onUpdateItem(item.id, (current) => (current.type === 'frame' ? { ...current, title } : current))
          }
        />
      </div>

      {/* Selection */}
      {isSelected && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{ inset: -4, boxShadow: '0 0 0 2px var(--color-accent), 0 0 12px rgba(124,58,237,0.25)' }}
        />
      )}

      {searchActive && isSearchMatch && !isSelected && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{ inset: -5, boxShadow: '0 0 0 3px var(--color-accent), 0 0 22px rgba(124,58,237,0.28)', zIndex: 40 }}
        />
      )}

      {/* Line attach target */}
      {isAttachTarget && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{ inset: -6, boxShadow: '0 0 0 3px var(--color-accent), 0 0 18px rgba(124,58,237,0.35)' }}
        />
      )}

      {/* Resize */}
      {isSelected && !item.locked && !movementLocked && (
        <ResizeHandles visible onResizeStart={(event, direction) => onItemResize(item.id, event, direction)} />
      )}

      <ConnectionHandles visible={isSelected} onStart={(event, side) => onQuickConnectStart(item.id, event, side)} />

      <BlockRenderer
        item={item}
        isSelected={isSelected}
        onUpdate={(updater) => onUpdateItem(item.id, updater)}
        onDelete={() =>
          onRequestDelete(() => {
            onDeleteItem(item.id);
            onSelectItems(selectedIds.filter((id) => id !== item.id));
          })
        }
        onFitFrame={() => onFitFrame(item.id)}
        onLineEndpointDrag={() => {}}
      />
    </div>
  );
}
