import type { BoardItem } from '@/entities/board/types';
import { lazy, Suspense } from 'react';

import ChecklistBlock from '@/features/blocks/checklist/ChecklistBlock';
import ColumnBlock from '@/features/blocks/column/ColumnBlock';
import FrameBlock from '@/features/blocks/frame/FrameBlock';
import ImageBlock from '@/features/blocks/image/ImageBlock';
import KanbanBlock from '@/features/blocks/kanban/KanbanBlock';
import LineBlock from '@/features/blocks/line/LineBlock';
import LinkBlock from '@/features/blocks/link/LinkBlock';
import NoteBlock from '@/features/blocks/note/NoteBlock';
import TextBlock from '@/features/blocks/text/TextBlock';
import EmbedBlock from './embed/EmbedBlock';
import DispenserBlock from './dispenser/DispenserBlock';

const DocumentBlock = lazy(() => import('./document/DocumentBlock'));
const CodeBlock = lazy(() => import('./code/CodeBlock'));

function LoadingBlock({ item }: { item: BoardItem }) {
  return (
    <div role="status" className="rounded-xl border p-4 text-sm"
      style={{ width: item.width, height: item.height ?? (item.type === 'document' ? 600 : 280),
        borderColor: 'var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>
      Loading…
    </div>
  );
}

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
  onEjectItem?: (
    item: BoardItem,
    clientX?: number,
    clientY?: number,
  ) => void;
  onSelectColumnItem?: (item: BoardItem | null) => void;
  onRequestDelete?: RequestDeleteHandler;
  onEntryDroppedOutside?: EntryDroppedOutsideHandler;
  onCardDroppedOutside?: CardDroppedOutsideHandler;
  searchActive?: boolean;
  nestedSearchMatchIds?: Set<string>;
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
  searchActive = false,
  nestedSearchMatchIds,
}: BlockRendererProps) {
  switch (item.type) {
    case 'document': return <Suspense fallback={<LoadingBlock item={item} />}><DocumentBlock item={item} onUpdate={onUpdate} onDelete={onDelete} /></Suspense>;
    case 'embed': return <EmbedBlock item={item} onUpdate={onUpdate} onDelete={onDelete} />;
    case 'code': return <Suspense fallback={<LoadingBlock item={item} />}><CodeBlock item={item} onUpdate={onUpdate} onDelete={onDelete} /></Suspense>;
    case 'dispenser': return <DispenserBlock item={item} onUpdate={onUpdate} onDelete={onDelete} />;
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
          searchActive={searchActive}
          searchMatchIds={nestedSearchMatchIds}
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
