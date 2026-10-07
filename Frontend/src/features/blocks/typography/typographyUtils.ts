import { translate } from '@/shared/i18n';
import type { BoardItem, FontFamily, TypographySettings } from '@/entities/board/types';

export const SANS_FONT_STACK = '"DM Sans", Arial, sans-serif';
export const SERIF_FONT_STACK = '"Noto Serif", Georgia, Cambria, serif';
export const MONO_FONT_STACK = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
// Several decorative fonts only provide basic Latin. Use shipped fonts for missing glyphs
// instead of the device's unpredictable generic cursive face.
const handwritingFont = (family: string) => `"${family}", "Patrick Hand", ${SANS_FONT_STACK}`;

export const FONT_FAMILIES: { value: FontFamily; label: string; css: string }[] = [
  {
    value: 'caveat',
    get label() {
      return translate('Caveat · Handwriting');
    },
    css: handwritingFont('Caveat'),
  },
  {
    value: 'kalam',
    get label() {
      return translate('Kalam · Sketch');
    },
    css: handwritingFont('Kalam'),
  },
  {
    value: 'patrick-hand',
    get label() {
      return translate('Patrick Hand · Notes');
    },
    css: `"Patrick Hand", ${SANS_FONT_STACK}`,
  },
  {
    value: 'comic-neue',
    get label() {
      return translate('Comic Neue · Playful');
    },
    css: handwritingFont('Comic Neue'),
  },
  {
    value: 'architects-daughter',
    get label() {
      return translate('Architects Daughter · Draft');
    },
    css: handwritingFont('Architects Daughter'),
  },

  {
    value: 'short-stack',
    get label() {
      return translate('Short Stack · Playful');
    },
    css: handwritingFont('Short Stack'),
  },
  {
    value: 'shantell-sans',
    get label() {
      return translate('Shantell Sans · Handwritten');
    },
    css: handwritingFont('Shantell Sans'),
  },
  {
    value: 'mynerve',
    get label() {
      return translate('Mynerve · Casual');
    },
    css: handwritingFont('Mynerve'),
  },
  {
    value: 'schoolbell',
    get label() {
      return translate('Schoolbell · Notes');
    },
    css: handwritingFont('Schoolbell'),
  },
  {
    value: 'mansalva',
    get label() {
      return translate('Mansalva · Sketch');
    },
    css: handwritingFont('Mansalva'),
  },
  {
    value: 'walter-turncoat',
    get label() {
      return translate('Walter Turncoat · Rough');
    },
    css: handwritingFont('Walter Turncoat'),
  },
  {
    value: 'patrick-hand-sc',
    get label() {
      return translate('Patrick Hand SC · Small Caps');
    },
    css: handwritingFont('Patrick Hand SC'),
  },
  {
    value: 'indie-flower',
    get label() {
      return translate('Indie Flower · Handwriting');
    },
    css: handwritingFont('Indie Flower'),
  },
  {
    value: 'gloria-hallelujah',
    get label() {
      return translate('Gloria Hallelujah · Handwriting');
    },
    css: handwritingFont('Gloria Hallelujah'),
  },

  {
    value: 'sans',
    get label() {
      return translate('Sans');
    },
    css: SANS_FONT_STACK,
  },
  {
    value: 'serif',
    get label() {
      return translate('Serif');
    },
    css: SERIF_FONT_STACK,
  },
  {
    value: 'mono',
    get label() {
      return translate('Mono');
    },
    css: MONO_FONT_STACK,
  },
  { value: 'arial', label: 'Arial', css: `Arial, ${SANS_FONT_STACK}` },
  { value: 'georgia', label: 'Georgia', css: `Georgia, ${SERIF_FONT_STACK}` },
  { value: 'verdana', label: 'Verdana', css: `Verdana, ${SANS_FONT_STACK}` },
  { value: 'trebuchet', label: 'Trebuchet', css: `"Trebuchet MS", ${SANS_FONT_STACK}` },
];

export const FONT_SIZE_PRESETS = [12, 14, 16, 20, 24, 32];

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 96;

export const DEFAULT_FONT_FAMILY: FontFamily = 'short-stack';

export function getFontFamilyCss(family?: FontFamily): string {
  if (!family) return `var(--project-font, ${handwritingFont('Short Stack')})`;
  return FONT_FAMILIES.find((option) => option.value === family)?.css ?? SANS_FONT_STACK;
}

export function getTypographyStyle(item: BoardItem): React.CSSProperties {
  const typography = item.typography;

  return {
    fontFamily: getFontFamilyCss(typography?.fontFamily),
    fontSize: typography?.fontSize ? `${typography.fontSize}px` : undefined,
    fontWeight: typography?.bold ? 700 : undefined,
    fontStyle: typography?.italic ? 'italic' : undefined,
    textAlign: typography?.textAlign ?? undefined,
  };
}

export function updateTypography(item: BoardItem, patch: Partial<TypographySettings>): BoardItem {
  return { ...item, typography: { ...item.typography, ...patch } } as BoardItem;
}
