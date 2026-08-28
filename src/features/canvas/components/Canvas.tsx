import { useCallback, useRef, useState } from 'react';

import type { BoardItem, LineItem } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';
import type { ToolType } from '@/entities/board/toolTypes';

import ConfirmDialog from '@/shared/components/dialogs/ConfirmDialog';
import CanvasFrame from '@/features/canvas/components/CanvasFrame';
import CanvasItem from '@/features/canvas/components/CanvasItem';
import CanvasControls from '@/features/canvas/components/CanvasControls';
import CanvasOverlays from '@/features/canvas/components/CanvasOverlays';
import CanvasEditBar from '@/features/canvas/components/CanvasEditBar';
import CanvasHints from './CanvasHints';
import CanvasEmptyState from './CanvasEmptyState';

import { CANVAS_GRID_SIZE } from '@/features/canvas/constants';
import { resolveLineItem } from '@/features/canvas/utils/lineGeometry';

import { useCanvasHistory } from '@/features/canvas/hooks/useCanvasHistory';
import { useCanvasMeasurements } from '@/features/canvas/hooks/useCanvasMeasurements';
import { useItemResize } from '@/features/canvas/hooks/useItemResize';
import { useLineDrag } from '@/features/canvas/hooks/useLineDrag';
import { useCrossItemDrop } from '@/features/canvas/hooks/useCrossItemDrop';
import { useCanvasKeyboard } from '@/features/canvas/hooks/useCanvasKeyboard';
import { useItemAnimation } from '@/features/canvas/hooks/useItemAnimation';
import { useItemDrag } from '@/features/canvas/hooks/useItemDrag';
import { useCanvasMouse } from '@/features/canvas/hooks/useCanvasMouse';
import { useFrameActions } from '@/features/canvas/hooks/useFrameActions';
import { useDeleteConfirmation } from '@/features/canvas/hooks/useDeleteConfirmation';
import { useColumnSelection } from '../hooks/useColumnSelection';
import { useCanvasZoom } from '../hooks/useCanvasZoom';

interface CanvasProps {
  project: Project;
  selectedTool: ToolType;
  pan: {
    x: number;
    y: number;
  };
  zoom: number;
  selectedIds: string[];

  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectItems: (ids: string[]) => void;
  onGroupSelected: () => void;
  onAddItem: (item: BoardItem) => void;
  onUpdateItem: (
    id: string,
    updater: (item: BoardItem) => BoardItem,
  ) => void;
  onDeleteItem: (id: string) => void;
  onDeleteItems: (ids: string[]) => void;
  onBringToFront: (id: string) => void;
  onDropOnColumn: (itemId: string, columnId: string) => void;
  onEjectFromColumn: (
    columnId: string,
    ejectedItem: BoardItem,
  ) => void;
  onRestoreItems: (items: BoardItem[]) => void;
}

