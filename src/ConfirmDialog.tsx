interface Props {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message = "This can't be undone.",
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(8,16,20,0.55)', backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-sm mx-4 rounded-3xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', animation: 'slide-up 0.15s ease forwards' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: 'rgba(255,107,138,0.12)', color: 'var(--color-danger-strong)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4h6v2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{title}</h2>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{message}</p>
        </div>

        <div className="flex items-center gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 text-sm font-semibold rounded-xl py-2.5 transition-colors"
            style={{ backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-sm font-semibold rounded-xl py-2.5 transition-colors"
            style={{ backgroundColor: 'var(--color-danger-strong)', color: 'white' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
