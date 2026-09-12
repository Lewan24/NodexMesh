import type {
  BoardItem,
  FontFamily,
  TypographySettings,
} from '@/entities/board/types';

export const FONT_FAMILIES: {
  value: FontFamily;
  label: string;
  css: string;
}[] = [
  { value: 'caveat', label: 'Caveat · Handwriting', css: '"Caveat", cursive' },
  { value: 'kalam', label: 'Kalam · Sketch', css: '"Kalam", cursive' },
  { value: 'patrick-hand', label: 'Patrick Hand · Notes', css: '"Patrick Hand", cursive' },
  { value: 'comic-neue', label: 'Comic Neue · Playful', css: '"Comic Neue", cursive' },
  { value: 'architects-daughter', label: 'Architects Daughter · Draft', css: '"Architects Daughter", cursive' },

  { value: 'short-stack', label: 'Short Stack · Playful', css: '"Short Stack", cursive' },
  { value: 'shantell-sans', label: 'Shantell Sans · Handwritten', css: '"Shantell Sans", sans-serif' },
  { value: 'mynerve', label: 'Mynerve · Casual', css: '"Mynerve", cursive' },
  { value: 'schoolbell', label: 'Schoolbell · Notes', css: '"Schoolbell", cursive' },
  { value: 'mansalva', label: 'Mansalva · Sketch', css: '"Mansalva", cursive' },
  { value: 'walter-turncoat', label: 'Walter Turncoat · Rough', css: '"Walter Turncoat", cursive' },
  { value: 'patrick-hand-sc', label: 'Patrick Hand SC · Small Caps', css: '"Patrick Hand SC", cursive' },
  { value: 'indie-flower', label: 'Indie Flower · Handwriting', css: '"Indie Flower", cursive' },
  { value: 'gloria-hallelujah', label: 'Gloria Hallelujah · Handwriting', css: '"Gloria Hallelujah", cursive' },

  {
    value: 'sans',
    label: 'Sans',
    css: 'Inter, ui-sans-serif, system-ui, sans-serif',
  },
  {
    value: 'serif',
    label: 'Serif',
    css: 'ui-serif, Georgia, Cambria, serif',
  },
  {
    value: 'mono',
    label: 'Mono',
    css: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  {
    value: 'arial',
    label: 'Arial',
    css: 'Arial, sans-serif',
  },
  {
    value: 'georgia',
    label: 'Georgia',
    css: 'Georgia, serif',
  },
  {
    value: 'verdana',
    label: 'Verdana',
    css: 'Verdana, sans-serif',
  },
  {
    value: 'trebuchet',
    label: 'Trebuchet',
    css: '"Trebuchet MS", sans-serif',
  },
];

export const FONT_SIZE_PRESETS = [
  12,
  14,
  16,
  20,
  24,
  32,
];

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 96;

export const DEFAULT_FONT_FAMILY: FontFamily =
  'short-stack';

export function getFontFamilyCss(
  family?: FontFamily,
): string {
  if (!family) return 'var(--project-font, "Short Stack", cursive)';
  const resolvedFamily =
    family ??
    DEFAULT_FONT_FAMILY;

  return (
    FONT_FAMILIES.find(
      option =>
        option.value ===
        resolvedFamily,
    )?.css ??
    'Inter, ui-sans-serif, system-ui, sans-serif'
  );
}

export function getTypographyStyle(
  item: BoardItem,
): React.CSSProperties {
  const typography = item.typography;

  return {
    fontFamily: getFontFamilyCss(
      typography?.fontFamily,
    ),
    fontSize: typography?.fontSize
      ? `${typography.fontSize}px`
      : undefined,
    fontWeight: typography?.bold
      ? 700
      : undefined,
    fontStyle: typography?.italic
      ? 'italic'
      : undefined,
    textAlign:
      typography?.textAlign ??
      undefined,
  };
}

export function updateTypography(
  item: BoardItem,
  patch: Partial<TypographySettings>,
): BoardItem {
  return {
    ...item,
    typography: {
      ...item.typography,
      ...patch,
    },
  } as BoardItem;
}