export default function Canvas({
  project,
  selectedTool,
  pan,
  zoom,
  selectedIds,
  onPanChange,
  onZoomChange,
  onSelectTool,
  onSelectItems,
  onGroupSelected,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onDeleteItems,
  onBringToFront,
  onDropOnColumn,
  onEjectFromColumn,
  onRestoreItems,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);

  const panRef = useRef(pan);
  panRef.current = pan;

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const projectRef = useRef(project);
  projectRef.current = project;

  const selectedIdsRef = useRef(selectedIds ?? []);
  selectedIdsRef.current = selectedIds ?? [];

  const snapValue = useCallback(
    (value: number): number => {
      if (!snapEnabled) {
        return value;
      }

      return (
        Math.round(value / CANVAS_GRID_SIZE) *
        CANVAS_GRID_SIZE
      );
    },
    [snapEnabled],
  );

  const {
    animatingIds,
    triggerEnterAnimation,
    clearEnterAnimation,
  } = useItemAnimation();

  const getCurrentItems = useCallback(
    () => projectRef.current.items,
    [],
  );

  const { pushHistory, undo } = useCanvasHistory({
    getItems: getCurrentItems,
    restoreItems: onRestoreItems,
  });

  const {
    pendingDelete,
    requestDelete,
    confirmDelete,
    cancelDelete,
  } = useDeleteConfirmation({
    pushHistory,
  });

  const {
    measuredSizes,
    handleItemResize,
  } = useCanvasMeasurements({
    projectRef,
    onUpdateItem,
  });

  const {
    handleFrameResize,
    handleBlockResize,
  } = useItemResize({
    zoomRef,
    snapValue,
    pushHistory,
    onUpdateItem,
  });

  const {
    attachHoverId,
    handleLineEndpointDrag,
  } = useLineDrag({
    projectRef,
    zoomRef,
    measuredSizes,
    pushHistory,
    onUpdateItem,
  });

  const { screenToCanvas } = useCanvasZoom({
    containerRef,
    panRef,
    zoomRef,
    pan,
    zoom,
    onPanChange,
    onZoomChange,
  });

  const {
    frameDraft,
    lasso,
    handleCanvasMouseDown,
  } = useCanvasMouse({
    containerRef,
    projectRef,
    selectedIdsRef,
    panRef,
    selectedTool,
    pan,
    screenToCanvas,
    snapValue,
    pushHistory,
    onPanChange,
    onAddItem,
    onSelectTool,
    onSelectItems,
    triggerEnterAnimation,
  });

  const {
    handleChecklistDropOutside,
    handleKanbanCardDropOutside,
  } = useCrossItemDrop({
    containerRef,
    projectRef,
    measuredSizes,
    screenToCanvas,
    onUpdateItem,
  });

  const { handleFitFrame } = useFrameActions({
    items: project.items,
    onUpdateItem,
  });

  const {
    selectedColumnItem,
    clearColumnSelection,
    handleSelectColumnItem,
    handleUpdateColumnItem,
    deleteSelectedColumnItem,
  } = useColumnSelection({
    onSelectItems,
    onUpdateItem,
  });

  useCanvasKeyboard({
    selectedIdsRef,
    onSelectItems,
    onSelectTool,
    onDeleteItems,
    requestDelete,
    clearColumnSelection,
    undo,
  });

  const {
    dragOverColumnId,
    handleItemMouseDown,
  } = useItemDrag({
    projectRef,
    selectedIdsRef,
    zoomRef,
    snapEnabled,
    snapValue,
    pushHistory,
    onSelectItems,
    onSelectTool,
    onBringToFront,
    onUpdateItem,
    onDropOnColumn,
    clearColumnSelection,
    triggerEnterAnimation,
  });

  const handleBlurActiveElement = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) {
        return;
      }

      const active = document.activeElement;

      if (
        !(active instanceof HTMLElement) ||
        active === document.body
      ) {
        return;
      }

      if (active.contains(event.target as Node)) {
        return;
      }

      active.blur();
    },
    [],
  );

  const handleCanvasMouseDownCapture = useCallback(
    (event: React.MouseEvent) => {
      handleBlurActiveElement(event);

      if (event.button !== 0) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickedColumnItem = target.closest('[data-column-item="true"]');
      const clickedEditBar = target.closest('[data-edit-bar="true"]');

      if (clickedColumnItem || clickedEditBar) return;

      clearColumnSelection();
    },
    [handleBlurActiveElement, clearColumnSelection],
  );

  const safeSelectedIds = selectedIds ?? [];

  const selectedItems = project.items.filter(item =>
    safeSelectedIds.includes(item.id),
  );

  const frames = project.items.filter(
    item => item.type === 'frame',
  );

  const regularItems = project.items
    .filter(item => item.type !== 'frame')
    .sort((a, b) => a.zIndex - b.zIndex);

  const dotInterval = CANVAS_GRID_SIZE * zoom;

  const backgroundX =
    ((pan.x % dotInterval) + dotInterval) %
    dotInterval;

  const backgroundY =
    ((pan.y % dotInterval) + dotInterval) %
    dotInterval;

  const cursorClass =
    selectedTool !== 'select'
      ? 'cursor-crosshair'
      : 'cursor-default';

  return (
    <div
      ref={containerRef}
      className={`flex-1 relative overflow-hidden select-none ${cursorClass}`}
      style={{
        backgroundColor: 'var(--color-app-bg)',
        backgroundImage:
          'radial-gradient(circle, var(--color-canvas-dot) 1.2px, transparent 1.5px)',
        backgroundSize: `${dotInterval}px ${dotInterval}px`,
        backgroundPosition: `${backgroundX}px ${backgroundY}px`,
      }}
      onMouseDownCapture={handleCanvasMouseDownCapture}
      onMouseDown={handleCanvasMouseDown}
    >
      <div
        className="absolute"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {frames.map(frame => (
          <CanvasFrame
            key={frame.id}
            item={frame}
            zoom={zoom}
            isSelected={safeSelectedIds.includes(frame.id)}
            isAnimating={animatingIds.has(frame.id)}
            selectedIds={safeSelectedIds}
            onMouseDown={handleItemMouseDown}
            onAnimationEnd={clearEnterAnimation}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onSelectItems={onSelectItems}
            onRequestDelete={requestDelete}
            onFrameResize={handleFrameResize}
            onFitFrame={handleFitFrame}
          />
        ))}

        {regularItems.map(item => {
          const renderedItem =
            item.type === 'line'
              ? resolveLineItem(
                  item as LineItem,
                  project.items,
                  measuredSizes,
                )
              : item;

          return (
            <CanvasItem
              key={item.id}
              item={item}
              renderedItem={renderedItem}
              selectedColumnItemId={
                item.type === 'column' &&
                selectedColumnItem?.columnId === item.id
                  ? selectedColumnItem.item.id
                  : null
              }
              zoom={zoom}
              isSelected={safeSelectedIds.includes(item.id)}
              isAttachTarget={attachHoverId === item.id}
              isDragOver={dragOverColumnId === item.id}
              isAnimating={animatingIds.has(item.id)}
              selectedIds={safeSelectedIds}
              onMouseDown={handleItemMouseDown}
              onAnimationEnd={clearEnterAnimation}
              onResize={handleItemResize}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              onSelectItems={onSelectItems}
              onRequestDelete={requestDelete}
              onBlockResize={handleBlockResize}
              onLineEndpointDrag={handleLineEndpointDrag}
              onEjectFromColumn={onEjectFromColumn}
              onSelectColumnItem={handleSelectColumnItem}
              onChecklistDropOutside={
                handleChecklistDropOutside
              }
              onKanbanCardDropOutside={
                handleKanbanCardDropOutside
              }
              pushHistory={pushHistory}
            />
          );
        })}

        <CanvasOverlays
          frameDraft={frameDraft}
          lasso={lasso}
        />
      </div>

      <CanvasEditBar
        selectedItems={selectedItems}
        selectedColumnItem={selectedColumnItem}
        onUpdateItem={onUpdateItem}
        onDeleteItems={onDeleteItems}
        onSelectItems={onSelectItems}
        onGroupSelected={onGroupSelected}
        onFitFrame={handleFitFrame}
        onUpdateColumnItem={handleUpdateColumnItem}
        deleteSelectedColumnItem={deleteSelectedColumnItem}
        clearColumnSelection={clearColumnSelection}
        pushHistory={pushHistory}
        requestDelete={requestDelete}
      />

      {pendingDelete && (
        <ConfirmDialog
          title={
            pendingDelete.count > 1
              ? `Delete ${pendingDelete.count} items?`
              : 'Delete this item?'
          }
          message="This can't be undone."
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      <CanvasHints
        selectedTool={selectedTool}
        hasSelection={
          safeSelectedIds.length > 0 ||
          selectedColumnItem !== null
        }
      />

      <CanvasEmptyState
        visible={
          project.items.length === 0 &&
          selectedTool === 'select'
        }
      />

      <CanvasControls
        zoom={zoom}
        snapEnabled={snapEnabled}
        onZoomChange={onZoomChange}
        onPanChange={onPanChange}
        onToggleSnap={() =>
          setSnapEnabled(previous => !previous)
        }
      />
    </div>
  );
}