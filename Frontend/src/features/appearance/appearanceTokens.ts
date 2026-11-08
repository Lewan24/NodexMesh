import { accentPresentation, type Palette } from './appearanceModel';
import { contrastRatio, readableText } from '@/features/blocks/typography/textContrast';

/** Preserve the chosen hue, moving toward readable text only when contrast requires it. */
export function accentInk(color: string, surface: string): string {
  if (contrastRatio(color, surface) >= 4.5) return color;
  const expand = (value: string) => (value.length === 4 ? `#${[...value.slice(1)].map((c) => c + c).join('')}` : value);
  const source = expand(color);
  const target = readableText(surface);
  for (let step = 1; step <= 100; step++) {
    const amount = step / 100;
    const mixed = `#${[1, 3, 5]
      .map((offset) =>
        Math.round(
          parseInt(source.slice(offset, offset + 2), 16) * (1 - amount) +
            parseInt(target.slice(offset, offset + 2), 16) * amount,
        )
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
    if (contrastRatio(mixed, surface) >= 4.5) return mixed;
  }
  return target;
}

/** Primary = actions/selection; secondary = navigation, metadata and progress. */
export function paletteAccentTokens(palette: Palette): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const role of ['primary', 'secondary'] as const) {
    const name = role === 'primary' ? 'accent' : 'secondary';
    const presentation = accentPresentation(palette, role);
    tokens[`--color-${name}`] = palette[role];
    tokens[`--color-${name}-fill`] = presentation.background;
    tokens[`--color-on-${name}`] = presentation.foreground;
    tokens[`--color-${name}-ink`] = accentInk(palette[role], palette.default);
    tokens[`--color-${name}-soft`] = `color-mix(in srgb, ${palette[role]} 12%, transparent)`;
    tokens[`--color-${name}-soft-strong`] = `color-mix(in srgb, ${palette[role]} 24%, transparent)`;
  }
  return tokens;
}
