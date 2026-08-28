import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import type { ToolType } from '@/entities/board/toolTypes';

export interface CanvasPoint {
  x: number;
  y: number;
}

export function useBoardView() {
  const [selectedTool, setSelectedTool] =
    useState<ToolType>('select');

  const [pan, setPan] = useState<CanvasPoint>({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const resetViewport = useCallback(() => {
    setPan({
      x: 0,
      y: 0,
    });

    setZoom(1);
  }, []);

  const resetBoardView = useCallback(() => {
    resetViewport();
    setSelectedTool('select');
    setSelectedIds([]);
  }, [resetViewport]);

  const selectTool = useCallback((tool: ToolType) => {
    setSelectedTool(tool);
    setSelectedIds([]);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const resetShortcut =
        (event.metaKey || event.ctrlKey) &&
        event.key === '0';

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