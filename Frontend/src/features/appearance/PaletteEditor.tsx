import { translate, displayLabel } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { paletteKeys, paletteBackground } from './appearanceModel';
import type { Palette, PaletteKey } from './appearanceModel';

export default function PaletteEditor({
  palette,
  mode,
  onChange,
  colorKeys = ['primary', 'secondary', 'canvas', ...paletteKeys],
  allowInheritance = true,
  labels = {},
}: {
  palette: Palette;
  mode: string;
  onChange: (palette: Palette) => void;
  colorKeys?: import('./appearanceModel').PaletteColorKey[];
  allowInheritance?: boolean;
  labels?: Partial<Record<import('./appearanceModel').PaletteColorKey, string>>;
}) {
  useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {colorKeys.map((key) => {
        const fillKey = key;
        const canGradient = true;
        const role = key === 'primary' || key === 'secondary' ? key : undefined;
        const inherited = !!role && allowInheritance && palette.overrides?.[role] === false;
        const gradient = canGradient ? palette.gradients?.[fillKey] : undefined;
        const label = labels[key] ?? (key === 'default' ? translate('Card default') : displayLabel(key));
        return (
          <div key={key} className="appearance-palette-card space-y-2 p-3">
            {role && allowInheritance && (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  aria-label={`${displayLabel(mode)} ${label} ${translate('Override UI color')}`}
                  checked={!inherited}
                  onChange={(event) =>
                    onChange({ ...palette, overrides: { ...palette.overrides, [role]: event.target.checked } })
                  }
                />
                {translate('Override UI color')}
              </label>
            )}
            {inherited && (
              <p className="text-xs opacity-75">{translate('Uses the shared UI color until overridden.')}</p>
            )}
            <fieldset disabled={inherited} className="space-y-2 disabled:opacity-60">
              <label className="flex items-center justify-between gap-2 text-sm">
                {label}
                <input
                  aria-label={
                    mode === 'UI' && role
                      ? translate(role === 'primary' ? 'UI primary color' : 'UI secondary color')
                      : displayLabel(mode) + ' ' + label
                  }
                  type="color"
                  value={
                    gradient
                      ? paletteKeys.includes(gradient.from as PaletteKey)
                        ? palette[gradient.from as PaletteKey]
                        : gradient.from
                      : palette[key]
                  }
                  onChange={(event) =>
                    onChange({
                      ...palette,
                      [key]: event.target.value,
                      ...(gradient
                        ? { gradients: { ...palette.gradients, [key]: { ...gradient, from: event.target.value } } }
                        : {}),
                    })
                  }
                />
              </label>
              {canGradient && (
                <>
                  <select
                    aria-label={translate('{{value1}} {{value2}} fill', { value1: displayLabel(mode), value2: label })}
                    className="planning-input w-full"
                    value={gradient?.kind ?? 'solid'}
                    onChange={(event) => {
                      const gradients = { ...palette.gradients };
                      if (event.target.value === 'solid') delete gradients[fillKey];
                      else
                        gradients[fillKey] = {
                          from: palette[key],
                          to: palette.accent1,
                          angle: 135,
                          ...gradient,
                          kind: event.target.value as 'linear' | 'radial',
                        };
                      onChange({ ...palette, gradients });
                    }}
                  >
                    <option value="solid">{translate('Solid')}</option>
                    <option value="linear">{translate('Linear gradient')}</option>
                    <option value="radial">{translate('Radial gradient')}</option>
                  </select>
                  {gradient && (
                    <>
                      <label className="flex items-center justify-between text-sm">
                        {translate('Second color')}
                        <input
                          aria-label={translate('{{value1}} {{value2}} second color', {
                            value1: displayLabel(mode),
                            value2: label,
                          })}
                          type="color"
                          value={
                            paletteKeys.includes(gradient.to as PaletteKey)
                              ? palette[gradient.to as PaletteKey]
                              : gradient.to
                          }
                          onChange={(event) =>
                            onChange({
                              ...palette,
                              gradients: { ...palette.gradients, [key]: { ...gradient, to: event.target.value } },
                            })
                          }
                        />
                      </label>
                      {gradient.kind === 'linear' && (
                        <label className="flex gap-2 items-center text-sm">
                          {translate('Angle')}
                          <input
                            aria-label={translate('{{value1}} {{value2}} angle', {
                              value1: displayLabel(mode),
                              value2: label,
                            })}
                            className="min-w-0 w-full"
                            type="range"
                            min="0"
                            max="360"
                            step="15"
                            value={gradient.angle}
                            onChange={(event) =>
                              onChange({
                                ...palette,
                                gradients: {
                                  ...palette.gradients,
                                  [key]: { ...gradient, angle: Number(event.target.value) },
                                },
                              })
                            }
                          />
                          {gradient.angle}°
                        </label>
                      )}
                    </>
                  )}
                  <div
                    aria-label={translate('{{value1}} {{value2}} preview', {
                      value1: displayLabel(mode),
                      value2: label,
                    })}
                    className="h-8 rounded-lg border border-current/15"
                    style={{ background: paletteBackground(palette, fillKey) }}
                  />
                </>
              )}
            </fieldset>
          </div>
        );
      })}
    </div>
  );
}
