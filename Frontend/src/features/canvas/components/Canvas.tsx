import { isHeavyPreviewItem } from '../utils/heavyPreview';
import { useCanvasCallbacks } from '../hooks/useCanvasCallbacks';
import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import CustomCssDialog from '@/features/blocks/custom-css/CustomCssDialog';
import { useCanvasTouch } from '../hooks/useCanvasTouch';
import PasteStyleDialog from './PasteStyleDialog';
import { copyItemStyle, pasteItemStyle } from '../utils/itemStyle';
import type { ItemStyle } from '../utils/itemStyle';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { BoardItem, FrameItem } from '@/entities/board/types';
import type { Project } from '@/entities/project/types';
import type { ProjectParticipant } from '@/entities/project/shareTypes';
import type { ToolType } from '@/entities/board/toolTypes';
import type { RemoteCursor, RemotePresence } from '@/features/projects/hooks/useCollaborationPresence';
import { TRASH_ITEM_MIME } from '@/features/projects/components/ItemTrashPanel';

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

import {
  CANVAS_GRID_SIZE,
  CANVAS_MAJOR_GRID_SIZE,
  CANVAS_VIEWPORT_OVERSCAN,
  ZOOM_MAX,
  ZOOM_MIN,
} from '@/features/canvas/constants';
import { resolveLineItem } from '@/features/canvas/utils/lineGeometry';

import { useCanvasHistory } from '@/features/canvas/hooks/useCanvasHistory';
import { useCanvasMeasurements } from '@/features/canvas/hooks/useCanvasMeasurements';
import { useItemResize } from '@/features/canvas/hooks/useItemResize';
import { useLineDrag } from '@/features/canvas/hooks/useLineDrag';
import { useCrossItemDrop } from '@/features/canvas/hooks/useCrossItemDrop';
import { useCanvasKeyboard } from '@/features/canvas/hooks/useCanvasKeyboard';
import { useItemAnimation } from '@/features/canvas/hooks/useItemAnimation';
import { useItemDrag } from '@/features/canvas/hooks/useItemDrag';
import { useCanvasMouse, shouldCaptureMiddlePan } from '@/features/canvas/hooks/useCanvasMouse';
import { useFrameActions } from '@/features/canvas/hooks/useFrameActions';
import { useDeleteConfirmation } from '@/features/canvas/hooks/useDeleteConfirmation';
import { useColumnSelection } from '../hooks/useColumnSelection';
import { useCanvasZoom } from '../hooks/useCanvasZoom';
import { createCanvasItem } from '@/features/canvas/utils/createCanvasItem';
import { getItemRect, getToolDefaultSize } from '@/features/canvas/utils/itemGeometry';
import NestedDragGhost from '@/features/canvas/components/NestedDragGhost';
import RemoteCursors from '@/features/canvas/components/RemoteCursors';

import {
  NESTED_DRAG_END_EVENT,
  NESTED_DRAG_MOVE_EVENT,
  type NestedDragDetail,
} from '@/features/canvas/utils/nestedDrag';

import { TOOL_DRAG_END_EVENT, TOOL_DRAG_MOVE_EVENT, type ToolDragDetail } from '@/features/canvas/utils/toolDrag';
import CanvasDropPreview from './CanvasDropPreview';
import { useCanvasLostState } from '../hooks/useCanvasLostState';
import CanvasLostPrompt from './CanvasLostPrompt';
import CanvasAlignmentGuides from './CanvasAlignmentGuides';
import { useProjectStatuses } from '@/features/statuses/ProjectStatusesContext';
import { getBoardSearchResult } from '@/features/search/utils/itemSearch';
import { useCanvasRenderModel } from '../hooks/useCanvasRenderModel';

import { isItemInsideFrame, wouldCreateFrameCycle } from '@/features/canvas/utils/frameGeometry';

import ItemInspector from '@/features/inspector/ItemInspector';
import { useCanvasClipboard } from '../hooks/useCanvasClipboard';
import CanvasContextMenu from './CanvasContextMenu';
import type { CanvasMenuState } from './CanvasContextMenu';
import QuickConnectMenu from './QuickConnectMenu';
import type { QuickConnectMenuState } from './QuickConnectMenu';
import { useMobileLayout } from '@/shared/components/dialogs/MobilePanel';
import { useCanvasCamera, type CanvasCameraBindings } from '../hooks/useCanvasCamera';
import { intersectsCanvasViewport, isCanvasItemVisible } from '../utils/viewportVisibility';
import './contextMenu.css';

const EMPTY_PARTICIPANTS: ProjectParticipant[] = [];
const EMPTY_CURSORS: RemoteCursor[] = [];

interface ToolDragGhostState extends ToolDragDetail {
  overCanvas: boolean;
}

export interface CanvasProps {
  project: Project;
  projectParticipants?: ProjectParticipant[];
  remoteVersion?: number;
  remotePresence?: Record<string, RemotePresence[]>;
  remoteCursors?: RemoteCursor[];
  selectedTool: ToolType;
  pan: { x: number; y: number };
  zoom: number;
  selectedIds: string[];
  searchQuery: string;

  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectItems: (ids: string[]) => void;
  onGroupSelected: () => void;
  onAddItem: (item: BoardItem) => void;
  onUpdateItem: (id: string, updater: (item: BoardItem) => BoardItem) => void;
  onUpdateItems: (updates: ReadonlyMap<string, (item: BoardItem) => BoardItem>) => void;
  onDeleteItem: (id: string) => void;
  onDeleteItems: (ids: string[]) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onDropOnColumn: (itemId: string, columnId: string) => void;
  onEjectFromColumn: (columnId: string, ejectedItem: BoardItem, position?: { x: number; y: number }) => void;
  onRestoreItems: (items: BoardItem[]) => void;
  onOpenBoard?: (boardId: string) => void;
  onRenameBoard?: (boardId: string, name: string) => void;
  onOpenTrash: () => void;
  onRestoreTrashItem: (itemId: string, position: { x: number; y: number }) => void;
  onEditBarVisibilityChange?: (visible: boolean) => void;
  onCursorMove?: (position: { x: number; y: number } | null) => void;
}

