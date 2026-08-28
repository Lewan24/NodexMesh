interface ColorSwatchProps {
  color: string;
  active?: boolean;
  size?: number;
  onClick: () => void;
}

export default function ColorSwatch({ color, active = false, size = 12, onClick }: ColorSwatchProps) {
  return (
    <button
      onClick={onClick}
      title={color}
      className="rounded-full border transition-all hover:scale-125 flex-shrink-0"
      style={{
        width: active ? size + 3 : size,
        height: active ? size + 3 : size,
        backgroundColor: color,
        borderColor: active ? '#7C3AED' : 'rgba(0,0,0,0.15)',
        boxShadow: active ? '0 0 0 2px rgba(124, 58, 237,0.4)' : 'none',
      }}
    />
  );
}