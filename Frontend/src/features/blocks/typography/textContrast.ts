/** Relative sRGB luminance, with CSS short hex support. */
export function luminance(color: string): number {
  let hex = color.trim().replace('#', '');
  if (hex.length === 3) hex = [...hex].map((value) => value + value).join('');
  if (!/^[\da-f]{6}$/i.test(hex)) return 1;
  const channels = [0, 2, 4].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}
export function contrastRatio(foreground: string, background: string): number {
  const a = luminance(foreground),
    b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function readableText(...backgrounds: string[]): string {
  const dark = '#000000',
    light = '#ffffff';
  const score = (color: string) => Math.min(...backgrounds.map((background) => contrastRatio(color, background)));
  return score(dark) >= score(light) ? dark : light;
}