function CanvasContent({
  project,
  projectParticipants = EMPTY_PARTICIPANTS,
  remoteVersion = 0,
  remotePresence,
  remoteCursors = EMPTY_CURSORS,
  selectedTool,
  pan,
  zoom,
  selectedIds,
  onPanChange,
  onZoomChange,
  onSelectTool,
  onSelectItems,
  onGroupSelected,
  onAddItem: addItemRaw,
  onUpdateItem,
  onUpdateItems,
  onDeleteItem,
  onDeleteItems,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onDropOnColumn,
  onEjectFromColumn,
  onRestoreItems,
  searchQuery,
  onOpenBoard,
  onRenameBoard,
  onOpenTrash,
  onRestoreTrashItem,
  onEditBarVisibilityChange,
  onCursorMove,
  camera,
  isNavigating,
}: CanvasProps & { camera: CanvasCameraBindings; isNavigating: boolean }) {
  useTranslation();
  const mobile = useMobileLayout();
  const lowDetail = zoom <= (mobile ? 0.2 : 0.25);
  const { containerRef, panRef, zoomRef } = camera;
  const getLiveZoom = useCallback(() => zoomRef.current, [zoomRef]);
  const [touchSelectionMode, setTouchSelectionMode] = useState(false);
  const [spacePanActive, setSpacePanActive] = useState(false);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  useEffect(() => {
    const releaseFocus = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest('[data-board-item-id], dialog, [role="dialog"]')) {
        setFocusedItemId(null);
      }
    };
    document.addEventListener('focusin', releaseFocus);
    return () => document.removeEventListener('focusin', releaseFocus);
  }, []);
  const scrollPositions = useRef(new Map<string, { left: number; top: number }[]>());
  useEffect(() => {
    if (!scrollPositions.current.size) return;
    const ids = new Set(project.items.map((item) => item.id));
    for (const id of scrollPositions.current.keys()) if (!ids.has(id)) scrollPositions.current.delete(id);
  }, [project.items]);
  const [searchCursor, setSearchCursor] = useState({ query: '', id: '' });
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [placeOnItems, setPlaceOnItems] = useState(false);
  const [customCssTarget, setCustomCssTarget] = useState<{ itemId: string; columnId?: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<CanvasMenuState | null>(null);
  const [quickConnectMenu, setQuickConnectMenu] = useState<QuickConnectMenuState | null>(null);
  const pointerPosition = useRef<{ x: number; y: number } | null>(null);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const closeQuickConnectMenu = useCallback(() => setQuickConnectMenu(null), []);
  const openQuickConnectMenu = useCallback((menu: QuickConnectMenuState) => {
    setContextMenu(null);
    setQuickConnectMenu(menu);
  }, []);
  const [frameCapturePreviewIds, setFrameCapturePreviewIds] = useState<string[]>([]);

  const [toolDragGhost, setToolDragGhost] = useState<ToolDragGhostState | null>(null);
  const [nestedDragGhost, setNestedDragGhost] = useState<NestedDragDetail | null>(null);
  const [toolDropPreview, setToolDropPreview] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    camera.viewportRef.current = viewportSize;
  }, [camera, viewportSize]);
  useLayoutEffect(() => camera.present({ pan, zoom }));
  const collaboratorLockedIds = useMemo(
    () =>
      new Set(
        Object.entries(remotePresence ?? {})
          .filter(([, entries]) => entries.some((entry) => entry.mode === 'editing'))
          .map(([id]) => id),
      ),
    [remotePresence],
  );

  useEffect(() => {
    const isInteractiveTarget = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLButtonElement ||
      (target instanceof HTMLElement && target.isContentEditable);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.code !== 'Space' ||
        event.defaultPrevented ||
        isInteractiveTarget(event.target) ||
        (event.target instanceof Element && event.target.closest('dialog, [role="dialog"], [role="menu"]'))
      ) {
        return;
      }

      event.preventDefault();
      setSpacePanActive(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setSpacePanActive(false);
    };

    const handleBlur = () => setSpacePanActive(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useCanvasTouch({
    containerRef,
    panRef,
    zoomRef,
    selectedTool,
    selectionMode: touchSelectionMode,
    onPanChange,
    onZoomChange,
  });

  const projectRef = useRef(project);
  projectRef.current = project;

  const selectedIdsRef = useRef(selectedIds ?? []);
  selectedIdsRef.current = selectedIds ?? [];

  const snapValue = useCallback(
    (value: number): number => {
      if (!snapEnabled) {
        return Math.round(value);
      }

      return Math.round(value / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE;
    },
    [snapEnabled],
  );

  const { animatingIds, triggerEnterAnimation, clearEnterAnimation } = useItemAnimation();

  const getCurrentItems = useCallback(() => projectRef.current.items, []);

  const suppressAutoLayout = useRef(false);
  const resumeAutoLayout = useCallback(() => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        suppressAutoLayout.current = false;
      }),
    );
  }, []);
  useLayoutEffect(() => {
    if (!remoteVersion) return;
    suppressAutoLayout.current = true;
    resumeAutoLayout();
  }, [remoteVersion, resumeAutoLayout]);
  useEffect(() => {
    let resizing = false;
    const start = (event: MouseEvent) => {
      if (
        event.button === 0 &&
        event.target instanceof Element &&
        event.target.closest('[data-manual-resize]') &&
        containerRef.current?.contains(event.target)
      ) {
        resizing = true;
        suppressAutoLayout.current = true;
      }
    };
    const end = () => {
      if (resizing) {
        resizing = false;
        resumeAutoLayout();
      }
    };
    window.addEventListener('mousedown', start, true);
    window.addEventListener('mouseup', end);
    window.addEventListener('blur', end);
    return () => {
      window.removeEventListener('mousedown', start, true);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('blur', end);
    };
  }, [resumeAutoLayout, containerRef]);
  const restoreHistoryItems = useCallback(
    (items: BoardItem[]) => {
      suppressAutoLayout.current = true;
      onRestoreItems(items);
      resumeAutoLayout();
    },
    [onRestoreItems, resumeAutoLayout],
  );
  const { pushHistory, undo } = useCanvasHistory({
    projectId: project.id,
    remoteVersion,
    getItems: getCurrentItems,
    restoreItems: restoreHistoryItems,
  });

  const { pendingDelete, requestDelete, confirmDelete, cancelDelete } = useDeleteConfirmation({ pushHistory });

  const {
    measuredSizes,
    measuredItems,
    handleItemResize: handleMeasuredItemResize,
  } = useCanvasMeasurements({ items: project.items, projectRef, suppressAutoLayout, onUpdateItem });

  const onAddItem = useCallback(
    (item: BoardItem) => {
      if (item.type !== 'frame') {
        addItemRaw(item);
        return;
      }
      const parentFrameId = projectRef.current.items
        .filter((candidate): candidate is FrameItem => candidate.type === 'frame')
        .filter((candidate) => isItemInsideFrame(item, candidate, measuredSizes))
        .sort((a, b) => a.width * a.height - b.width * b.height)[0]?.id;
      onRestoreItems([
        ...projectRef.current.items.map((child) =>
          !child.frameId && !child.locked && isItemInsideFrame(child, item, measuredSizes)
            ? { ...child, frameId: item.id }
            : child,
        ),
        { ...item, frameId: parentFrameId ?? null, zIndex: 0 },
      ]);
    },
    [addItemRaw, onRestoreItems, measuredSizes],
  );

  const handleResizeStart = useCallback(() => {
    suppressAutoLayout.current = true;
  }, []);
  const handleFrameResizeEnd = useCallback(
    (frameId: string, containedIds: string[]) => onSelectItems([frameId, ...containedIds]),
    [onSelectItems],
  );
  const { handleItemResize } = useItemResize({
    onResizeStart: handleResizeStart,
    onResizeEnd: resumeAutoLayout,
    projectRef,
    zoomRef,
    measuredSizes,
    collaboratorLockedIds,
    snapValue,
    pushHistory,
    onUpdateItem,

    onFramePreviewChange: setFrameCapturePreviewIds,

    onFrameResizeEnd: handleFrameResizeEnd,
  });

  const { attachHoverId, handleLineEndpointDrag, handleQuickConnectStart } = useLineDrag({
    projectRef,
    zoomRef,
    measuredSizes,
    pushHistory,

    onAddItem,
    onDeleteItem,
    onSelectItems,

    onUpdateItem,
    onOpenQuickCreate: openQuickConnectMenu,
  });

  const { screenToCanvas } = useCanvasZoom({ containerRef, panRef, zoomRef, onPanChange, onZoomChange });

  const handleEjectFromColumn = useCallback(
    (columnId: string, ejectedItem: BoardItem, clientX?: number, clientY?: number) => {
      /*
       * Kliknięcie przycisku ↗.
       * Nie ma pozycji drag/drop,
       * więc parent użyje standardowego
       * miejsca obok Column.
       */
      if (clientX === undefined || clientY === undefined) {
        onEjectFromColumn(columnId, ejectedItem);

        return;
      }

      const container = containerRef.current;

      if (!container) {
        onEjectFromColumn(columnId, ejectedItem);

        return;
      }

      const rect = container.getBoundingClientRect();

      /*
       * Screen coordinates
       * ↓
       * Canvas/world coordinates.
       */
      const point = screenToCanvas(clientX - rect.left, clientY - rect.top);

      /*
       * Lekki offset, żeby kursor
       * nie był dokładnie w lewym
       * górnym rogu itemu.
       */
      const x = snapValue(point.x - 16);

      const y = snapValue(point.y - 16);

      onEjectFromColumn(columnId, ejectedItem, { x, y });
    },
    [onEjectFromColumn, screenToCanvas, snapValue, containerRef],
  );

  useEffect(() => {
    const handleMove = (event: Event) => {
      const detail = (event as CustomEvent<NestedDragDetail>).detail;

      setNestedDragGhost(detail);
    };

    const handleEnd = () => {
      setNestedDragGhost(null);
    };

    window.addEventListener(NESTED_DRAG_MOVE_EVENT, handleMove);

    window.addEventListener(NESTED_DRAG_END_EVENT, handleEnd);

    return () => {
      window.removeEventListener(NESTED_DRAG_MOVE_EVENT, handleMove);

      window.removeEventListener(NESTED_DRAG_END_EVENT, handleEnd);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const updateSize = () => {
      setViewportSize({ width: container.clientWidth, height: container.clientHeight });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [containerRef]);

  useEffect(() => {
    const getDropPosition = (detail: ToolDragDetail) => {
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

      const point = screenToCanvas(detail.clientX - rect.left, detail.clientY - rect.top);

      const placement = { x: snapValue(point.x), y: snapValue(point.y) };
      const canvasX = placement.x;
      const canvasY = placement.y;

      /*
       * Convert the snapped canvas position back to screen coordinates.
       * This makes the ghost show the exact final drop position.
       */
      const ghostClientX = rect.left + panRef.current.x + canvasX * zoomRef.current;

      const ghostClientY = rect.top + panRef.current.y + canvasY * zoomRef.current;

      return { overCanvas: true, canvasX, canvasY, ghostClientX, ghostClientY };
    };

    const handleToolDragMove = (event: Event) => {
      const detail = (event as CustomEvent<ToolDragDetail>).detail;

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
        const size = getToolDefaultSize(detail.tool);

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
      const detail = (event as CustomEvent<ToolDragDetail>).detail;

      const position = getDropPosition(detail);

      setToolDragGhost(null);
      setToolDropPreview(null);

      if (!position?.overCanvas) return;

      const finalX = snapValue(position.canvasX);

      const finalY = snapValue(position.canvasY);

      const item = createCanvasItem(detail.tool, finalX, finalY, detail.extra);

      if (!item) return;

      pushHistory();
      onAddItem(item);
      triggerEnterAnimation(item.id);

      onSelectItems([item.id]);
      onSelectTool('select');
    };

    window.addEventListener(TOOL_DRAG_MOVE_EVENT, handleToolDragMove);

    window.addEventListener(TOOL_DRAG_END_EVENT, handleToolDragEnd);

    return () => {
      window.removeEventListener(TOOL_DRAG_MOVE_EVENT, handleToolDragMove);

      window.removeEventListener(TOOL_DRAG_END_EVENT, handleToolDragEnd);
    };
  }, [
    screenToCanvas,
    snapValue,
    pushHistory,
    onAddItem,
    triggerEnterAnimation,
    onSelectItems,
    onSelectTool,
    containerRef,
    panRef,
    zoomRef,
  ]);

  const { drawingDraft, frameDraft, lasso, isPanning, handleCanvasMouseDown } = useCanvasMouse({
    containerRef,
    projectRef,
    selectedIdsRef,
    panRef,
    measuredSizes,
    selectedTool,
    pan,
    spacePanActive,
    placeOnItems,
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

  const { handleChecklistDropOutside, handleKanbanCardDropOutside } = useCrossItemDrop({
    canvasRef: containerRef,
    panRef,
    zoomRef,
    snapValue,
    onAddItem,
    pushHistory,
    projectRef,
    onUpdateItem,
  });

  const { handleFitFrame } = useFrameActions({ items: project.items, measuredSizes, onUpdateItem });

  const {
    selectedColumnItem,
    clearColumnSelection,
    handleSelectColumnItem: selectColumnItem,
    handleUpdateColumnItem,
    deleteSelectedColumnItem,
  } = useColumnSelection({ onSelectItems, onUpdateItem });

  useLayoutEffect(() => {
    const visible = selectedIds.length > 0 || selectedColumnItem !== null;
    onEditBarVisibilityChange?.(visible);
  }, [onEditBarVisibilityChange, selectedColumnItem, selectedIds.length]);

  useEffect(() => () => onEditBarVisibilityChange?.(false), [onEditBarVisibilityChange]);

  const handleSelectColumnItem = useCallback(
    (columnId: string, item: BoardItem | null) => {
      selectColumnItem(columnId, item);

      if (item) onSelectTool('select');
    },
    [selectColumnItem, onSelectTool],
  );

  const pastePoint = useCallback(
    () =>
      pointerPosition.current ?? {
        x: snapValue(((containerRef.current?.clientWidth ?? 800) / 2 - panRef.current.x) / zoomRef.current),
        y: snapValue(((containerRef.current?.clientHeight ?? 600) / 2 - panRef.current.y) / zoomRef.current),
      },
    [snapValue, containerRef, panRef, zoomRef],
  );
  const [pasteStyleOpen, setPasteStyleOpen] = useState(false);
  const [styleClipboard, setStyleClipboard] = useState<ItemStyle | null>(null);
  const clipboard = useCanvasClipboard({
    projectRef,
    selectedIdsRef,
    measuredSizes,
    pushHistory,
    onRestoreItems,
    onSelectItems,
    pastePoint,
    nestedSelection: selectedColumnItem,
    clearColumnSelection,
  });

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

  const { dragOverColumnId, draggingIds, dragOverrides, dropPreview, dragTilt, alignmentGuides, handleItemMouseDown } =
    useItemDrag({
      projectRef,
      selectedIdsRef,
      zoomRef,
      snapEnabled,
      measuredSizes,
      collaboratorLockedIds,
      snapValue,
      pushHistory,
      onSelectItems,
      onSelectTool,
      onUpdateItems,
      onDropOnColumn,
      clearColumnSelection,
    });

  const { isLost } = useCanvasLostState({
    items: project.items,
    measuredSizes,

    pan,
    zoom,

    viewportWidth: viewportSize.width,

    viewportHeight: viewportSize.height,

    delay: 900,
  });

  const handleReturnToBoard = useCallback(() => {
    if (project.items.length === 0) {
      onPanChange({ x: 0, y: 0 });

      onZoomChange(1);
      return;
    }

    const rects = project.items.map((item) => getItemRect(item, measuredSizes));

    const left = Math.min(...rects.map((rect) => rect.x));

    const top = Math.min(...rects.map((rect) => rect.y));

    const right = Math.max(...rects.map((rect) => rect.right));

    const bottom = Math.max(...rects.map((rect) => rect.bottom));

    const boardWidth = right - left;

    const boardHeight = bottom - top;

    const padding = viewportSize.width <= 900 ? 32 : 100;

    const availableWidth = Math.max(1, viewportSize.width - padding * 2);

    const availableHeight = Math.max(1, viewportSize.height - padding * 2);

    const fitZoom = Math.min(
      availableWidth / Math.max(boardWidth, 1),

      availableHeight / Math.max(boardHeight, 1),

      1,
    );

    const nextZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, fitZoom));

    const centerX = left + boardWidth / 2;

    const centerY = top + boardHeight / 2;

    onZoomChange(nextZoom);

    onPanChange({
      x: viewportSize.width / 2 - centerX * nextZoom,

      y: viewportSize.height / 2 - centerY * nextZoom,
    });
  }, [project.items, measuredSizes, viewportSize, onPanChange, onZoomChange]);

  const handleGoToFirstItem = useCallback(() => {
    const firstItem = project.items[0];

    if (!firstItem) {
      onPanChange({ x: 0, y: 0 });

      onZoomChange(1);
      return;
    }

    const rect = getItemRect(firstItem, measuredSizes);

    const targetZoom = Math.max(zoomRef.current, 0.8);

    onZoomChange(targetZoom);

    onPanChange({
      x: viewportSize.width / 2 - (rect.x + rect.width / 2) * targetZoom,

      y: viewportSize.height / 2 - (rect.y + rect.height / 2) * targetZoom,
    });

    onSelectItems([firstItem.id]);
  }, [project.items, measuredSizes, viewportSize, zoomRef, onPanChange, onZoomChange, onSelectItems]);

  const handleBlurActiveElement = useCallback((event: React.MouseEvent) => {
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

    if (!(active instanceof HTMLElement) || active === document.body) {
      return;
    }

    if (active.contains(target as Node)) return;

    active.blur();
  }, []);

  const handleCanvasMouseDownCapture = useCallback(
    (event: React.MouseEvent) => {
      // Capture middle-button panning before task controls stop bubbling mouse events.
      if (shouldCaptureMiddlePan(event)) {
        event.stopPropagation();
        handleCanvasMouseDown(event);
        return;
      }

      if (event.button === 0 && spacePanActive) {
        event.stopPropagation();
        handleCanvasMouseDown(event);
        return;
      }

      if (event.button === 0 && placeOnItems && selectedTool !== 'select') {
        event.stopPropagation();
        handleCanvasMouseDown(event);
        return;
      }

      handleBlurActiveElement(event);

      if (event.button !== 0) return;

      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-canvas-ui], dialog, [role="dialog"], [role="menu"]')) return;

      const clickedColumnItem = target.closest('[data-column-item="true"]');
      const clickedEditBar = target.closest('[data-edit-bar="true"]');
      const clickedInspector = target.closest('[data-item-inspector="true"]');

      if (clickedColumnItem || clickedEditBar || clickedInspector) {
        return;
      }

      clearColumnSelection();
    },
    [spacePanActive, placeOnItems, selectedTool, handleCanvasMouseDown, handleBlurActiveElement, clearColumnSelection],
  );

  const safeSelectedIds = selectedIds ?? [];
  const selectedItemIds = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => project.items.filter((item) => selectedItemIds.has(item.id)),
    [project.items, selectedItemIds],
  );
  const joinableDrawings = selectedItems;
  const canJoinDrawings =
    !selectedColumnItem &&
    joinableDrawings.length > 1 &&
    joinableDrawings.every((item) => item.type === 'drawing' && !item.locked);
  const handleJoinDrawings = () => {
    if (!canJoinDrawings) return;
    const joined = joinDrawings(joinableDrawings.filter((item) => item.type === 'drawing'));
    if (!joined) return;
    pushHistory();
    onRestoreItems([
      ...project.items
        .filter((item) => !selectedIds.includes(item.id))
        .map((item) =>
          item.type === 'line'
            ? {
                ...item,
                startItemId: item.startItemId && selectedIds.includes(item.startItemId) ? joined.id : item.startItemId,
                endItemId: item.endItemId && selectedIds.includes(item.endItemId) ? joined.id : item.endItemId,
              }
            : item,
        ),
      joined,
    ]);
    onSelectItems([joined.id]);
  };

  const { statuses } = useProjectStatuses();
  const normalizedSearch = searchQuery.trim();

  const searchActive = normalizedSearch.length > 0;
  const {
    targets: searchTargets,
    matchingIds,
    nestedColumnMatches,
    contextFrameIds,
  } = useMemo(
    () => getBoardSearchResult(project.items, normalizedSearch, statuses),
    [project.items, normalizedSearch, statuses],
  );
  const searchIndex =
    searchCursor.query === normalizedSearch ? searchTargets.findIndex(({ item }) => item.id === searchCursor.id) : -1;
  const goToSearchResult = (direction: number) => {
    if (!searchTargets.length) return;
    const index =
      searchIndex < 0
        ? direction > 0
          ? 0
          : searchTargets.length - 1
        : (searchIndex + direction + searchTargets.length) % searchTargets.length;
    const target = searchTargets[index]!;
    const parent = target.columnId ? project.items.find((item) => item.id === target.columnId) : undefined;
    let rect = getItemRect(parent ?? target.item, measuredSizes);
    if (target.columnId) {
      const element = containerRef.current?.querySelector(`[data-nested-item-id="${CSS.escape(target.item.id)}"]`);
      const container = containerRef.current?.getBoundingClientRect();
      if (element && container) {
        const bounds = element.getBoundingClientRect();
        rect = {
          ...rect,
          x: (bounds.left - container.left - panRef.current.x) / zoomRef.current,
          y: (bounds.top - container.top - panRef.current.y) / zoomRef.current,
          width: bounds.width / zoomRef.current,
          height: bounds.height / zoomRef.current,
        };
      }
      handleSelectColumnItem(target.columnId, target.item);
    } else {
      clearColumnSelection();
      onSelectItems([target.item.id]);
    }
    const nextZoom = Math.max(
      ZOOM_MIN,
      Math.min(
        1.5,
        ZOOM_MAX,
        Math.max(1, viewportSize.width - 120) / Math.max(1, rect.width),
        Math.max(1, viewportSize.height - 160) / Math.max(1, rect.height),
      ),
    );
    onZoomChange(nextZoom);
    onPanChange({
      x: viewportSize.width / 2 - (rect.x + rect.width / 2) * nextZoom,
      y: viewportSize.height / 2 - (rect.y + rect.height / 2) * nextZoom,
    });
    setSearchCursor({ query: normalizedSearch, id: target.item.id });
  };

  const { frames, regularItems, renderedItems, lockedFrameIds } = useCanvasRenderModel(
    project.items,
    dragOverrides,
    measuredSizes,
  );
  const retainedItemIds = useMemo(() => {
    const ids = new Set(selectedItemIds);
    for (const id of dragOverrides.keys()) ids.add(id);
    for (const id of frameCapturePreviewIds) ids.add(id);
    for (const id of Object.keys(remotePresence ?? {})) ids.add(id);
    if (searchActive) for (const id of matchingIds) ids.add(id);
    for (const id of [
      focusedItemId,
      selectedColumnItem?.columnId,
      customCssTarget?.columnId,
      customCssTarget?.itemId,
      attachHoverId,
      dragOverColumnId,
    ]) {
      if (id) ids.add(id);
    }
    return ids;
  }, [
    selectedItemIds,
    dragOverrides,
    frameCapturePreviewIds,
    remotePresence,
    searchActive,
    matchingIds,
    focusedItemId,
    selectedColumnItem?.columnId,
    customCssTarget,
    attachHoverId,
    dragOverColumnId,
  ]);
  const visibleItems = useMemo(
    () =>
      regularItems.filter((item) =>
        isCanvasItemVisible(
          item,
          { pan, zoom, width: viewportSize.width, height: viewportSize.height },
          measuredSizes,
          measuredItems,
          retainedItemIds,
        ),
      ),
    [regularItems, pan, zoom, viewportSize, measuredSizes, measuredItems, retainedItemIds],
  );

  // Offscreen notes use cheap content; stateful blocks retain their editor DOM behind a preview.
  const overscanPreviewIds = useMemo(
    () =>
      new Set(
        visibleItems
          .filter(
            (item) =>
              ((item.type === 'note' && Boolean(item.width && item.width > 0 && item.height && item.height > 0)) ||
                (isHeavyPreviewItem(item) && measuredItems.get(item.id) === item)) &&
              !intersectsCanvasViewport(item, { pan, zoom, ...viewportSize }, measuredSizes, 0),
          )
          .map((item) => item.id),
      ),
    [visibleItems, pan, zoom, viewportSize, measuredSizes, measuredItems],
  );

  // Measurement snapshots change gesture closures; they must not invalidate every block editor.
  const itemCallbacks = useCanvasCallbacks({
    onMouseDown: handleItemMouseDown,
    onItemResize: handleItemResize,
    onQuickConnectStart: handleQuickConnectStart,
    onLineEndpointDrag: handleLineEndpointDrag,
    onEjectFromColumn: handleEjectFromColumn,
    onSelectColumnItem: handleSelectColumnItem,
    onChecklistDropOutside: handleChecklistDropOutside,
    onKanbanCardDropOutside: handleKanbanCardDropOutside,
  });

  const cursorClass = isPanning
    ? 'cursor-grabbing'
    : spacePanActive
      ? 'cursor-grab'
      : selectedTool !== 'select'
        ? 'cursor-crosshair'
        : 'cursor-default';

  const customCssParent = project.items.find((item) => item.id === customCssTarget?.columnId);
  const customCssItem = customCssTarget?.columnId
    ? customCssParent?.type === 'column'
      ? customCssParent.items.find((item) => item.id === customCssTarget.itemId)
      : undefined
    : project.items.find((item) => item.id === customCssTarget?.itemId);
  const cssSelection = selectedColumnItem?.item ?? (selectedItems.length === 1 ? selectedItems[0] : undefined);
  const cssSelectionLocked = collaboratorLockedIds.has(selectedColumnItem?.columnId ?? cssSelection?.id ?? '');

  const inspectorItems = selectedColumnItem ? [selectedColumnItem.item] : selectedItems;

  return (
    <div
      data-canvas-root="true"
      data-camera-moving={isNavigating}
      ref={containerRef}
      className={`flex-1 min-w-0 min-h-0 relative overflow-clip select-none ${cursorClass}`}
      style={{ background: 'var(--canvas-background, var(--color-app-bg))' }}
      onMouseDownCapture={handleCanvasMouseDownCapture}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(TRASH_ITEM_MIME)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        const itemId = event.dataTransfer.getData(TRASH_ITEM_MIME);
        if (!itemId) return;
        event.preventDefault();
        const rect = event.currentTarget.getBoundingClientRect();
        onRestoreTrashItem(itemId, {
          x: snapValue((event.clientX - rect.left - panRef.current.x) / zoomRef.current),
          y: snapValue((event.clientY - rect.top - panRef.current.y) / zoomRef.current),
        });
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest(
            '[data-canvas-ui], [data-edit-bar], [data-item-inspector], [role="dialog"], [role="menu"]',
          )
        ) {
          onCursorMove?.(null);
          return;
        }
        const rect = event.currentTarget.getBoundingClientRect();
        const exactPosition = {
          x: (event.clientX - rect.left - panRef.current.x) / zoomRef.current,
          y: (event.clientY - rect.top - panRef.current.y) / zoomRef.current,
        };
        pointerPosition.current = { x: snapValue(exactPosition.x), y: snapValue(exactPosition.y) };
        onCursorMove?.({ x: Math.round(exactPosition.x * 10) / 10, y: Math.round(exactPosition.y * 10) / 10 });
      }}
      onMouseLeave={() => onCursorMove?.(null)}
      onContextMenu={(event) => {
        if (event.defaultPrevented) return;
        const target = event.target;
        if (
          !(target instanceof Element) ||
          target.closest(
            'input,textarea,select,[contenteditable="true"],[role="dialog"],[role="menu"],[data-edit-bar],[data-item-inspector]',
          )
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const id = target.closest('[data-board-item-id]')?.getAttribute('data-board-item-id');
        const childId = target.closest('[data-nested-item-id]')?.getAttribute('data-nested-item-id');
        const column = project.items.find((item) => item.id === id);
        const child = column?.type === 'column' ? column.items.find((item) => item.id === childId) : undefined;
        if (child && id) {
          selectedIdsRef.current = [];
          handleSelectColumnItem(id, child);
        } else {
          if (id && !selectedIdsRef.current.includes(id)) {
            selectedIdsRef.current = [id];
            onSelectItems([id]);
          }
          if (!id) {
            selectedIdsRef.current = [];
            onSelectItems([]);
          }
          clearColumnSelection();
        }
        onSelectTool('select');
        const rect = event.currentTarget.getBoundingClientRect();
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          canvasX: snapValue((event.clientX - rect.left - panRef.current.x) / zoomRef.current),
          canvasY: snapValue((event.clientY - rect.top - panRef.current.y) / zoomRef.current),
          hasSelection: Boolean(id),
        });
      }}
    >
      <div
        ref={camera.gridRef}
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          inset: -CANVAS_VIEWPORT_OVERSCAN,
          transformOrigin: `${viewportSize.width / 2 + CANVAS_VIEWPORT_OVERSCAN}px ${viewportSize.height / 2 + CANVAS_VIEWPORT_OVERSCAN}px`,
          willChange: 'transform',
          backgroundSize: `${CANVAS_MAJOR_GRID_SIZE * zoom}px ${CANVAS_MAJOR_GRID_SIZE * zoom}px, ${CANVAS_GRID_SIZE * zoom}px ${CANVAS_GRID_SIZE * zoom}px`,
          backgroundPosition: `${CANVAS_VIEWPORT_OVERSCAN - (CANVAS_MAJOR_GRID_SIZE * zoom) / 2}px ${CANVAS_VIEWPORT_OVERSCAN - (CANVAS_MAJOR_GRID_SIZE * zoom) / 2}px, ${CANVAS_VIEWPORT_OVERSCAN - (CANVAS_GRID_SIZE * zoom) / 2}px ${CANVAS_VIEWPORT_OVERSCAN - (CANVAS_GRID_SIZE * zoom) / 2}px`,
          contain: 'strict',
          backgroundImage:
            'radial-gradient(circle, var(--color-canvas-dot) 1.8px, transparent 2.1px), radial-gradient(circle, var(--color-canvas-dot) 0.8px, transparent 1.1px)',
        }}
      />
      {searchActive && (
        <div
          data-canvas-ui="true"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 rounded-lg border px-3 py-2 shadow-md text-xs"
          style={{
            background: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            // The edit bar is z-index 50; search navigation must remain clickable above it.
            zIndex: 60,
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <span role="status">
            {searchTargets.length ? `${searchIndex + 1} / ${searchTargets.length}` : translate('No results')}
          </span>
          <button disabled={!searchTargets.length} onClick={() => goToSearchResult(-1)} className="disabled:opacity-40">
            {translate('Previous')}
          </button>
          <button disabled={!searchTargets.length} onClick={() => goToSearchResult(1)} className="disabled:opacity-40">
            {translate('Go to next')}
          </button>
        </div>
      )}
      {pasteStyleOpen && (
        <PasteStyleDialog
          onClose={() => setPasteStyleOpen(false)}
          onPaste={(parts) => {
            if (styleClipboard) {
              pushHistory();
              if (selectedColumnItem)
                handleUpdateColumnItem(selectedColumnItem.columnId, (item) =>
                  pasteItemStyle(item, styleClipboard, parts),
                );
              else
                onRestoreItems(
                  project.items.map((item) =>
                    selectedIds.includes(item.id) ? pasteItemStyle(item, styleClipboard, parts) : item,
                  ),
                );
            }
            setPasteStyleOpen(false);
          }}
        />
      )}
      {customCssItem && customCssTarget && (
        <CustomCssDialog
          key={customCssItem.id}
          item={customCssItem}
          onClose={() => setCustomCssTarget(null)}
          onUpdate={(updater) => {
            if (collaboratorLockedIds.has(customCssTarget.columnId ?? customCssTarget.itemId)) return;
            pushHistory();
            if (customCssTarget.columnId) {
              if (selectedColumnItem?.item.id === customCssTarget.itemId)
                handleUpdateColumnItem(customCssTarget.columnId, updater);
              else
                onUpdateItem(customCssTarget.columnId, (column) =>
                  column.type === 'column'
                    ? {
                        ...column,
                        items: column.items.map((item) => (item.id === customCssTarget.itemId ? updater(item) : item)),
                      }
                    : column,
                );
            } else onUpdateItem(customCssTarget.itemId, updater);
          }}
        />
      )}
      {contextMenu && (
        <CanvasContextMenu
          onCustomCss={
            cssSelection && !cssSelectionLocked
              ? () => setCustomCssTarget({ itemId: cssSelection.id, columnId: selectedColumnItem?.columnId })
              : undefined
          }
          onCopyStyle={() => {
            const source = selectedColumnItem?.item ?? selectedItems[0];
            if (source) setStyleClipboard(copyItemStyle(source));
          }}
          canPasteStyle={!!styleClipboard}
          onPasteStyle={() => setPasteStyleOpen(true)}
          onJoinDrawings={canJoinDrawings ? handleJoinDrawings : undefined}
          menu={contextMenu}
          count={selectedColumnItem ? 1 : selectedIds.length}
          canPaste={clipboard.canPaste}
          allLocked={
            selectedColumnItem
              ? Boolean(selectedColumnItem.item.locked)
              : selectedItems.length > 0 && selectedItems.every((item) => item.locked)
          }
          onClose={closeContextMenu}
          onCopy={clipboard.copy}
          onDuplicate={clipboard.duplicate}
          onPaste={() => clipboard.paste({ x: contextMenu.canvasX, y: contextMenu.canvasY })}
          onDelete={() => {
            if (selectedColumnItem) {
              requestDelete(deleteSelectedColumnItem);
              return;
            }
            const ids = [...selectedIdsRef.current];
            requestDelete(() => {
              onDeleteItems(ids);
              onSelectItems([]);
            }, ids.length);
          }}
          onLock={() => {
            pushHistory();
            if (selectedColumnItem) {
              handleUpdateColumnItem(selectedColumnItem.columnId, (item) => ({ ...item, locked: !item.locked }));
              return;
            }
            const locked = !selectedItems.every((item) => item.locked);
            onRestoreItems(project.items.map((item) => (selectedIds.includes(item.id) ? { ...item, locked } : item)));
          }}
          onGroup={onGroupSelected}
        />
      )}
      {quickConnectMenu && (
        <QuickConnectMenu
          menu={quickConnectMenu}
          onClose={closeQuickConnectMenu}
          onCreate={(type) => {
            const size = getToolDefaultSize(type);
            const created = createCanvasItem(
              type,
              snapValue(quickConnectMenu.canvasX - size.width / 2),
              snapValue(quickConnectMenu.canvasY - size.height / 2),
            );
            if (!created) return;

            onAddItem(created);
            onUpdateItem(quickConnectMenu.lineId, (current) => {
              if (current.type !== 'line') return current;
              const centerX = created.x + size.width / 2;
              const centerY = created.y + size.height / 2;
              return quickConnectMenu.endpoint === 1
                ? { ...current, startItemId: created.id, x: centerX, y: centerY }
                : { ...current, endItemId: created.id, x2: centerX, y2: centerY };
            });
            onSelectItems([created.id]);
            closeQuickConnectMenu();
          }}
        />
      )}
      <CanvasLostPrompt
        visible={isLost && project.items.length > 0 && draggingIds.length === 0 && !toolDragGhost}
        onReturnToBoard={handleReturnToBoard}
        onGoToFirstItem={handleGoToFirstItem}
      />

      <div ref={camera.sceneRef} data-canvas-scene="true" className="absolute" style={{ transformOrigin: '0 0' }}>
        {frames.map((frame) => (
          <CanvasFrame
            key={frame.id}
            item={frame}
            projectParticipants={projectParticipants}
            movementLocked={lockedFrameIds.has(frame.id)}
            onItemResize={itemCallbacks.onItemResize}
            zoom={zoom}
            isSelected={selectedItemIds.has(frame.id)}
            isDragging={draggingIds.includes(frame.id)}
            onQuickConnectStart={itemCallbacks.onQuickConnectStart}
            isAnimating={animatingIds.has(frame.id)}
            isAttachTarget={attachHoverId === frame.id}
            selectedIds={safeSelectedIds}
            onMouseDown={itemCallbacks.onMouseDown}
            onAnimationEnd={clearEnterAnimation}
            onUpdateItem={onUpdateItem}
            onDeleteItem={onDeleteItem}
            onSelectItems={onSelectItems}
            onRequestDelete={requestDelete}
            onFitFrame={handleFitFrame}
            searchActive={searchActive}
            isSearchMatch={!searchActive || matchingIds.has(frame.id)}
            isSearchContext={contextFrameIds.has(frame.id)}
          />
        ))}

        {visibleItems.map((item) => {
          const renderedItem = renderedItems.get(item.id) ?? item;

          return (
            <CanvasItem
              key={item.id}
              item={item}
              projectParticipants={projectParticipants}
              renderedItem={renderedItem}
              measuredSize={measuredSizes.get(item.id)}
              measurementCurrent={measuredItems.get(item.id) === item}
              remotePresence={remotePresence?.[item.id]}
              collaboratorLocked={collaboratorLockedIds.has(item.id)}
              isFrameCapturePreview={frameCapturePreviewIds.includes(item.id)}
              selectedColumnItemId={
                item.type === 'column' && selectedColumnItem?.columnId === item.id ? selectedColumnItem.item.id : null
              }
              isDragging={draggingIds.includes(item.id)}
              dragTilt={draggingIds.includes(item.id) ? dragTilt : 0}
              onQuickConnectStart={itemCallbacks.onQuickConnectStart}
              zoom={item.type === 'section-title' || selectedItemIds.has(item.id) ? zoom : 1}
              lowDetail={lowDetail && !retainedItemIds.has(item.id)}
              motionPreview={(isNavigating || overscanPreviewIds.has(item.id)) && !retainedItemIds.has(item.id)}
              scrollPositions={scrollPositions.current}
              isSelected={selectedItemIds.has(item.id)}
              isAttachTarget={attachHoverId === item.id}
              isDragOver={dragOverColumnId === item.id}
              isAnimating={animatingIds.has(item.id)}
              selectedIds={safeSelectedIds}
              onMouseDown={itemCallbacks.onMouseDown}
              onAnimationEnd={clearEnterAnimation}
              onResize={handleMeasuredItemResize}
              onFocusItem={setFocusedItemId}
              onItemResize={itemCallbacks.onItemResize}
              onUpdateItem={onUpdateItem}
              onDeleteItem={onDeleteItem}
              onSelectItems={onSelectItems}
              onRequestDelete={requestDelete}
              onLineEndpointDrag={itemCallbacks.onLineEndpointDrag}
              onEjectFromColumn={itemCallbacks.onEjectFromColumn}
              onSelectColumnItem={itemCallbacks.onSelectColumnItem}
              onChecklistDropOutside={itemCallbacks.onChecklistDropOutside}
              onKanbanCardDropOutside={itemCallbacks.onKanbanCardDropOutside}
              searchActive={searchActive}
              isSearchMatch={!searchActive || matchingIds.has(item.id)}
              nestedSearchMatchIds={item.type === 'column' ? nestedColumnMatches.get(item.id) : undefined}
              onOpenBoard={onOpenBoard}
              onRenameBoard={onRenameBoard}
            />
          );
        })}

        <CanvasAlignmentGuides guides={alignmentGuides} />

        {dropPreview && (
          <CanvasDropPreview
            x={dropPreview.x}
            y={dropPreview.y}
            width={dropPreview.width}
            height={dropPreview.height}
            label={alignmentGuides.length > 0 ? translate('Aligned') : translate('Grid snap')}
          />
        )}

        {toolDropPreview && (
          <CanvasDropPreview
            x={toolDropPreview.x}
            y={toolDropPreview.y}
            width={toolDropPreview.width}
            height={toolDropPreview.height}
            label={translate('Place here')}
          />
        )}

        {drawingDraft && (
          <svg
            className="absolute top-0 left-0 overflow-visible pointer-events-none"
            width="1"
            height="1"
            style={{ zIndex: 100000 }}
          >
            <path d={drawingOutline(drawingDraft, 3)} fill="#7C3AED" />
          </svg>
        )}
        <CanvasOverlays frameDraft={frameDraft} lasso={lasso} />
      </div>

      <RemoteCursors cursors={remoteCursors} pan={pan} zoom={zoom} />

      {selectedTool === 'drawing' && (
        <div className="absolute inset-0 z-40 cursor-crosshair" aria-label={translate('Drawing surface')} />
      )}
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
          payload={nestedDragGhost.payload}
          clientX={nestedDragGhost.clientX}
          clientY={nestedDragGhost.clientY}
        />
      )}

      <ItemInspector
        items={inspectorItems}
        onUpdateAll={(updater) => {
          if (selectedColumnItem) {
            handleUpdateColumnItem(selectedColumnItem.columnId, updater);

            return;
          }

          /*
           * Canvas multi-selection.
           */
          for (const selectedItem of selectedItems) {
            if (!collaboratorLockedIds.has(selectedItem.id)) onUpdateItem(selectedItem.id, updater);
          }
        }}
        onClose={() => {
          onSelectItems([]);
          clearColumnSelection();
        }}
      />

      <CanvasEditBar
        frameControls={
          selectedItems.length > 0 && selectedItems.every((item) => item.type !== 'frame') ? (
            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
              {translate('Frame')}
              <select
                aria-label={translate('Assign to frame')}
                className="h-8 max-w-40 rounded-sm px-2"
                style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }}
                disabled={selectedItems.some((item) => item.locked)}
                value={
                  selectedItems.every((item) => item.frameId === selectedItems[0]!.frameId)
                    ? (selectedItems[0]!.frameId ?? '')
                    : '__mixed'
                }
                onChange={(event) => {
                  const frameId = event.target.value || null;
                  pushHistory();
                  onRestoreItems(
                    project.items.map((item) =>
                      safeSelectedIds.includes(item.id) && !item.locked ? { ...item, frameId } : item,
                    ),
                  );
                }}
              >
                <option value="__mixed" disabled>
                  {translate('Mixed frames')}
                </option>
                <option value="">{translate('No frame')}</option>
                {project.items
                  .filter(
                    (item): item is FrameItem =>
                      item.type === 'frame' &&
                      selectedItems.every(
                        (selected) =>
                          selected.id !== item.id && !wouldCreateFrameCycle(selected.id, item.id, project.items),
                      ),
                  )
                  .map((frame) => (
                    <option key={frame.id} value={frame.id}>
                      {frame.title || translate('Frame')} · {frame.id.slice(0, 4)}
                    </option>
                  ))}
              </select>
            </label>
          ) : selectedItems.length === 1 && selectedItems[0]!.type === 'frame' ? (
            <button
              className="h-8 px-2 text-sm hover:bg-violet-500/20"
              disabled={selectedItems[0]!.locked}
              title={translate('Assign enclosed unlocked items to this frame, including items owned by another frame')}
              onClick={() => {
                const frame = selectedItems[0]!;
                if (frame.type !== 'frame') return;
                pushHistory();
                onRestoreItems(
                  project.items.map((item) =>
                    item.id !== frame.id && !item.locked && isItemInsideFrame(item, frame, measuredSizes)
                      ? { ...item, frameId: frame.id }
                      : item,
                  ),
                );
              }}
            >
              {translate('Take over enclosed items')}
            </button>
          ) : undefined
        }
        onJoinDrawings={canJoinDrawings ? handleJoinDrawings : undefined}
        selectedItems={selectedItems.map((item) =>
          item.type === 'line' ? resolveLineItem(item, project.items, measuredSizes) : item,
        )}
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
              ? translate('Delete {{value1}} items?', { value1: pendingDelete.count })
              : translate('Delete this item?')
          }
          message={translate("The item will move to this project's trash and can be restored later.")}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}

      <CanvasHints
        selectedTool={selectedTool}
        hasSelection={safeSelectedIds.length > 0 || selectedColumnItem !== null}
      />

      <CanvasEmptyState visible={project.items.length === 0 && selectedTool === 'select'} />

      <CanvasControls
        onOpenTrash={onOpenTrash}
        onOpenMenu={() => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          setContextMenu({
            x: rect.right - 240,
            y: rect.bottom - 420,
            canvasX: snapValue((centerX - panRef.current.x) / zoomRef.current),
            canvasY: snapValue((centerY - panRef.current.y) / zoomRef.current),
            hasSelection: inspectorItems.length > 0,
          });
        }}
        zoom={zoom}
        getZoom={getLiveZoom}
        snapEnabled={snapEnabled}
        placeOnItems={placeOnItems}
        onZoomChange={(nextZoom) => {
          const centerX = viewportSize.width / 2;
          const centerY = viewportSize.height / 2;
          onPanChange({
            x: centerX - (centerX - panRef.current.x) * (nextZoom / zoomRef.current),
            y: centerY - (centerY - panRef.current.y) * (nextZoom / zoomRef.current),
          });
          onZoomChange(nextZoom);
        }}
        onFitView={handleReturnToBoard}
        selectionMode={touchSelectionMode}
        onToggleSelectionMode={() => setTouchSelectionMode((current) => !current)}
        onUndo={undo}
        onToggleSnap={() => setSnapEnabled((previous) => !previous)}
        onTogglePlaceOnItems={() => setPlaceOnItems((previous) => !previous)}
      />
    </div>
  );
}

const MemoCanvasContent = memo(CanvasContent);

export default function Canvas(props: CanvasProps) {
  const { snapshot, camera, isNavigating } = useCanvasCamera(props.pan, props.zoom);
  return (
    <MemoCanvasContent {...props} pan={snapshot.pan} zoom={snapshot.zoom} camera={camera} isNavigating={isNavigating} />
  );
}
