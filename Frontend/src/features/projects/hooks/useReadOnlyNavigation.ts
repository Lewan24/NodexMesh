import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { ZOOM_MAX, ZOOM_MIN } from '@/features/canvas/constants';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
export function zoomCamera(camera: Camera, zoom: number, point: { x: number; y: number }): Camera {
  const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
  return {
    x: point.x - ((point.x - camera.x) * next) / camera.zoom,
    y: point.y - ((point.y - camera.y) * next) / camera.zoom,
    zoom: next,
  };
}

export function useReadOnlyNavigation() {
  const viewport = useRef<HTMLDivElement>(null);
  const [touchMode, setTouchMode] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const current = useRef(camera);
  const frame = useRef<number | null>(null);
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const moved = useRef(false);
  const [dragging, setDragging] = useState(false);
  const update = useCallback((next: Camera) => {
    current.current = next;
    if (frame.current === null)
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setCamera(current.current);
      });
  }, []);
  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)');
    const change = () => setTouchMode(media.matches);
    media.addEventListener('change', change);
    return () => {
      media.removeEventListener('change', change);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);
  useEffect(() => {
    const element = viewport.current;
    if (!element || touchMode) return;
    const wheel = (event: WheelEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-wheel-scroll="true"]') &&
        !event.ctrlKey &&
        !event.metaKey
      )
        return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const factor =
        event.ctrlKey || event.metaKey ? Math.exp(-event.deltaY * 0.008) : event.deltaY > 0 ? 0.92 : 1 / 0.92;
      update(
        zoomCamera(current.current, current.current.zoom * factor, {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        }),
      );
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => element.removeEventListener('wheel', wheel);
  }, [touchMode, update]);
  const zoomBy = (factor: number) => {
    const element = viewport.current;
    if (!element) return;
    if (touchMode)
      update({ ...current.current, zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current.current.zoom * factor)) });
    else
      update(
        zoomCamera(current.current, current.current.zoom * factor, {
          x: element.clientWidth / 2,
          y: element.clientHeight / 2,
        }),
      );
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== event.pointerId) return;
    drag.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return {
    viewport,
    camera,
    touchMode,
    dragging,
    zoomBy,
    reset: () => {
      update({ x: 0, y: 0, zoom: 1 });
      viewport.current?.scrollTo(0, 0);
    },
    pointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (touchMode || event.pointerType === 'touch' || ![0, 1].includes(event.button)) return;
      moved.current = false;
      if (
        event.target instanceof Element &&
        event.target.closest(
          'a, button, input, select, textarea, video, audio, iframe, pre, code, .select-none, .read-only-block',
        )
      )
        return;
      event.preventDefault();
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.focus({ preventScroll: true });
      setDragging(true);
    },
    pointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const previous = drag.current;
      if (!previous || previous.id !== event.pointerId) return;
      const dx = event.clientX - previous.x,
        dy = event.clientY - previous.y;
      if (dx || dy) moved.current = true;
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      update({ ...current.current, x: current.current.x + dx, y: current.current.y + dy });
    },
    endDrag,
    suppressClick: () => {
      const suppress = moved.current;
      moved.current = false;
      return suppress;
    },
    keyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (touchMode || event.target !== event.currentTarget) return;
      const movement: Record<string, [number, number]> = {
        ArrowLeft: [80, 0],
        ArrowRight: [-80, 0],
        ArrowUp: [0, 80],
        ArrowDown: [0, -80],
      };
      const delta = movement[event.key];
      if (delta) {
        event.preventDefault();
        update({ ...current.current, x: current.current.x + delta[0], y: current.current.y + delta[1] });
      } else if (['+', '=', '-'].includes(event.key)) {
        event.preventDefault();
        zoomBy(event.key === '-' ? 1 / 1.25 : 1.25);
      }
    },
  };
}
