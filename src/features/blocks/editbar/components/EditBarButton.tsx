import type { ReactNode } from 'react';

interface EditBarButtonProps {
  active?: boolean;
  title?: string;
  onClick: () => void;
  children: ReactNode;
}

export default function EditBarButton({ active = false, title, onClick, children }: EditBarButtonProps) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="h-8 min-w-8 px-2 flex items-center justify-center rounded-lg text-sm font-medium transition-colors flex-shrink-0"
      style={{
        backgroundColor: active ? 'rgba(124, 58, 237,0.15)' : 'transparent',
        color: active ? '#7C3AED' : '#4a6070',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

export function EditBarDivider() {
  return <div className="w-px h-5 mx-1 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />;
}