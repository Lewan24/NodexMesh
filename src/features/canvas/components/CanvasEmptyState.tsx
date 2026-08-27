interface CanvasEmptyStateProps {
  visible: boolean;
}

export default function CanvasEmptyState({
  visible,
}: CanvasEmptyStateProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className="
        absolute
        inset-0
        flex
        items-center
        justify-center
        pointer-events-none
      "
    >
      <div
        className="text-center"
        style={{
          animation:
            'fade-in 0.4s ease forwards',
        }}
      >
        <div
          className="
            w-16
            h-16
            rounded-3xl
            flex
            items-center
            justify-center
            mx-auto
            mb-4
          "
          style={{
            backgroundColor:
              'rgba(255,255,255,0.7)',

            border:
              '1px solid rgba(0,0,0,0.1)',

            boxShadow:
              '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
          >
            <rect
              x="3"
              y="3"
              width="9"
              height="9"
              rx="1.5"
              fill="rgba(0,0,0,0.12)"
            />

            <rect
              x="14"
              y="3"
              width="9"
              height="9"
              rx="1.5"
              fill="rgba(0,0,0,0.08)"
            />

            <rect
              x="3"
              y="14"
              width="9"
              height="9"
              rx="1.5"
              fill="rgba(0,0,0,0.08)"
            />

            <rect
              x="14"
              y="14"
              width="9"
              height="9"
              rx="1.5"
              fill="rgba(0,0,0,0.05)"
            />
          </svg>
        </div>

        <p
          className="text-sm mb-1"
          style={{
            color:
              'var(--color-text-secondary)',
          }}
        >
          Empty board
        </p>

        <p
          className="text-xs"
          style={{
            color:
              'var(--color-text-muted)',
          }}
        >
          Select a tool from the sidebar to get started
        </p>
      </div>
    </div>
  );
}