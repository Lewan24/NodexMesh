import { defaultViewport, readViewport, viewportKey, writeViewport } from './boardViewport';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasPoint } from '@/features/canvas/types';

/** Local to the canvas owner so camera updates do not rerender the board shell. */
export function useBoardCamera(userId: string, projectId?: string, boardId?: string) {
  const key = viewportKey(userId, projectId, boardId);
  const [camera, setCamera] = useState(() => ({ key, ...readViewport(key) }));
  if (camera.key !== key) setCamera({ key, ...readViewport(key) });
  const latest = useRef(camera);

  useEffect(() => {
    const flush = () => writeViewport(latest.current.key, latest.current);
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, [key]);

  useEffect(() => {
    latest.current = camera;
    const timer = window.setTimeout(() => writeViewport(camera.key, camera), 200);
    return () => window.clearTimeout(timer);
  }, [camera]);
  const { pan, zoom } = camera;
  const setPan = useCallback((pan: CanvasPoint) => setCamera((current) => ({ ...current, pan })), []);
  const setZoom = useCallback((zoom: number) => setCamera((current) => ({ ...current, zoom })), []);

  const resetViewport = useCallback(() => {
    setCamera((current) => ({ ...current, ...defaultViewport() }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const resetShortcut = (event.metaKey || event.ctrlKey) && event.key === '0';

      if (!resetShortcut) {
        return;
      }

      event.preventDefault();
      resetViewport();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resetViewport]);

  return { pan, setPan, zoom, setZoom, resetViewport };
}
