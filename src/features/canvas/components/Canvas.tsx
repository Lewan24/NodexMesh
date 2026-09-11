import { useCallback, useEffect, useRef, useState } from 'react';

import type { BoardItem, LineItem } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';
import type { ToolType } from '@/entities/board/toolTypes';

import ConfirmDialog from '@/shared/components/dialogs/ConfirmDialog';
import CanvasFrame from '@/features/canvas/components/CanvasFrame';
import CanvasItem from '@/features/canvas/components/CanvasItem';
import CanvasControls from '@/features/canvas/components/CanvasControls';
import { drawingOutline, joinDrawings } from '@/features/blocks/drawing/drawingUtils';
import CanvasOverlays from '@/features/canvas/components/CanvasOverlays';
import CanvasEditBar from '@/features/canvas/components/CanvasEditBar';
import CanvasHints from './CanvasHints';
import CanvasEmptyState from './CanvasEmptyState';
import ToolDragGhost from '@/features/canvas/components/ToolDragGhost';

import { CANVAS_GRID_SIZE, CANVAS_MAJOR_GRID_SIZE, ZOOM_MAX, ZOOM_MIN } from '@/features/canvas/constants';
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
import { createCanvasItem } from '@/features/canvas/utils/createCanvasItem';
import { getItemRect, getToolDefaultSize } from '@/features/canvas/utils/itemGeometry';
import NestedDragGhost from '@/features/canvas/components/NestedDragGhost';

import {
  NESTED_DRAG_END_EVENT,
  NESTED_DRAG_MOVE_EVENT,
  type NestedDragDetail,
} from '@/features/canvas/utils/nestedDrag';

import {
  TOOL_DRAG_END_EVENT,
  TOOL_DRAG_MOVE_EVENT,
  type ToolDragDetail,
} from '@/features/canvas/utils/toolDrag';
import CanvasDropPreview from './CanvasDropPreview';
import { useCanvasLostState } from '../hooks/useCanvasLostState';
import CanvasLostPrompt from './CanvasLostPrompt';
import CanvasAlignmentGuides from './CanvasAlignmentGuides';
import {
  getColumnSearchResult,
  matchesItemSearch,
} from '@/features/search/utils/itemSearch';

import { isItemInsideFrame, isFrameMovementLocked } from '@/features/canvas/utils/frameGeometry';

import ItemInspector from '@/features/inspector/ItemInspector';
import { useCanvasClipboard } from '../hooks/useCanvasClipboard';
import CanvasContextMenu from './CanvasContextMenu';
import type { CanvasMenuState } from './CanvasContextMenu';
import './contextMenu.css';

interface ToolDragGhostState extends ToolDragDetail {
  overCanvas: boolean;
}

interface CanvasProps {
  project: Project;
  selectedTool: ToolType;
  pan: {
    x: number;
    y: number;
  };
  zoom: number;
  selectedIds: string[];
  searchQuery: string;

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
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onDropOnColumn: (itemId: string, columnId: string) => void;
  onEjectFromColumn: (
    columnId: string,
    ejectedItem: BoardItem,
    position?: {
      x: number;
      y: number;
    },
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
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDropOnColumn,
  onEjectFromColumn,
  onRestoreItems,
  searchQuery
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [contextMenu, setContextMenu] = useState<CanvasMenuState | null>(null);
  const pointerPosition = useRef<{ x: number; y: number } | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const [frameCapturePreviewIds, setFrameCapturePreviewIds] = useState<string[]>([]);

  const [toolDragGhost, setToolDragGhost] = useState<ToolDragGhostState | null>(null);
  const [nestedDragGhost, setNestedDragGhost] = useState<NestedDragDetail | null>(null);
  const [toolDropPreview, setToolDropPreview] =
    useState<{
      x: number;
      y: number;
      width: number;
      height: number;
    } | null>(null);

  const [viewportSize, setViewportSize] =
    useState({
      width: 0,
      height: 0,
    });

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
    projectId: project.id,
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
    handleItemResize: handleMeasuredItemResize,
  } = useCanvasMeasurements({
    projectRef,
    onUpdateItem,
  });

