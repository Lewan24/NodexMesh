import { useEffect, useRef, type RefObject } from 'react';
import type { ToolType } from '@/entities/board/toolTypes';
import { ZOOM_MAX, ZOOM_MIN } from '../constants';

type Point = { x: number; y: number };

interface TouchOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  panRef: RefObject<Point>;
  zoomRef: RefObject<number>;
  selectedTool: ToolType;
  selectionMode: boolean;
  onPanChange: (pan: Point) => void;
  onZoomChange: (zoom: number) => void;
}

const nativeControls =
  '[data-canvas-ui], [data-edit-bar], [data-item-inspector], [role="dialog"], [role="menu"], ' +
  'button, input, textarea, select, a, [contenteditable="true"], [data-wheel-scroll="true"]';

const HOLD_TO_MOVE_MS = 400;
const MOVEMENT_THRESHOLD = 6;

/**
 * Adapts a single touch to the existing mouse drag pipeline (including nested
 * blocks and resize handles). Camera gestures stay separate from item editing.
 * A quick swipe pans over items; holding an unlocked item arms its drag.
 * Explicit drag and resize handles remain immediate. Pinching cancels the hold.
 */
export function useCanvasTouch(options: TouchOptions) {
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => attachCanvasTouch(latest), [options.containerRef]);
}

