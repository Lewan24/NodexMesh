import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CanvasPoint } from '../types';
import { cameraNeedsContentRefresh, getGridTransform, type CanvasCamera } from '../utils/cameraViewport';

/** Present every camera position immediately; refresh React content within the overscan safety margin. */
export function useCanvasCamera(pan: CanvasPoint, zoom: number) {
  const [isNavigating, setNavigating] = useState(false);
  const [snapshot, setSnapshot] = useState<CanvasCamera>({ pan, zoom });
  const snapshotRef = useRef(snapshot);
  const lastCamera = useRef({ pan, zoom });
  const panRef = useRef(pan);
  const zoomRef = useRef(zoom);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const gridCamera = useRef<CanvasCamera>({ pan, zoom });
  const targets = useRef({ inverse: [] as HTMLElement[], titles: [] as HTMLElement[], cursors: [] as HTMLElement[] });
  const viewportRef = useRef({ width: 0, height: 0 });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const present = useCallback((committed?: CanvasCamera) => {
    if (committed) {
      gridCamera.current = committed;
      const root = containerRef.current;
      targets.current = {
        inverse: Array.from(root?.querySelectorAll<HTMLElement>('[data-camera-inverse-scale]') ?? []),
        titles: Array.from(root?.querySelectorAll<HTMLElement>('[data-camera-title-scale]') ?? []),
        cursors: Array.from(root?.querySelectorAll<HTMLElement>('[data-camera-cursor]') ?? []),
      };
    }
    const camera = { pan: panRef.current, zoom: zoomRef.current };
    const scene = sceneRef.current;
    if (scene) scene.style.transform = `translate(${camera.pan.x}px, ${camera.pan.y}px) scale(${camera.zoom})`;
    const grid = gridRef.current;
    if (grid) {
      const { x, y, scale } = getGridTransform(camera, gridCamera.current.zoom, viewportRef.current);
      grid.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    }
    // Only the small screen-sized controls change scale, without invalidating the block subtree.
    targets.current.inverse.forEach((element) => {
      element.style.transform = `scale(${1 / camera.zoom})`;
    });
    targets.current.titles.forEach((element) => {
      const scale = camera.zoom >= 1 ? 1 : Math.min(3.2, 1 / Math.max(0.1, camera.zoom));
      element.style.transform = `translateY(-100%) scale(${scale})`;
    });
    targets.current.cursors.forEach((element) => {
      const x = Number(element.dataset.cameraX);
      const y = Number(element.dataset.cameraY);
      element.style.transform = `translate3d(${camera.pan.x + x * camera.zoom}px, ${camera.pan.y + y * camera.zoom}px, 0)`;
    });
  }, []);

  const refresh = useCallback(() => {
    const camera = { pan: panRef.current, zoom: zoomRef.current };
    snapshotRef.current = camera;
    setSnapshot(camera);
  }, []);

  const update = useCallback(
    (nextPan: CanvasPoint, nextZoom: number) => {
      const previous = lastCamera.current;
      if (previous.pan.x === nextPan.x && previous.pan.y === nextPan.y && previous.zoom === nextZoom) return;
      lastCamera.current = { pan: nextPan, zoom: nextZoom };
      setNavigating(true);
      panRef.current = nextPan;
      zoomRef.current = nextZoom;
      present();
      if (cameraNeedsContentRefresh(snapshotRef.current, { pan: nextPan, zoom: nextZoom }, viewportRef.current)) {
        refresh();
      }
      if (idleTimer.current !== null) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        idleTimer.current = null;
        setNavigating(false);
        refresh();
      }, 120);
    },
    [present, refresh],
  );

  // Controlled changes (reset, fit, restored viewport) use the same presentation path as gestures.
  useLayoutEffect(() => update(pan, zoom), [pan, zoom, update]);
  useEffect(
    () => () => {
      if (idleTimer.current !== null) clearTimeout(idleTimer.current);
    },
    [],
  );

  const [camera] = useState(() => ({ panRef, zoomRef, containerRef, sceneRef, gridRef, viewportRef, present }));
  return { snapshot, camera, isNavigating };
}

export type CanvasCameraBindings = ReturnType<typeof useCanvasCamera>['camera'];
