import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import type { BoardItem, FontFamily } from '@/entities/board/types';
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
    <select
      value={typography?.fontFamily ?? (item.type === 'code' ? 'mono' : '')}
      onChange={(event) => update({ fontFamily: (event.target.value || undefined) as FontFamily | undefined })}
      onMouseDown={(event) => event.stopPropagation()}
      className="h-8 px-2 rounded-lg text-xs outline-none border flex-shrink-0"
      style={{
        minWidth: 92,
        color: 'var(--color-text-primary)',
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
      title={translate('Font family')}
      aria-label={translate('Item font family')}
    >
      <option value="">{translate('Project default')}</option>
      {FONT_FAMILIES.map((font) => (
        <option key={font.value} value={font.value} style={{ fontFamily: font.css }}>
          {font.label}
        </option>
      ))}
    </select>
  );
}
