interface CanvasLostPromptProps {
  visible: boolean;
  onReturnToBoard: () => void;
  onGoToFirstItem: () => void;
}

export default function CanvasLostPrompt({
  visible,
  onReturnToBoard,
  onGoToFirstItem,
}: CanvasLostPromptProps) {
  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{
        zIndex: 80,
      }}
    >
      <div
        className="pointer-events-auto flex flex-col items-center rounded-2xl border px-5 py-4"
        style={{
          backgroundColor:
            'var(--color-surface-translucent)',

          borderColor:
            'var(--color-border)',

          backdropFilter:
            'blur(12px)',

          boxShadow:
            '0 12px 36px rgba(0,0,0,0.14)',
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
          style={{
            backgroundColor:
              'rgba(124,58,237,0.1)',

            color:
              'var(--color-accent)',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle
              cx="12"
              cy="12"
              r="9"
            />

            <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4" />

            <path d="M12 17h.01" />
          </svg>
        </div>

        <p
          className="text-2xl font-semibold"
          style={{
            color:
              'var(--color-text-primary)',
          }}
        >
          Are you lost?
        </p>

        <span
            className="text-[9px] italic select-none"
            style={{
                marginTop: 1,
                color: 'var(--color-text-faint)',
                opacity: 0.45,
                letterSpacing: '0.03em',
            }}
            >
            baby girl
            </span>

        <p
          className="text-xl mt-1 mb-4 text-center"
          style={{
            color:
              'var(--color-text-muted)',
            maxWidth: 220,
          }}
        >
          Your board is somewhere else on the canvas.
        </p>

        <button
          onClick={onReturnToBoard}
          className="h-8 px-4 rounded-lg text-xl font-semibold transition-transform hover:scale-[1.03] active:scale-[0.98]"
          style={{
            backgroundColor:
              'var(--color-accent)',
            color: '#fff',
          }}
        >
          Return to board
        </button>

        <button
          onClick={onGoToFirstItem}
          className="mt-2 h-7 px-3 rounded-lg text-md transition-colors"
          style={{
            color:
              'var(--color-text-secondary)',
          }}
        >
          Go to first item
        </button>
      </div>
    </div>
  );
}