import { useCallback, useEffect } from 'react';

import type { RefObject } from 'react';

import {
  ZOOM_MAX,
  ZOOM_MIN,
} from '@/features/canvas/constants';

interface CanvasPoint {
  x: number;
  y: number;
}

interface UseCanvasZoomOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  panRef: RefObject<CanvasPoint>;
  zoomRef: RefObject<number>;

  pan: CanvasPoint;
  zoom: number;

  onPanChange: (pan: CanvasPoint) => void;
  onZoomChange: (zoom: number) => void;
}

export function useCanvasZoom({
  containerRef,
  panRef,
  zoomRef,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
}: UseCanvasZoomOptions) {
  const screenToCanvas = useCallback(
    (
      screenX: number,
      screenY: number,
    ) => ({
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    }),
    [pan, zoom],
  );

  useEffect(() => {
    const element = containerRef.current;

    if (!element) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = element.getBoundingClientRect();

      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const currentZoom = zoomRef.current;
      const currentPan = panRef.current;

      const factor =
        event.ctrlKey || event.metaKey
          ? 1 - event.deltaY * 0.008
          : event.deltaY > 0
            ? 0.92
            : 1 / 0.92;

      const nextZoom = Math.min(
        ZOOM_MAX,
        Math.max(
          ZOOM_MIN,
          Number((currentZoom * factor).toFixed(4)),
        ),
      );

      onPanChange({
        x:
          mouseX -
          (mouseX - currentPan.x) *
            (nextZoom / currentZoom),
        y:
          mouseY -
          (mouseY - currentPan.y) *
            (nextZoom / currentZoom),
      });

      onZoomChange(nextZoom);
    };

    element.addEventListener('wheel', handleWheel, {
      passive: false,
    });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [
    containerRef,
    panRef,
    zoomRef,
    onPanChange,
    onZoomChange,
  ]);

  return {
    screenToCanvas,
  };
}