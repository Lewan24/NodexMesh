export type NoteFontSize =
  | 'sm'
  | 'base'
  | 'lg';

export const NOTE_FONT_SIZE_CLASS: Record<
  NoteFontSize,
  string
> = {
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
};

export const MIN_NOTE_HEIGHT = 60;

export function isLightColor(
  hex: string,
): boolean {
  const red = parseInt(
    hex.slice(1, 3),
    16,
  );

  const green = parseInt(
    hex.slice(3, 5),
    16,
  );

  const blue = parseInt(
    hex.slice(5, 7),
    16,
  );

  return (
    (
      red * 299 +
      green * 587 +
      blue * 114
    ) /
      1000 >
    128
  );
}