  const { handleItemResize } = useItemResize({
    projectRef,
    zoomRef,
    measuredSizes,
    snapValue,
    pushHistory,
    onUpdateItem,

    onFramePreviewChange: setFrameCapturePreviewIds,

    onFrameResizeEnd: (frameId, containedIds) => {
      onSelectItems([frameId, ...containedIds]);
    },
  });

  const {
    attachHoverId,
    handleLineEndpointDrag,
    handleQuickConnectStart,
  } = useLineDrag({
    projectRef,
    zoomRef,
    measuredSizes,
    pushHistory,

    onAddItem,
    onDeleteItem,
    onSelectItems,

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

  const handleEjectFromColumn =
  useCallback(
    (
      columnId: string,
      ejectedItem: BoardItem,
      clientX?: number,
      clientY?: number,
    ) => {
      /*
       * Kliknięcie przycisku ↗.
       * Nie ma pozycji drag/drop,
       * więc parent użyje standardowego
       * miejsca obok Column.
       */
      if (
        clientX === undefined ||
        clientY === undefined
      ) {
        onEjectFromColumn(
          columnId,
          ejectedItem,
        );

        return;
      }

      const container =
        containerRef.current;

      if (!container) {
        onEjectFromColumn(
          columnId,
          ejectedItem,
        );

        return;
      }

      const rect =
        container.getBoundingClientRect();

      /*
       * Screen coordinates
       * ↓
       * Canvas/world coordinates.
       */
      const point =
        screenToCanvas(
          clientX - rect.left,
          clientY - rect.top,
        );

      /*
       * Lekki offset, żeby kursor
       * nie był dokładnie w lewym
       * górnym rogu itemu.
       */
      const x =
        snapValue(
          point.x - 16,
        );

      const y =
        snapValue(
          point.y - 16,
        );

      onEjectFromColumn(
        columnId,
        ejectedItem,
        {
          x,
          y,
        },
      );
    },
    [
      onEjectFromColumn,
      screenToCanvas,
      snapValue,
    ],
  );

  useEffect(() => {
    const handleMove = (
      event: Event,
    ) => {
      const detail =
        (
          event as CustomEvent<NestedDragDetail>
        ).detail;

      setNestedDragGhost(detail);
    };

    const handleEnd = () => {
      setNestedDragGhost(null);
    };

    window.addEventListener(
      NESTED_DRAG_MOVE_EVENT,
      handleMove,
    );

    window.addEventListener(
      NESTED_DRAG_END_EVENT,
      handleEnd,
    );

    return () => {
      window.removeEventListener(
        NESTED_DRAG_MOVE_EVENT,
        handleMove,
      );

      window.removeEventListener(
        NESTED_DRAG_END_EVENT,
        handleEnd,
      );
    };
  }, []);

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) return;

    const updateSize = () => {
      setViewportSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    updateSize();

    const observer =
      new ResizeObserver(updateSize);

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const getDropPosition = (
      detail: ToolDragDetail,
    ) => {
      const container = containerRef.current;
      if (!container) return null;

      const rect = container.getBoundingClientRect();

      const overCanvas =
        detail.clientX >= rect.left &&
        detail.clientX <= rect.right &&
        detail.clientY >= rect.top &&
        detail.clientY <= rect.bottom;

      if (!overCanvas) {
        return {
          overCanvas: false,
          canvasX: 0,
          canvasY: 0,
          ghostClientX: detail.clientX,
          ghostClientY: detail.clientY,
        };
      }

      const point = screenToCanvas(
        detail.clientX - rect.left,
        detail.clientY - rect.top,
      );

      const placement = { x: snapValue(point.x), y: snapValue(point.y) };
      const canvasX = placement.x;
      const canvasY = placement.y;

      /*
      * Convert the snapped canvas position back to screen coordinates.
      * This makes the ghost show the exact final drop position.
      */
      const ghostClientX =
        rect.left +
        panRef.current.x +
        canvasX * zoomRef.current;

      const ghostClientY =
        rect.top +
        panRef.current.y +
        canvasY * zoomRef.current;

      return {
        overCanvas: true,
        canvasX,
        canvasY,
        ghostClientX,
        ghostClientY,
      };
    };

    const handleToolDragMove = (event: Event) => {
      const detail = (
        event as CustomEvent<ToolDragDetail>
      ).detail;

      const position = getDropPosition(detail);

      if (!position) return;

      setToolDragGhost({
        extra: detail.extra,
        tool: detail.tool,
        clientX: position.ghostClientX,
        clientY: position.ghostClientY,
        overCanvas: position.overCanvas,
      });

      if (position.overCanvas) {
        const size =
          getToolDefaultSize(detail.tool);

        setToolDropPreview({
          x: snapValue(position.canvasX),
          y: snapValue(position.canvasY),
          width: size.width,
          height: size.height,
        });
      } else {
        setToolDropPreview(null);
      }
    };

    const handleToolDragEnd = (event: Event) => {
      const detail = (
        event as CustomEvent<ToolDragDetail>
      ).detail;

      const position = getDropPosition(detail);

      setToolDragGhost(null);
      setToolDropPreview(null); 

      if (!position?.overCanvas) return;

      const finalX =
        snapValue(position.canvasX);

      const finalY =
        snapValue(position.canvasY);

      const item = createCanvasItem(
        detail.tool,
        finalX,
        finalY,
        detail.extra,
      );

      if (!item) return;

      pushHistory();
      onAddItem(item);
      triggerEnterAnimation(item.id);

      onSelectItems([item.id]);
      onSelectTool('select');
    };

    window.addEventListener(
      TOOL_DRAG_MOVE_EVENT,
      handleToolDragMove,
    );

    window.addEventListener(
      TOOL_DRAG_END_EVENT,
      handleToolDragEnd,
    );

    return () => {
      window.removeEventListener(
        TOOL_DRAG_MOVE_EVENT,
        handleToolDragMove,
      );

      window.removeEventListener(
        TOOL_DRAG_END_EVENT,
        handleToolDragEnd,
      );
    };
  }, [
    screenToCanvas,
    snapValue,
    pushHistory,
    onAddItem,
    triggerEnterAnimation,
    onSelectItems,
    onSelectTool,
  ]);

