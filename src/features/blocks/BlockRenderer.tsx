import type { BoardItem } from '@/entities/board/types';

import ChecklistBlock from '@/features/blocks/checklist/ChecklistBlock';
import ColumnBlock from '@/features/blocks/column/ColumnBlock';
import FrameBlock from '@/features/blocks/frame/FrameBlock';
import ImageBlock from '@/features/blocks/image/ImageBlock';
import KanbanBlock from '@/features/blocks/kanban/KanbanBlock';
import LineBlock from '@/features/blocks/line/LineBlock';
import LinkBlock from '@/features/blocks/link/LinkBlock';
import NoteBlock from '@/features/blocks/note/NoteBlock';
import TextBlock from '@/features/blocks/text/TextBlock';

import type {
  BlockDeleteHandler,
  BlockUpdateHandler,
  CardDroppedOutsideHandler,
  EntryDroppedOutsideHandler,
  LineEndpointDragHandler,
  RequestDeleteHandler,
} from '@/features/blocks/types';

export interface BlockRendererProps {
  item: BoardItem;
  isSelected: boolean;
  isDragOver?: boolean;
  selectedColumnItemId?: string | null;
  isInsideColumn?: boolean;
  onUpdate: BlockUpdateHandler;
  onDelete: BlockDeleteHandler;
  onFitFrame: () => void;
  onLineEndpointDrag: LineEndpointDragHandler;
  onEjectItem?: (item: BoardItem) => void;
  onSelectColumnItem?: (item: BoardItem | null) => void;
  onRequestDelete?: RequestDeleteHandler;
  onEntryDroppedOutside?: EntryDroppedOutsideHandler;
  onCardDroppedOutside?: CardDroppedOutsideHandler;
}

export default function BlockRenderer({
  item,
  isSelected,
  isDragOver,
  selectedColumnItemId,
  isInsideColumn = false,
  onUpdate,
  onDelete,
  onFitFrame,
  onLineEndpointDrag,
  onEjectItem,
  onSelectColumnItem,
  onRequestDelete,
  onEntryDroppedOutside,
  onCardDroppedOutside,
}: BlockRendererProps) {
  switch (item.type) {
    case 'note':
      return (
        <NoteBlock
          item={item}
          isSelected={isSelected}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );

    case 'kanban':
      return (
        <KanbanBlock
          item={item}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onCardDroppedOutside={onCardDroppedOutside}
        />
      );

    case 'image':
      return (
        <ImageBlock
          item={item}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );

    case 'link':
      return (
        <LinkBlock
          item={item}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      );

    case 'text':
      return (
        <TextBlock
          item={item}
          fillWidth={isInsideColumn}
          onUpdate={onUpdate}
        />
      );

    case 'checklist':
      return (
        <ChecklistBlock
          item={item}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onEntryDroppedOutside={onEntryDroppedOutside}
        />
      );

    case 'column':
      return (
        <ColumnBlock
          item={item}
          isSelected={isSelected}
          isDragOver={isDragOver}
          selectedItemId={selectedColumnItemId}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onEjectItem={onEjectItem}
          onSelectColumnItem={onSelectColumnItem}
          onRequestDelete={onRequestDelete}
        />
      );

    case 'frame':
      return (
        <FrameBlock
          item={item}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onFitFrame={onFitFrame}
        />
      );

    case 'line':
      return (
        <LineBlock
          item={item}
          isSelected={isSelected}
          onDelete={onDelete}
          onLineEndpointDrag={onLineEndpointDrag}
        />
      );

    default:
      return null;
  }
}