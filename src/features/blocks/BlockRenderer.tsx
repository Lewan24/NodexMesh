import type { BoardItem, ChecklistEntry, KanbanCard } from '@/data/types';
import NoteBlock from '@/features/blocks/note/NoteBlock';
import KanbanBlock from '@/features/blocks/kanban/KanbanBlock';
import ImageBlock from '@/features/blocks/image/ImageBlock';
import LinkBlock from '@/features/blocks/link/LinkBlock';
import TextBlock from '@/features/blocks/text/TextBlock';
import FrameBlock from '@/features/blocks/frame/FrameBlock';
import ChecklistBlock from '@/features/blocks/checklist/ChecklistBlock';
import LineBlock from '@/features/blocks/line/LineBlock';
import ColumnBlock from '@/features/blocks/column/ColumnBlock';

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
  /** Routes a nested delete (e.g. an item inside a column) through the confirm dialog instead of deleting immediately. */
  onRequestDelete?: (execute: () => void) => void;
  /** A checklist entry was dragged past this item's own bounds — Canvas resolves the drop target. */
  onEntryDroppedOutside?: (entry: ChecklistEntry, clientX: number, clientY: number) => void;
  /** A kanban card was dragged past this board's own bounds — Canvas resolves the drop target. */
  onCardDroppedOutside?: (card: KanbanCard, clientX: number, clientY: number) => void;
}

export default function BlockRenderer({ item, zoom, isSelected, isDragOver, onUpdate, onDelete, onFrameResize, onFitFrame, onBlockResize, onLineEndpointDrag, onEjectItem, onSelectColumnItem, onRequestDelete, onEntryDroppedOutside, onCardDroppedOutside }: Props) {
  const base = { item: item as any, zoom, isSelected, isDragOver, onUpdate, onDelete };
  switch (item.type) {
    case 'note':      return <NoteBlock {...base} onBlockResize={onBlockResize} />;
    case 'kanban':    return <KanbanBlock {...base} onCardDroppedOutside={onCardDroppedOutside} />;
    case 'image':     return <ImageBlock {...base} onBlockResize={onBlockResize} />;
    case 'link':      return <LinkBlock {...base} />;
    case 'text':      return <TextBlock {...base} onBlockResize={onBlockResize} />;
    case 'checklist': return <ChecklistBlock {...base} onBlockResize={onBlockResize} onEntryDroppedOutside={onEntryDroppedOutside} />;
    case 'column':    return <ColumnBlock {...base} onBlockResize={onBlockResize} onEjectItem={onEjectItem} onSelectColumnItem={onSelectColumnItem} onRequestDelete={onRequestDelete} />;
    case 'frame':     return <FrameBlock {...base} onFrameResize={onFrameResize} onFitFrame={onFitFrame} />;
    case 'line':      return <LineBlock {...base} onLineEndpointDrag={onLineEndpointDrag} />;
    default:          return null;
  }
}