  const {
    drawingDraft,
    frameDraft,
    lasso,
    handleCanvasMouseDown,
  } = useCanvasMouse({
    containerRef,
    projectRef,
    selectedIdsRef,
    panRef,
    measuredSizes,
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
    onFramePreviewChange: setFrameCapturePreviewIds,
  });

  const {
    handleChecklistDropOutside,
    handleKanbanCardDropOutside,
  } = useCrossItemDrop({
    pushHistory,
    projectRef,
    onUpdateItem,
  });

  const { handleFitFrame } = useFrameActions({
    items: project.items,
    measuredSizes,
    onUpdateItem,
  });

  const {
    selectedColumnItem,
    clearColumnSelection,
    handleSelectColumnItem: selectColumnItem,
    handleUpdateColumnItem,
    deleteSelectedColumnItem,
  } = useColumnSelection({
    onSelectItems,
    onUpdateItem,
  });

  const handleSelectColumnItem = useCallback(
    (columnId: string, item: BoardItem | null) => {
      selectColumnItem(columnId, item);

      if (item) onSelectTool('select');
    },
    [selectColumnItem, onSelectTool],
  );

  const pastePoint = useCallback(() => pointerPosition.current ?? {
    x: snapValue(((containerRef.current?.clientWidth ?? 800) / 2 - panRef.current.x) / zoomRef.current),
    y: snapValue(((containerRef.current?.clientHeight ?? 600) / 2 - panRef.current.y) / zoomRef.current),
  }, [snapValue]);
  const clipboard = useCanvasClipboard({ projectRef, selectedIdsRef, measuredSizes, pushHistory, onRestoreItems, onSelectItems, pastePoint, nestedSelection: selectedColumnItem, clearColumnSelection });

  useCanvasKeyboard({
    selectedIdsRef,
    onSelectItems,
    onSelectTool,
    onDeleteItems,
    requestDelete,
    clearColumnSelection,
    undo,
    copy: clipboard.copy,
    paste: clipboard.paste,
    duplicate: clipboard.duplicate,
    deleteNested: selectedColumnItem ? () => requestDelete(deleteSelectedColumnItem) : undefined,
  });

