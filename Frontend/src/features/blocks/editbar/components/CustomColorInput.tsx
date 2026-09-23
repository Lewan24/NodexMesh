import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
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

export default function CustomColorInput({
  value,
  onChange,
  title = translate('Custom color'),
}: CustomColorInputProps) {
  useTranslation();
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
    <div
      className="flex h-8 items-center gap-1 rounded-xl border p-1 shadow-sm"
      style={{ borderColor: 'var(--color-border-soft)', background: 'var(--color-surface)' }}
      title={title}
    >
      <input
        type="color"
        value={fallback}
        onChange={(event) => {
          const color = event.target.value.toUpperCase();
          setText(color);
          onChange(color);
        }}
        className="h-5 w-5 cursor-pointer rounded-md border-0 bg-transparent p-0"
      />

      <input
        aria-label={title + ' HEX'}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
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
        className="h-5 w-[62px] bg-transparent px-1 text-[10px] font-semibold uppercase outline-none"
        style={{ color: 'var(--color-text-secondary)' }}
      />
    </div>
  );
}
