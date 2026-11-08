import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';

interface EditBarButtonProps {
  disabled?: boolean;
  active?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}

export default function EditBarButton({
  active = false,
  disabled = false,
  title,
  onClick,
  children,
}: EditBarButtonProps) {
  useTranslation();
  return (
    <button
      disabled={disabled}
      aria-pressed={active}
      title={title}
      onClick={onClick}
      className="h-8 min-w-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium transition-colors flex-shrink-0"
      style={{
        opacity: disabled ? 0.35 : 1,
        backgroundColor: active ? 'color-mix(in srgb, var(--color-accent) 15%, transparent)' : 'transparent',
        color: active ? 'var(--color-accent-ink)' : 'var(--color-text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export function EditBarDivider() {
  useTranslation();
  return <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />;
}
