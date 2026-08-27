import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  BoardItem,
  LineItem,
} from '@/entities/board/types';

import type {
  Project,
} from '@/entities/project/types';

import type {
  ToolType,
} from '@/entities/board/toolTypes';

import EditBar from '@/layout/EditBar';

import ConfirmDialog from '@/shared/components/dialogs/ConfirmDialog';

import CanvasFrame from '@/features/canvas/components/CanvasFrame';
import CanvasItem from '@/features/canvas/components/CanvasItem';
import CanvasControls from '@/features/canvas/components/CanvasControls';
import CanvasOverlays from '@/features/canvas/components/CanvasOverlays';

import {
  CANVAS_GRID_SIZE,
  ZOOM_MAX,
  ZOOM_MIN,
} from '@/features/canvas/constants';

import {
  resolveLineItem,
} from '@/features/canvas/utils/lineGeometry';

import {
  useCanvasHistory,
} from '@/features/canvas/hooks/useCanvasHistory';

import {
  useCanvasMeasurements,
} from '@/features/canvas/hooks/useCanvasMeasurements';

import {
  useItemResize,
} from '@/features/canvas/hooks/useItemResize';

import {
  useLineDrag,
} from '@/features/canvas/hooks/useLineDrag';

import {
  useCrossItemDrop,
} from '@/features/canvas/hooks/useCrossItemDrop';

import {
  useCanvasKeyboard,
} from '@/features/canvas/hooks/useCanvasKeyboard';

import {
  useItemAnimation,
} from '@/features/canvas/hooks/useItemAnimation';

import {
  useItemDrag,
} from '@/features/canvas/hooks/useItemDrag';

import {
  useCanvasMouse,
} from '@/features/canvas/hooks/useCanvasMouse';

import {
  useFrameActions,
} from '@/features/canvas/hooks/useFrameActions';

interface CanvasProps {
  project: Project;

  selectedTool: ToolType;

  pan: {
    x: number;
    y: number;
  };

  zoom: number;

  selectedIds: string[];

  onPanChange: (
    pan: {
      x: number;
      y: number;
    },
  ) => void;

  onZoomChange: (
    zoom: number,
  ) => void;

  onSelectTool: (
    tool: ToolType,
  ) => void;

  onSelectItems: (
    ids: string[],
  ) => void;

  onGroupSelected:
  () => void;

  onAddItem: (
    item: BoardItem,
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

  onDeleteItems: (
    ids: string[],
  ) => void;

  onBringToFront: (
    id: string,
  ) => void;

  onDropOnColumn: (
    itemId: string,
    columnId: string,
  ) => void;

  onEjectFromColumn: (
    columnId: string,
    ejectedItem: BoardItem,
  ) => void;

  onRestoreItems: (
    items: BoardItem[],
  ) => void;
}

interface SelectedColumnItem {
  columnId: string;
  item: BoardItem;
}

interface PendingDelete {
  execute: () => void;
  count: number;
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
  const containerRef =
    useRef<HTMLDivElement>(
      null,
    );

  const [
    selectedColumnItem,
    setSelectedColumnItem,
  ] =
    useState<SelectedColumnItem | null>(
      null,
    );

  const [
    pendingDelete,
    setPendingDelete,
  ] =
    useState<PendingDelete | null>(
      null,
    );

  const [
    snapEnabled,
    setSnapEnabled,
  ] = useState(true);

  const panRef =
    useRef(pan);

  panRef.current = pan;

  const zoomRef =
    useRef(zoom);

  zoomRef.current =
    zoom;

  const projectRef =
    useRef(project);

  projectRef.current =
    project;

  const selectedIdsRef =
    useRef(
      selectedIds ?? [],
    );

  selectedIdsRef.current =
    selectedIds ?? [];

  const selectedColumnItemRef =
    useRef(
      selectedColumnItem,
    );

  selectedColumnItemRef.current =
    selectedColumnItem;

