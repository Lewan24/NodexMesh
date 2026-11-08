import { useTranslation } from 'react-i18next';
interface ColorSwatchProps {
  color: string;
  active?: boolean;
  size?: number;
  onClick: () => void;
}

export default function ColorSwatch({ color, active = false, size = 12, onClick }: ColorSwatchProps) {
  useTranslation();
  return (
    <button
      onClick={onClick}
      title={color}
      className="rounded-full border transition-all hover:scale-125 flex-shrink-0 cursor-pointer"
      style={{
        width: active ? size + 3 : size,
        height: active ? size + 3 : size,
        background: color,
        borderColor: active ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: active ? '0 0 0 2px color-mix(in srgb, var(--color-accent) 40%, transparent)' : 'none',
      }}
    />
  );
}
