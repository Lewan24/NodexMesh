import { useCallback, useState } from 'react';
import type { ToolType } from '@/entities/board/toolTypes';

export function useBoardView() {
  const [selectedTool, setSelectedTool] = useState<ToolType>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const resetBoardView = useCallback(() => {
    setSelectedTool('select');
    setSelectedIds([]);
  }, []);
  const selectTool = useCallback((tool: ToolType) => {
    setSelectedTool(tool);
    setSelectedIds([]);
  }, []);
  return { selectedTool, setSelectedTool, selectTool, selectedIds, setSelectedIds, resetBoardView };
}
