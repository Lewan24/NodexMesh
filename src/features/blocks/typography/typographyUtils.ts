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

export function getFontFamilyCss(
  family?: FontFamily,
): string {
  return (
    FONT_FAMILIES.find(
      option => option.value === family,
    )?.css ??
    FONT_FAMILIES[0]!.css
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