import { useCallback, useEffect } from 'react';

import type { RefObject } from 'react';

import { ZOOM_MAX, ZOOM_MIN } from '@/features/canvas/constants';

interface CanvasPoint {
  x: number;
  y: number;
}

interface UseCanvasZoomOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  panRef: RefObject<CanvasPoint>;
  zoomRef: RefObject<number>;

  onPanChange: (pan: CanvasPoint) => void;
  onZoomChange: (zoom: number) => void;
}

export function useCanvasZoom({ containerRef, panRef, zoomRef, onPanChange, onZoomChange }: UseCanvasZoomOptions) {
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => ({
      x: (screenX - panRef.current.x) / zoomRef.current,
      y: (screenY - panRef.current.y) / zoomRef.current,
    }),
    [panRef, zoomRef],
  );

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    let frame: number | null = null;
    let pendingCamera: { pan: CanvasPoint; zoom: number } | null = null;

    const flushCamera = () => {
      frame = null;
      const camera = pendingCamera;
      pendingCamera = null;
      if (!camera) return;

      // Keep coordinate conversion current before React publishes the render.
      panRef.current = camera.pan;
      zoomRef.current = camera.zoom;
      onPanChange(camera.pan);
      onZoomChange(camera.zoom);
    };

    const handleWheel = (event: WheelEvent) => {
      const target = event.target;

      if (
        target instanceof Element &&
        target.closest(
          '[data-wheel-scroll="true"], [data-canvas-ui], [data-edit-bar], [data-item-inspector], [role="dialog"]',
        )
      ) {
        return;
      }

      event.preventDefault();

      const rect = element.getBoundingClientRect();

      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const currentZoom = pendingCamera?.zoom ?? zoomRef.current;
      const currentPan = pendingCamera?.pan ?? panRef.current;

      const factor = event.ctrlKey || event.metaKey ? 1 - event.deltaY * 0.008 : event.deltaY > 0 ? 0.92 : 1 / 0.92;

      const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Number((currentZoom * factor).toFixed(4))));

      pendingCamera = {
        pan: {
          x: mouseX - (mouseX - currentPan.x) * (nextZoom / currentZoom),
          y: mouseY - (mouseY - currentPan.y) * (nextZoom / currentZoom),
        },
        zoom: nextZoom,
      };
      if (frame === null) frame = requestAnimationFrame(flushCamera);
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [containerRef, panRef, zoomRef, onPanChange, onZoomChange]);

  return { screenToCanvas };
}