/** Installs the gesture listeners separately so their lifecycle can be tested. */
export function attachCanvasTouch(latest: RefObject<TouchOptions>) {
  const element = latest.current.containerRef.current;
  if (!element) return;

  let target: Element | null = null;
  let start: Point = { x: 0, y: 0 };
  let last = start;
  let startPan = start;
  let dragging = false;
  let panning = false;
  let pinching = false;
  let moved = false;
  let held = false;
  let startedAt = 0;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let heldItem: Element | null = null;
  let distance = 1;
  let initialZoom = 1;
  let anchor = start;
  let lastTap = { target: null as Element | null, time: 0 };

  const clearHold = () => {
    if (holdTimer !== null) clearTimeout(holdTimer);
    holdTimer = null;
    heldItem?.removeAttribute('data-touch-move-ready');
    heldItem = null;
  };

  const mouse = (type: string, point: Point, destination: EventTarget = document) => {
    destination.dispatchEvent(
      new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: point.x,
        clientY: point.y,
        button: 0,
        buttons: type === 'mouseup' ? 0 : 1,
        shiftKey: latest.current.selectionMode,
      }),
    );
  };

  const finishDrag = () => {
    if (dragging) mouse('mouseup', last);
    dragging = false;
  };

  const geometry = (touches: TouchList) => {
    const first = touches[0]!;
    const second = touches[1]!;
    const rect = element.getBoundingClientRect();
    return {
      x: (first.clientX + second.clientX) / 2 - rect.left,
      y: (first.clientY + second.clientY) / 2 - rect.top,
      distance: Math.max(1, Math.hypot(first.clientX - second.clientX, first.clientY - second.clientY)),
    };
  };

  const begin = (event: TouchEvent) => {
    const eventTarget = event.target;
    if (!(eventTarget instanceof Element)) return;
    const isCanvasControl = eventTarget.closest('[data-canvas-ui], dialog, [role="dialog"], [role="menu"]');
    if (isCanvasControl) return;
    const isDragHandle = eventTarget.closest('[data-touch-drag], [data-manual-resize]');
    if (event.touches.length === 1 && eventTarget.closest(nativeControls) && !isDragHandle && !target) return;

    if (event.touches.length >= 2) {
      event.preventDefault();
      lastTap = { target: null, time: 0 };
      clearHold();
      finishDrag();
      const center = geometry(event.touches);
      const { panRef, zoomRef } = latest.current;
      initialZoom = zoomRef.current;
      distance = center.distance;
      anchor = { x: (center.x - panRef.current.x) / initialZoom, y: (center.y - panRef.current.y) / initialZoom };
      pinching = true;
      target = eventTarget;
      return;
    }

    if (pinching) return;
    event.preventDefault();
    target = eventTarget;
    const touch = event.touches[0]!;
    start = { x: touch.clientX, y: touch.clientY };
    last = start;
    moved = false;
    held = false;
    startedAt = event.timeStamp;
    clearHold();
    startPan = { ...latest.current.panRef.current };
    const item = target.closest('[data-board-item]');
    const locked = item?.getAttribute('data-movement-locked') === 'true';
    const selecting = latest.current.selectedTool === 'select';

    // Selection mode still allows a marquee on empty space. Swiping over a
    // block always pans, so even a frame covering the viewport can be crossed.
    panning = selecting && (locked || (!isDragHandle && (Boolean(item) || !latest.current.selectionMode)));

    if (selecting && item && !locked && !isDragHandle) {
      holdTimer = setTimeout(() => {
        holdTimer = null;
        if (!target || moved || pinching || !item.isConnected) return;
        if (item.getAttribute('data-movement-locked') === 'true') return;
        panning = false;
        held = true;
        lastTap = { target: null, time: 0 };
        heldItem = item;
        item.setAttribute('data-touch-move-ready', 'true');
      }, HOLD_TO_MOVE_MS);
    }
  };

  const move = (event: TouchEvent) => {
    if (!target) return;
    event.preventDefault();
    if (pinching) {
      if (event.touches.length < 2) return;
      const center = geometry(event.touches);
      const zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, (initialZoom * center.distance) / distance));
      const pan = { x: center.x - anchor.x * zoom, y: center.y - anchor.y * zoom };
      latest.current.panRef.current = pan;
      latest.current.zoomRef.current = zoom;
      latest.current.onPanChange(pan);
      latest.current.onZoomChange(zoom);
      return;
    }

    const touch = event.touches[0]!;
    last = { x: touch.clientX, y: touch.clientY };
    if (Math.hypot(last.x - start.x, last.y - start.y) < MOVEMENT_THRESHOLD && !dragging && !moved) return;
    clearHold();
    moved = true;
    lastTap = { target: null, time: 0 };
    if (panning) {
      const pan = { x: startPan.x + last.x - start.x, y: startPan.y + last.y - start.y };
      latest.current.panRef.current = pan;
      latest.current.onPanChange(pan);
    } else {
      if (!dragging) {
        mouse('mousedown', start, target);
        dragging = true;
      }
      mouse('mousemove', last);
    }
  };

  const end = (event: TouchEvent) => {
    if (!target) return;
    event.preventDefault();
    clearHold();
    if (pinching && event.touches.length > 0 && event.type !== 'touchcancel') return;
    if (
      !pinching &&
      !dragging &&
      !moved &&
      !held &&
      event.timeStamp - startedAt < HOLD_TO_MOVE_MS &&
      event.type !== 'touchcancel' &&
      Math.hypot(last.x - start.x, last.y - start.y) < MOVEMENT_THRESHOLD
    ) {
      mouse('mousedown', start, target);
      mouse('mouseup', start);
      mouse('click', start, target);
      if (lastTap.target === target && event.timeStamp - lastTap.time < 350) {
        mouse('dblclick', start, target);
        lastTap = { target: null, time: 0 };
      } else {
        lastTap = { target, time: event.timeStamp };
      }
    } else {
      lastTap = { target: null, time: 0 };
    }
    finishDrag();
    target = null;
    pinching = false;
  };

  const cancel = () => {
    lastTap = { target: null, time: 0 };
    clearHold();
    finishDrag();
    target = null;
    pinching = false;
  };

  const preventNativeHoldMenu = (event: Event) => {
    if (target) event.preventDefault();
  };

  element.addEventListener('touchstart', begin, { passive: false });
  element.addEventListener('touchmove', move, { passive: false });
  element.addEventListener('touchend', end, { passive: false });
  element.addEventListener('touchcancel', end, { passive: false });
  window.addEventListener('blur', cancel);
  element.addEventListener('contextmenu', preventNativeHoldMenu);
  return () => {
    cancel();
    element.removeEventListener('touchstart', begin);
    element.removeEventListener('touchmove', move);
    element.removeEventListener('touchend', end);
    element.removeEventListener('touchcancel', end);
    window.removeEventListener('blur', cancel);
    element.removeEventListener('contextmenu', preventNativeHoldMenu);
  };
}