  const {
    dragOverColumnId,
    draggingIds,
    settlingIds,
    dropPreview,
    dragTilt,
    alignmentGuides,
    handleItemMouseDown,
  } = useItemDrag({
    projectRef,
    selectedIdsRef,
    zoomRef,
    snapEnabled,
    measuredSizes,
    snapValue,
    pushHistory,
    onSelectItems,
    onSelectTool,
    onUpdateItem,
    onDropOnColumn,
    clearColumnSelection,
  });

  const { isLost } =
  useCanvasLostState({
    items: project.items,
    measuredSizes,

    pan,
    zoom,

    viewportWidth:
      viewportSize.width,

    viewportHeight:
      viewportSize.height,

    delay: 900,
  });

  const handleReturnToBoard =
  useCallback(() => {
    if (project.items.length === 0) {
      onPanChange({
        x: 0,
        y: 0,
      });

      onZoomChange(1);
      return;
    }

    const rects =
      project.items.map(item =>
        getItemRect(
          item,
          measuredSizes,
        ),
      );

    const left =
      Math.min(
        ...rects.map(rect => rect.x),
      );

    const top =
      Math.min(
        ...rects.map(rect => rect.y),
      );

    const right =
      Math.max(
        ...rects.map(
          rect => rect.right,
        ),
      );

    const bottom =
      Math.max(
        ...rects.map(
          rect => rect.bottom,
        ),
      );

    const boardWidth =
      right - left;

    const boardHeight =
      bottom - top;

    const padding = 100;

    const availableWidth =
      Math.max(
        1,
        viewportSize.width -
          padding * 2,
      );

    const availableHeight =
      Math.max(
        1,
        viewportSize.height -
          padding * 2,
      );

    const fitZoom =
      Math.min(
        availableWidth /
          Math.max(boardWidth, 1),

        availableHeight /
          Math.max(boardHeight, 1),

        1,
      );

    const nextZoom =
      Math.max(
        ZOOM_MIN,
        Math.min(
          ZOOM_MAX,
          fitZoom,
        ),
      );

    const centerX =
      left + boardWidth / 2;

    const centerY =
      top + boardHeight / 2;

    onZoomChange(nextZoom);

    onPanChange({
      x:
        viewportSize.width / 2 -
        centerX * nextZoom,

      y:
        viewportSize.height / 2 -
        centerY * nextZoom,
    });
  }, [
    project.items,
    measuredSizes,
    viewportSize,
    onPanChange,
    onZoomChange,
  ]);

  const handleGoToFirstItem =
  useCallback(() => {
    const firstItem =
      project.items[0];

    if (!firstItem) {
      onPanChange({
        x: 0,
        y: 0,
      });

      onZoomChange(1);
      return;
    }

    const rect =
      getItemRect(
        firstItem,
        measuredSizes,
      );

    const targetZoom =
      Math.max(zoom, 0.8);

    onZoomChange(targetZoom);

    onPanChange({
      x:
        viewportSize.width / 2 -
        (
          rect.x +
          rect.width / 2
        ) *
          targetZoom,

      y:
        viewportSize.height / 2 -
        (
          rect.y +
          rect.height / 2
        ) *
          targetZoom,
    });

    onSelectItems([
      firstItem.id,
    ]);
  }, [
    project.items,
    measuredSizes,
    viewportSize,
    zoom,
    onPanChange,
    onZoomChange,
    onSelectItems,
  ]);

