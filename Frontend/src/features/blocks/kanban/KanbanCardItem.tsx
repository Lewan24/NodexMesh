import TaskPreview from '../shared/TaskPreview';
import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';

import type { KanbanCard } from '@/entities/board/types';
import DragHandle from '../shared/DragHandle';

interface KanbanCardItemProps {
  card: KanbanCard;
  isDragging: boolean;
  textColor: string;
  mutedColor: string;
  doneColor: string;
  cardBackground: string;
  cardBorder: string;
  cardBorderHover: string;
  accentColor: string;
  textStyle?: React.CSSProperties;
  onToggle: () => void;
  onDelete: () => void;
  onOpen: () => void;
  readOnly?: boolean;
  onDragHandleMouseDown: (event: React.MouseEvent) => void;
}

export default function KanbanCardItem({
  card,
  isDragging,
  textColor,
  mutedColor,
  doneColor,
  cardBackground,
  cardBorder,
  cardBorderHover,
  accentColor,
  textStyle,
  onToggle,
  onDelete,
  onOpen,
  readOnly = false,
  onDragHandleMouseDown,
}: KanbanCardItemProps) {
  useTranslation();
  return (
    <div
      className="task-preview-row group/card flex items-center gap-1.5 item-rounded px-2 py-2 mb-1.5 shadow-sm transition-all duration-150"
      style={{ backgroundColor: cardBackground, borderColor: cardBorder, opacity: isDragging ? 0.35 : 1 }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = cardBorderHover;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = cardBorder;
      }}
    >
      <DragHandle compact color={mutedColor} title={translate('Drag card')} onMouseDown={onDragHandleMouseDown} />

      {/* Done toggle */}

      <button
        type="button"
        className="task-preview-toggle cursor-pointer disabled:cursor-default"
        onMouseDown={(event) => event.stopPropagation()}
        disabled={readOnly}
        onClick={onToggle}
        role="checkbox"
        aria-checked={card.done}
        aria-label={translate('Complete {{value1}}', { value1: card.text || translate('Task') })}
      >
        <span
          className="w-4 h-4 rounded border flex items-center justify-center"
          style={{
            borderColor: card.done ? accentColor : `${textColor}40`,
            backgroundColor: card.done ? accentColor : 'transparent',
          }}
        >
          {card.done && (
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
        style={{ color: card.done ? doneColor : textColor, ...textStyle }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onOpen}
      >
        <span
          className="block whitespace-pre-wrap break-words"
          style={{ textDecoration: card.done ? 'line-through' : undefined }}
        >
          {card.text || translate('Untitled')}
        </span>
        <TaskPreview task={card} />
      </button>

      {/* Delete */}

      <button
        disabled={readOnly}
        aria-label={translate('Delete task')}
        onClick={onDelete}
        className="task-delete-button opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 transition-opacity flex-shrink-0 cursor-pointer disabled:cursor-default"
        style={{ color: mutedColor }}
        onMouseDown={(event) => event.stopPropagation()}
        onMouseEnter={(event) => {
          event.currentTarget.style.color = '#FF6B8A';
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.color = mutedColor;
        }}
        title={translate('Delete card')}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
