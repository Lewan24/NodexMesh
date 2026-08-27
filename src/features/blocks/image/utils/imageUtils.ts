export const DEFAULT_IMAGE_WIDTH = 220;
export const DEFAULT_IMAGE_HEIGHT = 178;
export const DEFAULT_IMAGE_BACKGROUND = '#08171d';

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