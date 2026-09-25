import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { getSectionStyle } from '@/features/blocks/typography/sectionTypography';
import { LayoutDashboard, ExternalLink } from 'lucide-react';
import type { BoardBlockItem, BoardItem } from '@/entities/board/types';
import { useCardAppearance } from '@/features/blocks/shared/cardAppearance';
import { getTypographyStyle } from '@/features/blocks/typography/typographyUtils';

interface BoardBlockProps {
  item: BoardBlockItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
  onOpenBoard?: (boardId: string) => void;
  onRenameBoard?: (boardId: string, name: string) => void;
}

export default function BoardBlock({ item, onUpdate, onOpenBoard, onRenameBoard }: BoardBlockProps) {
  useTranslation();
  const color = item.color ?? '#7C3AED';
  const appearance = useCardAppearance(color, item.gradient, item.colorRole, item.backgroundOpacity);
  const typographyStyle = getTypographyStyle(item);
  const open = () => {
    if (item.boardId) onOpenBoard?.(item.boardId);
  };

  return (
    <div
      className="item-rounded border shadow-sm overflow-hidden select-none"
      style={{
        width: item.width,
        minHeight: item.height ?? 190,
        borderColor: `${appearance.solid}66`,
        background: appearance.background,
      }}
      onDoubleClick={open}
      title={item.boardId ? translate('Double-click to open board') : translate('This board is not connected yet')}
    >
      {item.topColor ? (
        <div className="h-2" style={{ background: item.topColor }} />
      ) : (
        <div className="h-2" style={{ background: appearance.solid }} />
      )}
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl p-2.5" style={{ color: appearance.solid, background: `${appearance.solid}18` }}>
            {item.icon === 'layout-dashboard' ? (
              <LayoutDashboard size={25} />
            ) : (
              <span className="text-2xl">{item.icon}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <input
              aria-label={translate('Board block title')}
              className="w-full bg-transparent font-semibold outline-none"
              value={item.title}
              onChange={(event) =>
                onUpdate((current) => (current.type === 'board' ? { ...current, title: event.target.value } : current))
              }
              onDoubleClick={(event) => event.stopPropagation()}
              onBlur={() => {
                const name = item.title.trim();
                if (item.boardId && name) onRenameBoard?.(item.boardId, name);
              }}
              style={{
                ...typographyStyle,
                color: appearance.textColor,
                fontWeight: typographyStyle.fontWeight ?? 600,
                ...getSectionStyle(item.typography, 'title'),
              }}
            />
            <textarea
              aria-label={translate('Board block description')}
              className="mt-1 w-full resize-none bg-transparent text-sm outline-none"
              rows={2}
              value={item.description}
              onChange={(event) =>
                onUpdate((current) =>
                  current.type === 'board' ? { ...current, description: event.target.value } : current,
                )
              }
              onDoubleClick={(event) => event.stopPropagation()}
              style={{
                ...typographyStyle,
                color: appearance.mutedColor,
                ...getSectionStyle(item.typography, 'description'),
              }}
            />
          </div>
        </div>
        <button
          type="button"
          data-read-only-action="true"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            color: appearance.textColor,
            borderColor: `${appearance.textColor}66`,
            background: `${appearance.textColor}14`,
            ...getSectionStyle(item.typography, 'links'),
          }}
          onClick={(event) => {
            event.stopPropagation();
            open();
          }}
          disabled={!item.boardId}
        >
          {item.boardId ? translate('Open board') : translate('Board setup pending')} <ExternalLink size={13} />
        </button>
      </div>
    </div>
  );
}
