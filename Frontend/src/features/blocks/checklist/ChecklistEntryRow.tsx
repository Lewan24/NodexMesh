import TaskPreview from '../shared/TaskPreview';
import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { useSectionStyle } from '../typography/TypographyContext';

import type { ChecklistEntry } from '@/entities/board/types';
import DragHandle from '../shared/DragHandle';

interface ChecklistEntryRowProps {
  entry: ChecklistEntry;
  isDragging: boolean;
  textColor: string;
  accentColor: string;
  onToggle: () => void;
  onDelete: () => void;
  onOpen: () => void;
  readOnly?: boolean;
  onDragHandleMouseDown: (event: React.MouseEvent) => void;
}

export default function ChecklistEntryRow({
  entry,
  isDragging,
  textColor,
  accentColor,
  onToggle,
  onDelete,
  onOpen,
  readOnly = false,
  onDragHandleMouseDown,
}: ChecklistEntryRowProps) {
  useTranslation();
  const sectionStyle = useSectionStyle('body');
  return (
    <div
      className="task-preview-row group/entry flex items-start gap-1 py-1"
      style={{ opacity: isDragging ? 0.35 : 1 }}
    >
      <DragHandle
        compact
        color={`${textColor}90`}
        title={translate('Drag to reorder or move to Checklist / Kanban')}
        onMouseDown={onDragHandleMouseDown}
      />

      {/* Toggle */}
      <button
        type="button"
        className="task-preview-toggle cursor-pointer disabled:cursor-default"
        onMouseDown={(event) => event.stopPropagation()}
        disabled={readOnly}
        onClick={onToggle}
        role="checkbox"
        aria-checked={entry.done}
        aria-label={translate('Complete {{value1}}', { value1: entry.text || translate('Task') })}
      >
        <span
          className="w-4 h-4 rounded border flex items-center justify-center"
          style={{
            borderColor: entry.done ? accentColor : `${textColor}40`,
            backgroundColor: entry.done ? accentColor : 'transparent',
          }}
        >
          {entry.done && (
            <svg viewBox="0 0 10 10" fill="none" width="10" height="10">
              <path
                d="M1.5 5l2.5 2.5 4.5-5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      </button>

      {/* Text */}
      <button
        type="button"
        className="task-open-button flex-1 min-w-0 text-left py-1 cursor-pointer"
        style={{ color: textColor, ...sectionStyle }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onOpen}
      >
        <span
          className="block whitespace-pre-wrap break-words"
          style={{ textDecoration: entry.done ? 'line-through' : undefined }}
        >
          {entry.text || translate('Untitled')}
        </span>
        <TaskPreview task={entry} />
      </button>

      {/* Delete */}
      <button
        onMouseDown={(event) => event.stopPropagation()}
        disabled={readOnly}
        aria-label={translate('Delete task')}
        onClick={onDelete}
        className="task-delete-button opacity-0 group-hover/entry:opacity-100 focus-visible:opacity-100 flex-shrink-0 transition-opacity cursor-pointer disabled:cursor-default"
        style={{ color: `${textColor}55` }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
