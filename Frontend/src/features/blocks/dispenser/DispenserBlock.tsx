import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { getSectionStyle } from '@/features/blocks/typography/sectionTypography';
import { useState } from 'react';
import type { DispenserItem } from '@/entities/board/types';
import type { BlockUpdateHandler } from '../types';
import { startToolDrag } from '@/features/canvas/utils/toolDrag';
import { useCardAppearance } from '../shared/cardAppearance';
import ContentBlockShell from '../shared/ContentBlockShell';

export default function DispenserBlock({
  item,
  onUpdate,
  onDelete,
}: {
  item: DispenserItem;
  onUpdate: BlockUpdateHandler;
  onDelete: () => void;
}) {
  useTranslation();
  const { background, solid, textColor } = useCardAppearance(
    item.color,
    item.gradient,
    item.colorRole,
    item.backgroundOpacity,
  );
  const [editingLabel, setEditingLabel] = useState(false);
  return (
    <ContentBlockShell
      item={item}
      onDelete={onDelete}
      title={
        editingLabel ? (
          <input
            aria-label={translate('Dispenser label')}
            className="w-full bg-transparent outline-none"
            value={item.title}
            autoFocus
            onBlur={() => setEditingLabel(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(false);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) =>
              onUpdate((current) => (current.type === 'dispenser' ? { ...current, title: e.target.value } : current))
            }
            style={getSectionStyle(item.typography, 'title')}
          />
        ) : (
          <span
            className="block truncate"
            title={translate('Double-click to rename')}
            onDoubleClick={() => setEditingLabel(true)}
            style={getSectionStyle(item.typography, 'title')}
          >
            {item.title}
          </span>
        )
      }
    >
      <div className="flex-1 min-h-0 px-6 pt-4 pb-6 flex flex-col gap-3">
        <label className="flex items-center justify-between text-xs" onMouseDown={(e) => e.stopPropagation()}>
          {translate('Paper color')}{' '}
          <input
            aria-label={translate('Paper color')}
            type="color"
            value={item.color}
            onChange={(e) =>
              onUpdate((current) =>
                current.type === 'dispenser'
                  ? { ...current, color: e.target.value, colorRole: undefined, gradient: undefined }
                  : current,
              )
            }
          />
        </label>
        <button
          type="button"
          aria-label={translate('Drag a new note')}
          className="relative flex-1 min-h-12 item-rounded text-xs font-medium cursor-grab active:cursor-grabbing"
          style={{
            background,
            color: textColor,
            boxShadow: `3px 4px 0 ${solid}, 6px 8px 0 ${solid}, 8px 11px 8px #0003`,
            border: '1px solid #0002',
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            startToolDrag('note', e, {
              color: item.color,
              colorRole: item.colorRole,
              gradient: item.gradient,
              dispenserId: item.id,
            });
          }}
        >
          {translate('Drag a fresh note ↗')}
        </button>
      </div>
    </ContentBlockShell>
  );
}
