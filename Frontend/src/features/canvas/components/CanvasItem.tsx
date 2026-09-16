import { useMemo, useState } from 'react';
import type { BoardItem, ChecklistEntry, KanbanCard } from '@/entities/board/types';

import BlockRenderer from '@/features/blocks/BlockRenderer';
import ItemWatcher from '@/features/canvas/components/ItemWatcher';

import type { ResizeDirection } from '@/features/canvas/types';
import ResizeHandles from '@/features/canvas/components/ResizeHandles';
import ConnectionHandles, { ConnectionSide } from './ConnectionHandles';
import ItemLockBadge from './ItemLockBadge';
import ItemCommentBadge from '@/features/comments/ItemCommentBadge';

interface CanvasItemProps {
  item: BoardItem;
  renderedItem: BoardItem;
  zoom: number;
  measuredSize?: { width: number; height: number };

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

  searchActive?: boolean;
  isSearchMatch?: boolean;
  nestedSearchMatchIds?: Set<string>;

  onMouseDown: (id: string, event: React.MouseEvent) => void;
  onAnimationEnd: (id: string) => void;
  onResize: (id: string, width: number, height: number) => void;

  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;

  onDeleteItem: (id: string) => void;
  onSelectItems: (ids: string[]) => void;

  onRequestDelete: (execute: () => void, count?: number) => void;

  onItemResize: (id: string, event: React.MouseEvent, direction: ResizeDirection) => void;

  onLineEndpointDrag: (id: string, event: React.MouseEvent, endpoint: 1 | 2) => void;

  onEjectFromColumn: (columnId: string, ejectedItem: BoardItem, clientX?: number, clientY?: number) => void;

  onSelectColumnItem: (columnId: string, item: BoardItem | null) => void;

  onChecklistDropOutside: (sourceId: string, entry: ChecklistEntry, clientX: number, clientY: number) => boolean;

  onKanbanCardDropOutside: (sourceId: string, card: KanbanCard, clientX: number, clientY: number) => boolean;

  pushHistory: () => void;

  onQuickConnectStart: (id: string, event: React.MouseEvent, side: ConnectionSide) => void;
}

