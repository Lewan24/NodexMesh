import { useEffect, useState } from 'react';

interface CustomColorInputProps {
  value?: string;
  onChange: (color: string) => void;
  title?: string;
}

function normalizeHex(value: string): string | null {
  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toUpperCase();

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return null;
}

export default function CustomColorInput({ value, onChange, title = 'Custom color' }: CustomColorInputProps) {
  const fallback = normalizeHex(value ?? '') ?? '#7C3AED';
  const [text, setText] = useState(fallback);

  useEffect(() => {
    const normalized = normalizeHex(value ?? '');
    if (normalized) setText(normalized);
  }, [value]);

  const commit = () => {
    const normalized = normalizeHex(text);

    if (normalized) {
      setText(normalized);
      onChange(normalized);
    } else {
      setText(fallback);
    }
  };

  return (
    <div className="flex items-center gap-1" title={title}>
      <input
        type="color"
        value={fallback}
        onChange={event => {
          const color = event.target.value.toUpperCase();
          setText(color);
          onChange(color);
        }}
        className="w-6 h-6 p-0 border-0 rounded-md cursor-pointer bg-transparent"
      />

      <input
        value={text}
        onChange={event => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            commit();
            event.currentTarget.blur();
          }

          if (event.key === 'Escape') {
            setText(fallback);
            event.currentTarget.blur();
          }
        }}
        spellCheck={false}
        className="w-[72px] h-6 px-1.5 rounded-md text-[10px] font-mono outline-none"
        style={{
          color: 'var(--color-text-primary)',
          backgroundColor: 'var(--color-surface-alt)',
          border: '1px solid var(--color-border)',
        }}
      />
    </div>
  );
}