  const snapValue =
    useCallback(
      (
        value: number,
      ): number => {
        if (!snapEnabled) {
          return value;
        }

        return (
          Math.round(
            value /
            CANVAS_GRID_SIZE,
          ) *
          CANVAS_GRID_SIZE
        );
      },
      [snapEnabled],
    );

  const screenToCanvas =
    useCallback(
      (
        screenX: number,
        screenY: number,
      ) => ({
        x:
          (
            screenX -
            pan.x
          ) /
          zoom,

        y:
          (
            screenY -
            pan.y
          ) /
          zoom,
      }),
      [
        pan,
        zoom,
      ],
    );

  const {
    animatingIds,
    triggerEnterAnimation,
    clearEnterAnimation,
  } =
    useItemAnimation();

  const getCurrentItems =
    useCallback(
      () =>
        projectRef.current
          .items,
      [],
    );

  const {
    pushHistory,
    undo,
  } =
    useCanvasHistory({
      getItems:
        getCurrentItems,

      restoreItems:
        onRestoreItems,
    });

  const requestDelete =
    useCallback(
      (
        execute: () => void,
        count = 1,
      ) => {
        setPendingDelete({
          execute,
          count,
        });
      },
      [],
    );

  const confirmDelete =
    useCallback(() => {
      setPendingDelete(
        previous => {
          if (previous) {
            pushHistory();

            previous.execute();
          }

          return null;
        },
      );
    }, [pushHistory]);

  const cancelDelete =
    useCallback(() => {
      setPendingDelete(
        null,
      );
    }, []);

  const {
    measuredSizes,
    handleItemResize,
  } =
    useCanvasMeasurements({
      projectRef,
      onUpdateItem,
    });

  const {
    handleFrameResize,
    handleBlockResize,
  } =
    useItemResize({
      zoomRef,
      snapValue,
      pushHistory,
      onUpdateItem,
    });

  const {
    attachHoverId,
    handleLineEndpointDrag,
  } =
    useLineDrag({
      projectRef,
      zoomRef,
      measuredSizes,
      pushHistory,
      onUpdateItem,
    });

  const clearColumnSelection =
    useCallback(() => {
      setSelectedColumnItem(
        null,
      );
    }, []);

  const handleUpdateColumnItem =
    useCallback(
      (
        columnId: string,

        updater: (
          item: BoardItem,
        ) => BoardItem,
      ) => {
        const current =
          selectedColumnItemRef.current;

        if (
          !current ||
          current.columnId !==
          columnId
        ) {
          return;
        }

        const itemId =
          current.item.id;

        setSelectedColumnItem(
          previous =>
            previous
              ? {
                ...previous,
                item:
                  updater(
                    previous.item,
                  ),
              }
              : null,
        );

        onUpdateItem(
          columnId,

          column => {
            if (
              column.type !==
              'column'
            ) {
              return column;
            }

            return {
              ...column,

              items:
                column.items.map(
                  item =>
                    item.id ===
                      itemId
                      ? updater(
                        item,
                      )
                      : item,
                ),
            };
          },
        );
      },
      [
        onUpdateItem,
      ],
    );

