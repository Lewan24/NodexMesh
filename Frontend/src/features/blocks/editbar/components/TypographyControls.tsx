import { Type } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { BoardItem, FontFamily } from '@/entities/board/types';
import { translate } from '@/shared/i18n';

import { FONT_FAMILIES, updateTypography } from '../../typography/typographyUtils';

export default function TypographyControls({
  item,
  onUpdate,
}: {
  item: BoardItem;
  onUpdate: (updater: (item: BoardItem) => BoardItem) => void;
}) {
  useTranslation();
  const typography = item.typography;
  const update = (patch: Partial<NonNullable<BoardItem['typography']>>) =>
    onUpdate((current) => updateTypography(current, patch));

  return (
    <label
      className="edit-bar-control-card flex min-w-[210px] items-center gap-2 rounded-xl border p-2"
      style={{ borderColor: 'var(--color-border-soft)', background: 'var(--edit-bar-card)' }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ color: 'var(--color-accent)', background: 'var(--color-accent-soft)' }}
      >
        <Type size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className="block text-[9px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-text-faint)' }}
        >
          {translate('Font family')}
        </span>
        <select
          value={typography?.fontFamily ?? (item.type === 'code' ? 'mono' : '')}
          onChange={(event) => update({ fontFamily: (event.target.value || undefined) as FontFamily | undefined })}
          onMouseDown={(event) => event.stopPropagation()}
          className="h-7 w-full bg-transparent text-xs font-semibold outline-none"
          style={{ color: 'var(--color-text-primary)' }}
          aria-label={translate('Item font family')}
        >
          <option value="">{translate('Project default')}</option>
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value} style={{ fontFamily: font.css }}>
              {font.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