  const handleBlurActiveElement = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;

      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLSelectElement
      ) {
        return;
      }

      const active = document.activeElement;

      if (
        !(active instanceof HTMLElement) ||
        active === document.body
      ) {
        return;
      }

      if (active.contains(target as Node)) return;

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
      const clickedInspector = target.closest('[data-item-inspector="true"]');

      if (
        clickedColumnItem ||
        clickedEditBar ||
        clickedInspector
      ) {
        return;
      }

      clearColumnSelection();
    },
    [handleBlurActiveElement, clearColumnSelection],
  );

  const safeSelectedIds = selectedIds ?? [];
  const joinableDrawings = project.items.filter(item => selectedIds.includes(item.id));
  const canJoinDrawings = !selectedColumnItem && joinableDrawings.length > 1 && joinableDrawings.every(item => item.type === 'drawing' && !item.locked);
  const handleJoinDrawings = () => {
    if (!canJoinDrawings) return;
    const joined = joinDrawings(joinableDrawings.filter(item => item.type === 'drawing'));
    if (!joined) return;
    pushHistory();
    onRestoreItems([...project.items.filter(item => !selectedIds.includes(item.id)).map(item => item.type === 'line' ? {
      ...item,
      startItemId: item.startItemId && selectedIds.includes(item.startItemId) ? joined.id : item.startItemId,
      endItemId: item.endItemId && selectedIds.includes(item.endItemId) ? joined.id : item.endItemId,
    } : item), joined]);
    onSelectItems([joined.id]);
  };


  const selectedItems = project.items.filter(item =>
    safeSelectedIds.includes(item.id),
  );

  const normalizedSearch =
    searchQuery.trim();

  const searchActive =
    normalizedSearch.length > 0;

  const matchingIds =
    new Set<string>();

  const nestedColumnMatches =
    new Map<
      string,
      Set<string>
    >();

  for (const item of project.items) {
    if (
      item.type === 'column'
    ) {
      const result =
        getColumnSearchResult(
          item,
          normalizedSearch,
        );

      if (result.matches) {
        matchingIds.add(
          item.id,
        );
      }

      nestedColumnMatches.set(
        item.id,
        result.nestedMatchIds,
      );

      continue;
    }

    if (
      matchesItemSearch(
        item,
        normalizedSearch,
      )
    ) {
      matchingIds.add(item.id);
    }
  }

  const contextFrameIds =
    new Set<string>();

  if (searchActive) {
    const matchedItems =
      project.items.filter(item =>
        matchingIds.has(item.id),
      );

    for (const frame of project.items) {
      if (
        frame.type !== 'frame'
      ) {
        continue;
      }

      const containsMatch =
        matchedItems.some(
          matchedItem =>
            matchedItem.id !==
              frame.id &&
            isItemInsideFrame(
              matchedItem,
              frame,
              measuredSizes,
            ),
        );

      if (containsMatch) {
        contextFrameIds.add(
          frame.id,
        );
      }
    }
  }

  const frames = project.items.filter(
    item => item.type === 'frame',
  );

  const regularItems = project.items
    .filter(item => item.type !== 'frame')
    .sort((a, b) => a.zIndex - b.zIndex);

  const minorGridInterval =
    CANVAS_GRID_SIZE * zoom;

  const majorGridInterval =
    CANVAS_MAJOR_GRID_SIZE * zoom;

  const minorBackgroundX =
    ((pan.x % minorGridInterval) +
      minorGridInterval) %
    minorGridInterval;

  const minorBackgroundY =
    ((pan.y % minorGridInterval) +
      minorGridInterval) %
    minorGridInterval;

  const majorBackgroundX =
    ((pan.x % majorGridInterval) +
      majorGridInterval) %
    majorGridInterval;

  const majorBackgroundY =
    ((pan.y % majorGridInterval) +
      majorGridInterval) %
    majorGridInterval;

  const cursorClass =
    selectedTool !== 'select'
      ? 'cursor-crosshair'
      : 'cursor-default';

  const inspectorItems =
  selectedColumnItem
    ? [selectedColumnItem.item]
    : selectedItems;

  return (
    <div
      data-canvas-root="true"
      ref={containerRef}
      className={`flex-1 min-w-0 min-h-0 relative overflow-clip select-none ${cursorClass}`}
      style={{
        backgroundColor: 'var(--color-app-bg)',

        backgroundImage: `
          radial-gradient(
            circle,
            var(--color-canvas-dot) 1.8px,
            transparent 2.1px
          ),
          radial-gradient(
            circle,
            var(--color-canvas-dot) 0.8px,
            transparent 1.1px
          )
        `,

        backgroundSize: `
          ${majorGridInterval}px ${majorGridInterval}px,
          ${minorGridInterval}px ${minorGridInterval}px
        `,

        backgroundPosition: `
          ${majorBackgroundX}px ${majorBackgroundY}px,
          ${minorBackgroundX}px ${minorBackgroundY}px
        `,
      }}
      onMouseDownCapture={handleCanvasMouseDownCapture}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerPosition.current = { x: snapValue((event.clientX - rect.left - panRef.current.x) / zoomRef.current), y: snapValue((event.clientY - rect.top - panRef.current.y) / zoomRef.current) };
      }}
      onContextMenu={event => {
        const target = event.target;
        if (!(target instanceof Element) || target.closest('input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[data-edit-bar],[data-item-inspector]')) return;
        event.preventDefault(); event.stopPropagation();
        const id = target.closest('[data-board-item-id]')?.getAttribute('data-board-item-id');
        const childId = target.closest('[data-nested-item-id]')?.getAttribute('data-nested-item-id');
        const column = project.items.find(item => item.id === id);
        const child = column?.type === 'column' ? column.items.find(item => item.id === childId) : undefined;
        if (child && id) { selectedIdsRef.current = []; handleSelectColumnItem(id, child); }
        else {
          if (id && !selectedIdsRef.current.includes(id)) { selectedIdsRef.current = [id]; onSelectItems([id]); }
          if (!id) { selectedIdsRef.current = []; onSelectItems([]); }
          clearColumnSelection();
        }
        onSelectTool('select');
        const rect = event.currentTarget.getBoundingClientRect();
        setContextMenu({ x: event.clientX, y: event.clientY, canvasX: snapValue((event.clientX - rect.left - pan.x) / zoom), canvasY: snapValue((event.clientY - rect.top - pan.y) / zoom), hasSelection: Boolean(id) });
      }}
    >
      {contextMenu && <CanvasContextMenu onJoinDrawings={canJoinDrawings ? handleJoinDrawings : undefined} menu={contextMenu} count={selectedColumnItem ? 1 : selectedIds.length} canPaste={clipboard.canPaste}
        allLocked={selectedColumnItem ? Boolean(selectedColumnItem.item.locked) : selectedItems.length > 0 && selectedItems.every(item => item.locked)} onClose={closeContextMenu}
        onCopy={clipboard.copy} onDuplicate={clipboard.duplicate} onPaste={() => clipboard.paste({ x: contextMenu.canvasX, y: contextMenu.canvasY })}
        onDelete={() => { if (selectedColumnItem) { requestDelete(deleteSelectedColumnItem); return; } const ids = [...selectedIdsRef.current]; requestDelete(() => { onDeleteItems(ids); onSelectItems([]); }, ids.length); }}
        onLock={() => { pushHistory(); if (selectedColumnItem) { handleUpdateColumnItem(selectedColumnItem.columnId, item => ({ ...item, locked: !item.locked })); return; } const locked = !selectedItems.every(item => item.locked); onRestoreItems(project.items.map(item => selectedIds.includes(item.id) ? { ...item, locked } : item)); }}
        onGroup={onGroupSelected} />}
      <CanvasLostPrompt
        visible={
          isLost &&
          project.items.length > 0 &&
          draggingIds.length === 0 &&
          !toolDragGhost
        }
        onReturnToBoard={
          handleReturnToBoard
        }
        onGoToFirstItem={
          handleGoToFirstItem
        }
      />

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
            movementLocked={isFrameMovementLocked(frame, project.items, measuredSizes)}
            onItemResize={handleItemResize}
            isSettling={settlingIds.includes(frame.id)}
            zoom={zoom}
            isSelected={safeSelectedIds.includes(frame.id)}
            isDragging={draggingIds.includes(frame.id)}
            dragTilt={
              draggingIds.includes(frame.id)
                ? dragTilt
                : 0
            }
            onQuickConnectStart={
              handleQuickConnectStart
            }
            isAnimating={animatingIds.has(frame.id)}
            isAttachTarget={attachHoverId === frame.id}
            selectedIds={safeSelectedIds}
            onMouseDown={handleItemMouseDown}
            onAnimationEnd={clearEnterAnimation}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onSelectItems={onSelectItems}
            onRequestDelete={requestDelete}
            onFitFrame={handleFitFrame}

            searchActive={searchActive}
            isSearchMatch={
              !searchActive ||
              matchingIds.has(frame.id)
            }
            isSearchContext={
              contextFrameIds.has(
                frame.id,
              )
            }
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
              isFrameCapturePreview={frameCapturePreviewIds.includes(item.id)}
              selectedColumnItemId={
                item.type === 'column' &&
                selectedColumnItem?.columnId === item.id
                  ? selectedColumnItem.item.id
                  : null
              }
              isSettling={settlingIds.includes(item.id)}
              isDragging={draggingIds.includes(item.id)}
              dragTilt={
                draggingIds.includes(item.id)
                  ? dragTilt
                  : 0
              }
              onQuickConnectStart={
                handleQuickConnectStart
              }
              zoom={zoom}
              isSelected={safeSelectedIds.includes(item.id)}
              isAttachTarget={attachHoverId === item.id}
              isDragOver={dragOverColumnId === item.id}
              isAnimating={animatingIds.has(item.id)}
              selectedIds={safeSelectedIds}
              onMouseDown={handleItemMouseDown}
              onAnimationEnd={clearEnterAnimation}
              onResize={handleMeasuredItemResize}
              onItemResize={handleItemResize}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              onSelectItems={onSelectItems}
              onRequestDelete={requestDelete}
              onLineEndpointDrag={handleLineEndpointDrag}
              onEjectFromColumn={handleEjectFromColumn}
              onSelectColumnItem={handleSelectColumnItem}
              onChecklistDropOutside={handleChecklistDropOutside}
              onKanbanCardDropOutside={handleKanbanCardDropOutside}
              pushHistory={pushHistory}

              searchActive={searchActive}
              isSearchMatch={
                !searchActive ||
                matchingIds.has(item.id)
              }
              nestedSearchMatchIds={
                item.type === 'column'
                  ? nestedColumnMatches.get(
                      item.id,
                    )
                  : undefined
              }
            />
          );
        })}

        <CanvasAlignmentGuides
          guides={alignmentGuides}
        />

        {dropPreview && (
          <CanvasDropPreview
            x={dropPreview.x}
            y={dropPreview.y}
            width={dropPreview.width}
            height={dropPreview.height}
            label={
              alignmentGuides.length > 0
                ? 'Aligned'
                : 'Grid snap'
            }
          />
        )}

        {toolDropPreview && (
          <CanvasDropPreview
            x={toolDropPreview.x}
            y={toolDropPreview.y}
            width={toolDropPreview.width}
            height={toolDropPreview.height}
            label="Place here"
          />
        )}

        {drawingDraft && <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" width="1" height="1" style={{ zIndex: 100000 }}><path d={drawingOutline(drawingDraft, 3)} fill="#7C3AED" /></svg>}
        <CanvasOverlays
          frameDraft={frameDraft}
          lasso={lasso}
        />
      </div>

      {selectedTool === 'drawing' && <div className="absolute inset-0 z-40 cursor-crosshair" aria-label="Drawing surface" />}
      {toolDragGhost && (
        <ToolDragGhost
          color={toolDragGhost.extra?.color}
          tool={toolDragGhost.tool}
          clientX={toolDragGhost.clientX}
          clientY={toolDragGhost.clientY}
          overCanvas={toolDragGhost.overCanvas}
        />
      )}

      {nestedDragGhost && (
        <NestedDragGhost
          payload={
            nestedDragGhost.payload
          }
          clientX={
            nestedDragGhost.clientX
          }
          clientY={
            nestedDragGhost.clientY
          }
        />
      )}

      <ItemInspector
        items={inspectorItems}
        onUpdateAll={updater => {
          if (selectedColumnItem) {
            handleUpdateColumnItem(
              selectedColumnItem.columnId,
              updater,
            );

            return;
          }

          /*
          * Canvas multi-selection.
          */
          for (
            const selectedItem of
              selectedItems
          ) {
            onUpdateItem(
              selectedItem.id,
              updater,
            );
          }
        }}
        onClose={() => {
          onSelectItems([]);
          clearColumnSelection();
        }}
      />

      <CanvasEditBar
        onJoinDrawings={canJoinDrawings ? handleJoinDrawings : undefined}
        selectedItems={selectedItems.map(item => item.type === 'line' ? resolveLineItem(item, project.items, measuredSizes) : item)}
        selectedColumnItem={selectedColumnItem}
        onUpdateItem={onUpdateItem}
        onDeleteItems={onDeleteItems}
        onSelectItems={onSelectItems}
        onGroupSelected={onGroupSelected}
        onBringForward={onBringForward}
        onSendBackward={onSendBackward}
        onBringToFront={onBringToFront}
        onSendToBack={onSendToBack}
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
