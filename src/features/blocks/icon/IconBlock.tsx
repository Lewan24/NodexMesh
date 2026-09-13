import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { IconItem } from '@/entities/board/types';
import type { BlockUpdateHandler } from '../types';
import IconVisual from './IconVisual';
import IconDialog from './IconDialog';

export default function IconBlock({
  item,
  isSelected,
  onUpdate,
}: {
  item: IconItem;
  isSelected: boolean;
  onUpdate: BlockUpdateHandler;
}) {
  const [editing, setEditing] = useState(false);
  const width = Math.max(24, item.width ?? 96);
  const height = Math.max(24, item.height ?? 96);
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width, height }}
      onDoubleClick={() => {
        if (!item.locked) setEditing(true);
      }}
    >
      <IconVisual item={item} size={Math.min(width, height)} />
      {isSelected && !item.locked && (
        <button
          type="button"
          aria-label="Edit icon"
          title="Edit icon · Double-click"
          className="icon-edit-button absolute top-0 -right-10 w-8 h-8 flex items-center justify-center rounded-lg shadow cursor-pointer"
          data-canvas-ui="true"
          style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={() => setEditing(true)}
        >
          <Pencil size={14} />
        </button>
      )}
      {editing && (
        <IconDialog
          item={item}
          onClose={() => setEditing(false)}
          onSave={(patch) => {
            onUpdate((current) => (current.type === 'icon' ? { ...current, ...patch } : current));
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