export default function CanvasItem({
  zoom,
  measuredSize,
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

  searchActive = false,
  isSearchMatch = false,
  nestedSearchMatchIds,

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
  onQuickConnectStart,
}: CanvasItemProps) {
  const [hasFocus, setHasFocus] = useState(false);
  // Only simplify already measured blocks so connection geometry stays accurate.
  const simplified =
    zoom < 0.3 &&
    measuredSize &&
    !isSelected &&
    !isDragging &&
    !isDragOver &&
    !hasFocus &&
    !searchActive &&
    item.type !== 'line' &&
    item.type !== 'drawing' &&
    item.type !== 'section-title' &&
    item.type !== 'frame';
  const showDragEffect = isDragging && item.type !== 'line';

  // Only section titles change their content with the camera scale. Keep the
  // expensive block subtree intact while panning, pinching or animating its wrapper.
  const contentZoom = item.type === 'section-title' ? zoom : 1;
  const content = useMemo(
    () => (
      <ItemWatcher itemId={item.id} onResize={onResize}>
        <BlockRenderer
          zoom={contentZoom}
          item={renderedItem}
          onTaskDroppedOutside={onChecklistDropOutside}
          isSelected={isSelected}
          isDragOver={isDragOver}
          selectedColumnItemId={selectedColumnItemId}
          onUpdate={(updater) => onUpdateItem(item.id, updater)}
          onDelete={() =>
            onRequestDelete(() => {
              onDeleteItem(item.id);
              onSelectItems(selectedIds.filter((id) => id !== item.id));
            })
          }
          onFitFrame={() => {}}
          onLineEndpointDrag={(event, endpoint) => onLineEndpointDrag(item.id, event, endpoint)}
          onEjectItem={
            item.type === 'column'
              ? (ejectedItem, clientX, clientY) => onEjectFromColumn(item.id, ejectedItem, clientX, clientY)
              : undefined
          }
          onSelectColumnItem={
            item.type === 'column' ? (columnItem) => onSelectColumnItem(item.id, columnItem) : undefined
          }
          onRequestDelete={onRequestDelete}
          onEntryDroppedOutside={
            item.type === 'checklist'
              ? (entry, clientX, clientY) => onChecklistDropOutside(item.id, entry, clientX, clientY)
              : undefined
          }
          onCardDroppedOutside={
            item.type === 'kanban'
              ? (card, clientX, clientY) => onKanbanCardDropOutside(item.id, card, clientX, clientY)
              : undefined
          }
          searchActive={searchActive}
          nestedSearchMatchIds={item.type === 'column' ? nestedSearchMatchIds : undefined}
        />
      </ItemWatcher>
    ),
    [
      contentZoom,
      item.id,
      item.type,
      renderedItem,
      isSelected,
      isDragOver,
      selectedColumnItemId,
      onUpdateItem,
      onRequestDelete,
      onDeleteItem,
      onSelectItems,
      selectedIds,
      onLineEndpointDrag,
      onEjectFromColumn,
      onSelectColumnItem,
      onChecklistDropOutside,
      onKanbanCardDropOutside,
      searchActive,
      nestedSearchMatchIds,
      onResize,
    ],
  );

  return (
    <div
      data-board-item="true"
      data-board-item-id={item.id}
      data-movement-locked={Boolean(item.locked)}
      className={`absolute ${isAnimating ? 'board-item-enter' : ''} ${showDragEffect ? 'board-item-dragging' : ''} ${
        isSettling ? 'board-item-settling' : ''
      }`}
      style={{
        left: renderedItem.x,
        top: renderedItem.y,
        // Keep connection handles accessible above already attached lines.
        zIndex: isSelected && item.type !== 'line' ? 100000 : Math.max(1, item.zIndex),
        cursor: item.locked ? 'default' : 'grab',
        transform: showDragEffect
          ? `
              perspective(900px)
              rotateY(${dragTilt}deg)
              rotateZ(${dragTilt * 0.18}deg)
              translateY(-12px)
              scale(0.9)
            `
          : undefined,

        transformOrigin: 'center center',

        opacity: searchActive && !isSearchMatch ? 0.18 : 1,

        filter: searchActive && !isSearchMatch ? 'saturate(0.55)' : undefined,

        transition: 'opacity 0.18s ease, filter 0.18s ease, transform 0.16s ease',
      }}
      onMouseDown={(event) => onMouseDown(item.id, event)}
      onAnimationEnd={() => onAnimationEnd(item.id)}
    >
      {isSelected && item.type !== 'line' && !item.locked && (
        <button
          type="button"
          data-touch-drag="true"
          className="canvas-item-move-handle"
          aria-label="Move selected item"
          style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'bottom left' }}
        >
          Move ⠿
        </button>
      )}
      {item.locked && <ItemLockBadge />}
      <ItemCommentBadge comments={item.comments} />

      {isSelected && (
        <div
          className="absolute pointer-events-none rounded-sm"
          style={{ inset: -2, boxShadow: '0 0 0 2px var(--color-accent), 0 0 12px rgba(124, 58, 237,0.25)' }}
        />
      )}

      {searchActive && isSearchMatch && !isSelected && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{ inset: -5, boxShadow: '0 0 0 3px var(--color-accent), 0 0 22px rgba(124,58,237,0.32)', zIndex: 40 }}
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
          visible={isSelected && !item.locked}
          onResizeStart={(event, direction) => onItemResize(item.id, event, direction)}
        />
      )}

      {item.type !== 'line' && (
        <ConnectionHandles
          visible={isSelected && !item.locked}
          onStart={(event, side) => onQuickConnectStart(item.id, event, side)}
        />
      )}

      {isAttachTarget && (
        <div
          className="absolute pointer-events-none rounded-2xl"
          style={{ inset: -6, boxShadow: '0 0 0 3px var(--color-accent), 0 0 18px rgba(124, 58, 237,0.35)' }}
        />
      )}

      <div
        onFocusCapture={() => setHasFocus(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setHasFocus(false);
        }}
      >
        {simplified ? (
          <div
            className="item-rounded border p-3 overflow-hidden space-y-3"
            style={{
              width: measuredSize.width,
              height: measuredSize.height,
              background: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
            }}
          >
            <div className="h-3 w-2/5 rounded-full" style={{ background: 'var(--color-border)' }} />
            <div className="h-2 w-full rounded-full" style={{ background: 'var(--color-border-soft)' }} />
            <div className="h-2 w-4/5 rounded-full" style={{ background: 'var(--color-border-soft)' }} />
            <div className="h-2 w-3/5 rounded-full" style={{ background: 'var(--color-border-soft)' }} />
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
