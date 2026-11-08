import type { CSSProperties } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { BoardBlockItem, BoardItem } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { ITEM_WIDTH } from '@/features/canvas/constants';
import { useCardAppearance } from '../shared/cardAppearance';
import { getTypographyStyle } from '../typography/typographyUtils';
import { getSectionStyle } from '../typography/sectionTypography';
import IconVisual from '../icon/IconVisual';
import { getBoardIcon } from './boardIcon';
import './boardBlock.css';

interface BoardBlockProps {
  item: BoardBlockItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onOpenBoard?: (boardId: string) => void;
  onRenameBoard?: (boardId: string, name: string) => void;
}

export default function BoardBlock({ item, onUpdate, onOpenBoard, onRenameBoard }: BoardBlockProps) {
  useTranslation();
  const appearance = useCardAppearance(item.color, item.gradient, item.colorRole, item.backgroundOpacity);
  const typography = getTypographyStyle(item);
  const icon = getBoardIcon(item);
  const open = () => {
    if (item.boardId) onOpenBoard?.(item.boardId);
  };

  return (
    <div
      className="board-block item-rounded"
      style={
        {
          width: item.width ?? ITEM_WIDTH.board,
          minHeight: item.height ?? 190,
          background: appearance.background,
          '--board-text': appearance.textColor,
          '--board-muted': appearance.mutedColor,
          ...(item.topColor ? { borderTop: `3px solid ${item.topColor}` } : {}),
        } as CSSProperties
      }
      onDoubleClick={open}
    >
      <div className="board-block-header">
        {icon && (
          <div className="board-block-icon">
            <IconVisual item={icon} size={28} />
          </div>
        )}
        <div className="board-block-heading">
          <span className="board-block-kind">{translate('Board')}</span>
          <textarea
            rows={1}
            aria-label={translate('Board block title')}
            className="board-block-title"
            value={item.title}
            maxLength={200}
            onChange={(event) => {
              const title = event.target.value.replace(/[\r\n]+/g, ' ');
              onUpdate((current) => (current.type === 'board' ? { ...current, title } : current));
            }}
            onDoubleClick={(event) => event.stopPropagation()}
            onBlur={() => {
              const name = item.title.trim();
              if (item.boardId && name) onRenameBoard?.(item.boardId, name);
            }}
            style={{ ...typography, ...getSectionStyle(item.typography, 'title') }}
          />
        </div>
      </div>
      <textarea
        aria-label={translate('Board block description')}
        className="board-block-description"
        rows={2}
        placeholder={translate('Add a short description')}
        value={item.description}
        maxLength={200_000}
        onChange={(event) =>
          onUpdate((current) => (current.type === 'board' ? { ...current, description: event.target.value } : current))
        }
        onDoubleClick={(event) => event.stopPropagation()}
        style={{ ...typography, ...getSectionStyle(item.typography, 'description') }}
      />
      <button
        type="button"
        data-read-only-action="true"
        className="board-block-open btn-secondary"
        style={getSectionStyle(item.typography, 'links')}
        disabled={!item.boardId || !onOpenBoard}
        onDoubleClick={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          open();
        }}
      >
        <span>{item.boardId ? translate('Open board') : translate('Board setup pending')}</span>
        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
