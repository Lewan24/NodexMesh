import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { FontFamily } from '@/entities/board/types';
import { FONT_FAMILIES, getFontFamilyCss } from '@/features/blocks/typography/typographyUtils';
import { translate } from '@/shared/i18n';

export default function FontPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FontFamily;
  onChange: (value: FontFamily) => void;
}) {
  useTranslation();
  const name = useId();

  return (
    <fieldset className="appearance-font-picker">
      <legend>{label}</legend>
      <div className="appearance-font-preview" style={{ fontFamily: getFontFamilyCss(value) }}>
        <p className="text-xl">{translate('Your next great idea starts here.')}</p>
        <p className="mt-2 text-sm">Aa Bb Cc · 0123456789 · Ąą Ćć Ęę Łł Ńń Óó Śś Źź Żż</p>
      </div>
      <div className="appearance-font-options">
        {FONT_FAMILIES.map((font) => (
          <label key={font.value} className="appearance-font-option" data-selected={font.value === value}>
            <input
              type="radio"
              name={name}
              value={font.value}
              checked={font.value === value}
              onChange={() => onChange(font.value)}
            />
            <span style={{ fontFamily: font.css }}>{font.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
