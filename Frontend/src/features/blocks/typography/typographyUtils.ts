import { translate } from '@/shared/i18n';
import type { BoardItem, FontFamily, TypographySettings } from '@/entities/board/types';

export const FONT_FAMILIES: { value: FontFamily; label: string; css: string }[] = [
  {
    value: 'caveat',
    get label() {
      return translate('Caveat · Handwriting');
    },
    css: '"Caveat", cursive',
  },
  {
    value: 'kalam',
    get label() {
      return translate('Kalam · Sketch');
    },
    css: '"Kalam", cursive',
  },
  {
    value: 'patrick-hand',
    get label() {
      return translate('Patrick Hand · Notes');
    },
    css: '"Patrick Hand", cursive',
  },
  {
    value: 'comic-neue',
    get label() {
      return translate('Comic Neue · Playful');
    },
    css: '"Comic Neue", cursive',
  },
  {
    value: 'architects-daughter',
    get label() {
      return translate('Architects Daughter · Draft');
    },
    css: '"Architects Daughter", cursive',
  },

  {
    value: 'short-stack',
    get label() {
      return translate('Short Stack · Playful');
    },
    css: '"Short Stack", cursive',
  },
  {
    value: 'shantell-sans',
    get label() {
      return translate('Shantell Sans · Handwritten');
    },
    css: '"Shantell Sans", sans-serif',
  },
  {
    value: 'mynerve',
    get label() {
      return translate('Mynerve · Casual');
    },
    css: '"Mynerve", cursive',
  },
  {
    value: 'schoolbell',
    get label() {
      return translate('Schoolbell · Notes');
    },
    css: '"Schoolbell", cursive',
  },
  {
    value: 'mansalva',
    get label() {
      return translate('Mansalva · Sketch');
    },
    css: '"Mansalva", cursive',
  },
  {
    value: 'walter-turncoat',
    get label() {
      return translate('Walter Turncoat · Rough');
    },
    css: '"Walter Turncoat", cursive',
  },
  {
    value: 'patrick-hand-sc',
    get label() {
      return translate('Patrick Hand SC · Small Caps');
    },
    css: '"Patrick Hand SC", cursive',
  },
  {
    value: 'indie-flower',
    get label() {
      return translate('Indie Flower · Handwriting');
    },
    css: '"Indie Flower", cursive',
  },
  {
    value: 'gloria-hallelujah',
    get label() {
      return translate('Gloria Hallelujah · Handwriting');
    },
    css: '"Gloria Hallelujah", cursive',
  },

  {
    value: 'sans',
    get label() {
      return translate('Sans');
    },
    css: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  {
    value: 'serif',
    get label() {
      return translate('Serif');
    },
    css: 'ui-serif, Georgia, Cambria, serif',
  },
  {
    value: 'mono',
    get label() {
      return translate('Mono');
    },
    css: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  { value: 'arial', label: 'Arial', css: 'Arial, sans-serif' },
  { value: 'georgia', label: 'Georgia', css: 'Georgia, serif' },
  { value: 'verdana', label: 'Verdana', css: 'Verdana, sans-serif' },
  { value: 'trebuchet', label: 'Trebuchet', css: '"Trebuchet MS", sans-serif' },
];

export const FONT_SIZE_PRESETS = [12, 14, 16, 20, 24, 32];

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 96;

export const DEFAULT_FONT_FAMILY: FontFamily = 'short-stack';

export function getFontFamilyCss(family?: FontFamily): string {
  if (!family) return 'var(--project-font, "Short Stack", cursive)';
  const resolvedFamily = family ?? DEFAULT_FONT_FAMILY;

  return (
    FONT_FAMILIES.find((option) => option.value === resolvedFamily)?.css ??
    'Inter, ui-sans-serif, system-ui, sans-serif'
  );
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
