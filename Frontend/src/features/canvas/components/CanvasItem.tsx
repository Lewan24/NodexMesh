import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useMemo, useState } from 'react';
import type { BoardItem, ChecklistEntry, KanbanCard } from '@/entities/board/types';

import BlockRenderer from '@/features/blocks/BlockRenderer';
import ItemWatcher from '@/features/canvas/components/ItemWatcher';

import type { ResizeDirection } from '@/features/canvas/types';
import { getApproxItemSize } from '@/features/canvas/utils/itemGeometry';
import { useMobileLayout } from '@/shared/components/dialogs/MobilePanel';
import ResizeHandles from '@/features/canvas/components/ResizeHandles';
import ConnectionHandles, { ConnectionSide } from './ConnectionHandles';
import ItemLockBadge from './ItemLockBadge';
import ItemCommentBadge from '@/features/comments/ItemCommentBadge';
import type { RemotePresence } from '@/features/projects/hooks/useCollaborationPresence';

interface CanvasItemProps {
  item: BoardItem;
  renderedItem: BoardItem;
  zoom: number;
  measuredSize?: { width: number; height: number };
  remotePresence?: RemotePresence[];
  collaboratorLocked?: boolean;

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
  onOpenBoard?: (boardId: string) => void;
  onRenameBoard?: (boardId: string, name: string) => void;
}

export default function CanvasItem({
  zoom,
  measuredSize,
  remotePresence,
  collaboratorLocked = false,
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
  onOpenBoard,
  onRenameBoard,
}: CanvasItemProps) {
  useTranslation();
  const [hasFocus, setHasFocus] = useState(false);
  const mobile = useMobileLayout();
  const lodThreshold = mobile ? 0.2 : 0.25;
  // Keep a cheap outline on the canvas while the camera is zoomed out. The
  // previous implementation only entered LOD after a measurement existed,
  // so newly loaded items stayed as expensive content at tiny scale and could
  // appear to disappear before their first measurement completed.
  const simplified =
    zoom <= lodThreshold &&
    !isSelected &&
    !isDragging &&
    !isDragOver &&
    !hasFocus &&
    !remotePresence?.length &&
    !searchActive &&
    item.type !== 'line' &&
    item.type !== 'drawing' &&
    item.type !== 'section-title';
  const approximateSize = getApproxItemSize(item);
  // Some blocks measure only their currently visible content (for example an
  // empty document or checklist). Keep the persisted/canonical item geometry
  // as the lower bound so the overview still communicates the item's footprint.
  const skeletonSize = {
    width: Math.max(measuredSize?.width ?? 0, approximateSize.width),
    height: Math.max(measuredSize?.height ?? 0, approximateSize.height),
  };
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
          onUpdate={(updater) => {
            if (!collaboratorLocked) onUpdateItem(item.id, updater);
          }}
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
          onOpenBoard={onOpenBoard}
          onRenameBoard={onRenameBoard}
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
      onOpenBoard,
      onRenameBoard,
    ],
  );

  return (
    <div
      data-board-item="true"
      data-board-item-id={item.id}
      data-movement-locked={Boolean(item.locked || collaboratorLocked)}
      className={`absolute ${isAnimating ? 'board-item-enter' : ''} ${showDragEffect ? 'board-item-dragging' : ''} ${
        isSettling ? 'board-item-settling' : ''
      }`}
      style={{
        left: renderedItem.x,
        top: renderedItem.y,
        // Keep connection handles accessible above already attached lines.
        zIndex: isSelected && item.type !== 'line' ? 100000 : Math.max(1, item.zIndex),
        cursor: item.locked || collaboratorLocked ? 'default' : 'grab',
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
          aria-label={translate('Move selected item')}
          style={{ transform: `scale(${1 / zoom})`, transformOrigin: 'bottom left' }}
        >
          {translate('Move ⠿')}
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

      {remotePresence?.length ? (
        <div className="absolute pointer-events-none" style={{ inset: -5, zIndex: 45 }}>
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ boxShadow: '0 0 0 2px #06B6D4, 0 0 14px rgba(6,182,212,0.28)' }}
          />
          <span
            className="absolute -top-6 left-0 rounded px-2 py-1 text-[10px] font-medium text-white shadow"
            style={{ background: '#0891B2' }}
          >
            {remotePresence.map((presence) => presence.displayName).join(', ')}
            {remotePresence.some((presence) => presence.mode === 'editing')
              ? ' ' + translate('editing')
              : ' ' + translate('viewing')}
          </span>
        </div>
      ) : null}

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
            data-canvas-lod="skeleton"
            className="item-rounded border p-3 overflow-hidden space-y-3"
            style={{
              width: Math.max(32, skeletonSize.width),
              height: Math.max(24, skeletonSize.height),
              background: '#ffffff',
              borderColor: '#cbd5e1',
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.16)',
            }}
          >
            <div className="h-3 w-2/5 rounded-full" style={{ background: '#94a3b8' }} />
            <div className="h-2 w-full rounded-full" style={{ background: '#e2e8f0' }} />
            <div className="h-2 w-4/5 rounded-full" style={{ background: '#e2e8f0' }} />
            <div className="h-2 w-3/5 rounded-full" style={{ background: '#e2e8f0' }} />
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
