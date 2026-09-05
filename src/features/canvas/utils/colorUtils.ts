export function colorWithOpacity(color: string, opacity = 1): string {
  const hex = color.replace('#', '');

  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return color;

  const normalized =
    hex.length === 3
      ? hex.split('').map(char => char + char).join('')
      : hex;

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const alpha = Math.max(0, Math.min(1, opacity));

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}