import type {
  BoardItem,
} from '@/entities/board/types';

import NoteBlock from '@/features/blocks/note/NoteBlock';
import KanbanBlock from '@/features/blocks/kanban/KanbanBlock';
import ImageBlock from '@/features/blocks/image/ImageBlock';
import LinkBlock from '@/features/blocks/link/LinkBlock';
import TextBlock from '@/features/blocks/text/TextBlock';
import FrameBlock from '@/features/blocks/frame/FrameBlock';
import ChecklistBlock from '@/features/blocks/checklist/ChecklistBlock';
import LineBlock from '@/features/blocks/line/LineBlock';
import ColumnBlock from '@/features/blocks/column/ColumnBlock';

import type {
  BlockResizeHandler,
  CardDroppedOutsideHandler,
  EntryDroppedOutsideHandler,
  FrameResizeHandler,
  LineEndpointDragHandler,
  RequestDeleteHandler,
} from '@/features/blocks/types';

interface BlockRendererProps {
  item: BoardItem;
  zoom: number;
  isSelected: boolean;
  isDragOver?: boolean;
  selectedColumnItemId?: string | null;

  onUpdate: (
    updater: (
      item: BoardItem,
    ) => BoardItem,
  ) => void;

  onDelete: () => void;
  onFrameResize: FrameResizeHandler;
  onFitFrame: () => void;
  onBlockResize: BlockResizeHandler;
  onLineEndpointDrag: LineEndpointDragHandler;

  onEjectItem?: (
    ejectedItem: BoardItem,
  ) => void;

  onSelectColumnItem?: (
    item: BoardItem | null,
  ) => void;

  onRequestDelete?: RequestDeleteHandler;
  onEntryDroppedOutside?: EntryDroppedOutsideHandler;
  onCardDroppedOutside?: CardDroppedOutsideHandler;
}

export default function BlockRenderer({
  item,

  zoom,

  isSelected,
  isDragOver,

  selectedColumnItemId,

  onUpdate,
  onDelete,

  onFrameResize,
  onFitFrame,

  onBlockResize,
  onLineEndpointDrag,

  onEjectItem,
  onSelectColumnItem,

  onRequestDelete,

  onEntryDroppedOutside,
  onCardDroppedOutside,
}: BlockRendererProps) {
  const commonProps = {
    zoom,
    isSelected,
    isDragOver,
    onUpdate,
    onDelete,
  };

  switch (item.type) {
    case 'note':
      return (
        <NoteBlock
          {...commonProps}
          item={item}
          onBlockResize={
            onBlockResize
          }
        />
      );

    case 'kanban':
      return (
        <KanbanBlock
          {...commonProps}
          item={item}
          onCardDroppedOutside={
            onCardDroppedOutside
          }
        />
      );

    case 'image':
      return (
        <ImageBlock
          {...commonProps}
          item={item}
          onBlockResize={
            onBlockResize
          }
        />
      );

    case 'link':
      return (
        <LinkBlock
          {...commonProps}
          item={item}
        />
      );

    case 'text':
      return (
        <TextBlock
          {...commonProps}
          item={item}
          onBlockResize={
            onBlockResize
          }
        />
      );

    case 'checklist':
      return (
        <ChecklistBlock
          {...commonProps}
          item={item}
          onBlockResize={
            onBlockResize
          }
          onEntryDroppedOutside={
            onEntryDroppedOutside
          }
        />
      );

    case 'column':
      return (
        <ColumnBlock
          {...commonProps}
          item={item}
          selectedItemId={
            selectedColumnItemId
          }
          onBlockResize={
            onBlockResize
          }
          onEjectItem={
            onEjectItem
          }
          onSelectColumnItem={
            onSelectColumnItem
          }
          onRequestDelete={
            onRequestDelete
          }
        />
      );

    case 'frame':
      return (
        <FrameBlock
          {...commonProps}
          item={item}
          onFrameResize={
            onFrameResize
          }
          onFitFrame={
            onFitFrame
          }
        />
      );

    case 'line':
      return (
        <LineBlock
          {...commonProps}
          item={item}
          onLineEndpointDrag={
            onLineEndpointDrag
          }
        />
      );

    default:
      return null;
  }
}