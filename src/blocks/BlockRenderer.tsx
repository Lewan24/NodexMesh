import type { BoardItem } from '../types';
import NoteBlock from './NoteBlock';
import KanbanBlock from './KanbanBlock';
import ImageBlock from './ImageBlock';
import LinkBlock from './LinkBlock';
import TextBlock from './TextBlock';
import FrameBlock from './FrameBlock';
import ChecklistBlock from './ChecklistBlock';
import LineBlock from './LineBlock';
import ColumnBlock from './ColumnBlock';

interface Props {
  item: BoardItem;
  zoom: number;
  isSelected: boolean;
  isDragOver?: boolean;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onDelete: () => void;
  onFrameResize: (e: React.MouseEvent, w: number, h: number) => void;
  onFitFrame: () => void;
  onBlockResize: (e: React.MouseEvent, w: number, h: number | null) => void;
  onLineEndpointDrag: (e: React.MouseEvent, endpoint: 1 | 2) => void;
  onEjectItem?: (ejectedItem: BoardItem) => void;
  onSelectColumnItem?: (item: BoardItem | null) => void;
}

export default function BlockRenderer({ item, zoom, isSelected, isDragOver, onUpdate, onDelete, onFrameResize, onFitFrame, onBlockResize, onLineEndpointDrag, onEjectItem, onSelectColumnItem }: Props) {
  const base = { item: item as any, zoom, isSelected, isDragOver, onUpdate, onDelete };
  switch (item.type) {
    case 'note':      return <NoteBlock {...base} onBlockResize={onBlockResize} />;
    case 'kanban':    return <KanbanBlock {...base} />;
    case 'image':     return <ImageBlock {...base} onBlockResize={onBlockResize} />;
    case 'link':      return <LinkBlock {...base} />;
    case 'text':      return <TextBlock {...base} />;
    case 'checklist': return <ChecklistBlock {...base} />;
    case 'column':    return <ColumnBlock {...base} onBlockResize={onBlockResize} onEjectItem={onEjectItem} onSelectColumnItem={onSelectColumnItem} />;
    case 'frame':     return <FrameBlock {...base} onFrameResize={onFrameResize} onFitFrame={onFitFrame} />;
    case 'line':      return <LineBlock {...base} onLineEndpointDrag={onLineEndpointDrag} />;
    default:          return null;
  }
}