  const {
    dragOverColumnId,
    handleItemMouseDown,
  } =
    useItemDrag({
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

  const {
    frameDraft,
    lasso,
    handleCanvasMouseDown,
  } =
    useCanvasMouse({
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
  } =
    useCrossItemDrop({
      containerRef,
      projectRef,

      measuredSizes,

      screenToCanvas,

      onUpdateItem,
    });

  const {
    handleFitFrame,
  } =
    useFrameActions({
      items:
        project.items,

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

  useEffect(() => {
    const element =
      containerRef.current;

    if (!element) {
      return;
    }

    const handleWheel = (
      event: WheelEvent,
    ) => {
      event.preventDefault();

      const rect =
        element.getBoundingClientRect();

      const mouseX =
        event.clientX -
        rect.left;

      const mouseY =
        event.clientY -
        rect.top;

      const currentZoom =
        zoomRef.current;

      const currentPan =
        panRef.current;

      const factor =
        event.ctrlKey ||
          event.metaKey
          ? 1 -
          event.deltaY *
          0.008
          : event.deltaY > 0
            ? 0.92
            : 1 / 0.92;

      const nextZoom =
        Math.min(
          ZOOM_MAX,

          Math.max(
            ZOOM_MIN,

            Number(
              (
                currentZoom *
                factor
              ).toFixed(4),
            ),
          ),
        );

      onPanChange({
        x:
          mouseX -
          (
            mouseX -
            currentPan.x
          ) *
          (
            nextZoom /
            currentZoom
          ),

        y:
          mouseY -
          (
            mouseY -
            currentPan.y
          ) *
          (
            nextZoom /
            currentZoom
          ),
      });

      onZoomChange(
        nextZoom,
      );
    };

    element.addEventListener(
      'wheel',
      handleWheel,
      {
        passive: false,
      },
    );

    return () => {
      element.removeEventListener(
        'wheel',
        handleWheel,
      );
    };
  }, [
    onPanChange,
    onZoomChange,
  ]);

  const handleBlurActiveElement =
    useCallback(
      (
        event:
          React.MouseEvent,
      ) => {
        if (
          event.button !== 0
        ) {
          return;
        }

        const active =
          document.activeElement;

        if (
          !(
            active instanceof
            HTMLElement
          ) ||
          active ===
          document.body
        ) {
          return;
        }

        if (
          active.contains(
            event.target as Node,
          )
        ) {
          return;
        }

        active.blur();
      },
      [],
    );

  const handleSelectColumnItem =
    useCallback(
      (
        columnId: string,
        item: BoardItem | null,
      ) => {
        if (!item) {
          setSelectedColumnItem(
            null,
          );

          return;
        }

        setSelectedColumnItem({
          columnId,
          item,
        });

        onSelectItems([]);
      },
      [
        onSelectItems,
      ],
    );

  const safeSelectedIds =
    selectedIds ?? [];

  const selectedItems =
    project.items.filter(
      item =>
        safeSelectedIds.includes(
          item.id,
        ),
    );

  const frames =
    project.items.filter(
      item =>
        item.type ===
        'frame',
    );

  const regularItems =
    project.items
      .filter(
        item =>
          item.type !==
          'frame',
      )
      .sort(
        (a, b) =>
          a.zIndex -
          b.zIndex,
      );

  const dotInterval =
    CANVAS_GRID_SIZE *
    zoom;

  const backgroundX =
    (
      (
        pan.x %
        dotInterval
      ) +
      dotInterval
    ) %
    dotInterval;

  const backgroundY =
    (
      (
        pan.y %
        dotInterval
      ) +
      dotInterval
    ) %
    dotInterval;

  const cursorClass =
    selectedTool !==
      'select'
      ? 'cursor-crosshair'
      : 'cursor-default';

  return (
    <div
      ref={containerRef}
      className={`
        flex-1
        relative
        overflow-hidden
        select-none
        ${cursorClass}
      `}
      style={{
        backgroundColor:
          'var(--color-app-bg)',

        backgroundImage:
          'radial-gradient(circle, var(--color-canvas-dot) 1.2px, transparent 1.5px)',

        backgroundSize:
          `${dotInterval}px ${dotInterval}px`,

        backgroundPosition:
          `${backgroundX}px ${backgroundY}px`,
      }}
      onMouseDownCapture={
        handleBlurActiveElement
      }
      onMouseDown={
        handleCanvasMouseDown
      }
    >
      <div
        className="absolute"
        style={{
          transform:
            `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,

          transformOrigin:
            '0 0',
        }}
      >
        {frames.map(
          frame => (
            <CanvasFrame
              key={frame.id}
              item={frame}
              zoom={zoom}
              isSelected={
                safeSelectedIds.includes(
                  frame.id,
                )
              }
              isAnimating={
                animatingIds.has(
                  frame.id,
                )
              }
              selectedIds={
                safeSelectedIds
              }
              onMouseDown={
                handleItemMouseDown
              }
              onAnimationEnd={
                clearEnterAnimation
              }
              onUpdateItem={
                onUpdateItem
              }
              onDeleteItem={
                onDeleteItem
              }
              onSelectItems={
                onSelectItems
              }
              onRequestDelete={
                requestDelete
              }
              onFrameResize={
                handleFrameResize
              }
              onFitFrame={
                handleFitFrame
              }
            />
          ),
        )}

        {regularItems.map(
          item => {
            const renderedItem =
              item.type ===
                'line'
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
                renderedItem={
                  renderedItem
                }
                zoom={zoom}
                isSelected={
                  safeSelectedIds.includes(
                    item.id,
                  )
                }
                isAttachTarget={
                  attachHoverId ===
                  item.id
                }
                isDragOver={
                  dragOverColumnId ===
                  item.id
                }
                isAnimating={
                  animatingIds.has(
                    item.id,
                  )
                }
                selectedIds={
                  safeSelectedIds
                }
                onMouseDown={
                  handleItemMouseDown
                }
                onAnimationEnd={
                  clearEnterAnimation
                }
                onResize={
                  handleItemResize
                }
                onUpdateItem={
                  onUpdateItem
                }
                onDeleteItem={
                  onDeleteItem
                }
                onSelectItems={
                  onSelectItems
                }
                onRequestDelete={
                  requestDelete
                }
                onBlockResize={
                  handleBlockResize
                }
                onLineEndpointDrag={
                  handleLineEndpointDrag
                }
                onEjectFromColumn={
                  onEjectFromColumn
                }
                onSelectColumnItem={
                  handleSelectColumnItem
                }
                onChecklistDropOutside={
                  handleChecklistDropOutside
                }
                onKanbanCardDropOutside={
                  handleKanbanCardDropOutside
                }
                pushHistory={
                  pushHistory
                }
              />
            );
          },
        )}

        <CanvasOverlays
          frameDraft={
            frameDraft
          }
          lasso={lasso}
        />
      </div>

      {(
        safeSelectedIds.length >
        0 ||
        selectedColumnItem
      ) && (
          <EditBar
            selectedItems={
              selectedItems
            }
            onUpdateItem={
              onUpdateItem
            }
            onDeleteItems={
              ids =>
                requestDelete(
                  () => {
                    onDeleteItems(
                      ids,
                    );

                    onSelectItems(
                      [],
                    );
                  },
                  ids.length,
                )
            }
            onGroupItems={() => {
              pushHistory();

              onGroupSelected();
            }}
            onFitFrame={
              handleFitFrame
            }
            onClose={() => {
              onSelectItems([]);

              setSelectedColumnItem(
                null,
              );
            }}
            columnItem={
              selectedColumnItem
                ?.item
            }
            onUpdateColumnItem={
              selectedColumnItem
                ? updater =>
                  handleUpdateColumnItem(
                    selectedColumnItem.columnId,
                    updater,
                  )
                : undefined
            }
            onDeleteColumnItem={
              selectedColumnItem
                ? () =>
                  requestDelete(
                    () => {
                      onUpdateItem(
                        selectedColumnItem.columnId,

                        column => {
                          if (
                            column.type !==
                            'column'
                          ) {
                            return column;
                          }

                          return {
                            ...column,

                            items:
                              column.items.filter(
                                item =>
                                  item.id !==
                                  selectedColumnItem
                                    .item
                                    .id,
                              ),
                          };
                        },
                      );

                      setSelectedColumnItem(
                        null,
                      );
                    },
                  )
                : undefined
            }
          />
        )}

      {pendingDelete && (
        <ConfirmDialog
          title={
            pendingDelete.count >
              1
              ? `Delete ${pendingDelete.count} items?`
              : 'Delete this item?'
          }
          message="This can't be undone."
          onConfirm={
            confirmDelete
          }
          onCancel={
            cancelDelete
          }
        />
      )}

      {selectedTool !==
        'select' && (
          <div
            className="
            absolute
            left-1/2
            -translate-x-1/2
            pointer-events-none
            hint-pulse
          "
          >
            <div
              className="
              flex
              items-center
              gap-2
              px-5
              py-2.5
              rounded-full
              text-sm
              shadow-lg
            "
              style={{
                backgroundColor:
                  'var(--color-surface-translucent)',

                border:
                  '1px solid rgba(124, 58, 237,0.3)',

                color:
                  'var(--color-accent)',

                backdropFilter:
                  'blur(8px)',
              }}
            >
              {selectedTool ===
                'frame'
                ? 'Drag to draw a frame — items inside will move with it'
                : `Click to place ${selectedTool}`}

              <span
                className="text-xs"
                style={{
                  color:
                    'var(--color-text-muted)',
                }}
              >
                ESC to cancel
              </span>
            </div>
          </div>
        )}

      {selectedTool ===
        'select' &&
        safeSelectedIds.length ===
        0 && (
          <div
            className="
              absolute
              left-1/2
              -translate-x-1/2
              pointer-events-none
            "
          >
            <div
              className="
                flex
                items-center
                gap-2
                px-4
                py-2
                rounded-full
                text-xs
                shadow-sm
                opacity-40
              "
              style={{
                backgroundColor:
                  'var(--color-surface-translucent)',

                color:
                  'var(--color-text-secondary)',

                backdropFilter:
                  'blur(4px)',
              }}
            >
              Middle-click drag to pan · Scroll to zoom
            </div>
          </div>
        )}

      {project.items.length ===
        0 &&
        selectedTool ===
        'select' && (
          <div
            className="
              absolute
              inset-0
              flex
              items-center
              justify-center
              pointer-events-none
            "
          >
            <div
              className="text-center"
              style={{
                animation:
                  'fade-in 0.4s ease forwards',
              }}
            >
              <div
                className="
                  w-16
                  h-16
                  rounded-3xl
                  flex
                  items-center
                  justify-center
                  mx-auto
                  mb-4
                "
                style={{
                  backgroundColor:
                    'rgba(255,255,255,0.7)',

                  border:
                    '1px solid rgba(0,0,0,0.1)',

                  boxShadow:
                    '0 2px 12px rgba(0,0,0,0.06)',
                }}
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <rect
                    x="3"
                    y="3"
                    width="9"
                    height="9"
                    rx="1.5"
                    fill="rgba(0,0,0,0.12)"
                  />

                  <rect
                    x="14"
                    y="3"
                    width="9"
                    height="9"
                    rx="1.5"
                    fill="rgba(0,0,0,0.08)"
                  />

                  <rect
                    x="3"
                    y="14"
                    width="9"
                    height="9"
                    rx="1.5"
                    fill="rgba(0,0,0,0.08)"
                  />

                  <rect
                    x="14"
                    y="14"
                    width="9"
                    height="9"
                    rx="1.5"
                    fill="rgba(0,0,0,0.05)"
                  />
                </svg>
              </div>

              <p
                className="text-sm mb-1"
                style={{
                  color:
                    'var(--color-text-secondary)',
                }}
              >
                Empty board
              </p>

              <p
                className="text-xs"
                style={{
                  color:
                    'var(--color-text-muted)',
                }}
              >
                Select a tool from the sidebar to get started
              </p>
            </div>
          </div>
        )}

      <CanvasControls
        zoom={zoom}
        snapEnabled={
          snapEnabled
        }
        onZoomChange={
          onZoomChange
        }
        onPanChange={
          onPanChange
        }
        onToggleSnap={() =>
          setSnapEnabled(
            previous =>
              !previous,
          )
        }
      />
    </div>
  );
}