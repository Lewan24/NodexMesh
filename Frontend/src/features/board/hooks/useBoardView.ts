import { defaultViewport, readViewport, viewportKey, writeViewport } from './boardViewport';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { ToolType } from '@/entities/board/toolTypes';

export interface CanvasPoint {
  x: number;
  y: number;
}

export function useBoardView(userId: string, projectId?: string, boardId?: string) {
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
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');

  const { pan, zoom } = camera;
  const setPan = useCallback((pan: CanvasPoint) => setCamera((current) => ({ ...current, pan })), []);
  const setZoom = useCallback((zoom: number) => setCamera((current) => ({ ...current, zoom })), []);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const resetViewport = useCallback(() => {
    setCamera((current) => ({ ...current, ...defaultViewport() }));
  }, []);

  const resetBoardView = useCallback(() => {
    setSelectedTool('select');
    setSelectedIds([]);
  }, []);

  const selectTool = useCallback((tool: ToolType) => {
    setSelectedTool(tool);
    setSelectedIds([]);
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

  return {
    selectedTool,
    setSelectedTool,
    selectTool,

    selectedIds,
    setSelectedIds,

    pan,
    setPan,

    zoom,
    setZoom,

    resetViewport,
    resetBoardView,
  };
}
