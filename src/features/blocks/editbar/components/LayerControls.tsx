interface LayerControlsProps {
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}

export default function LayerControls({
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: LayerControlsProps) {
  const buttonClass =
    'w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer flex-shrink-0';

  const handleEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
    event.currentTarget.style.color = 'var(--color-text-primary)';
  };

  const handleLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.currentTarget.style.backgroundColor = 'transparent';
    event.currentTarget.style.color = 'var(--color-text-faint)';
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Send to back */}
      <button
        type="button"
        onClick={onSendToBack}
        className={buttonClass}
        style={{ color: 'var(--color-text-faint)' }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        title="Send to back"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="7" width="11" height="11" rx="2" />
          <path d="M5 5h9a2 2 0 0 1 2 2" />
          <path d="M12 21v-5" />
          <path d="m9 18 3 3 3-3" />
        </svg>
      </button>

      {/* Send backward */}
      <button
        type="button"
        onClick={onSendBackward}
        className={buttonClass}
        style={{ color: 'var(--color-text-faint)' }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        title="Send backward"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <rect x="5" y="5" width="10" height="10" rx="2" />
          <path d="M7 19h4" />
          <path d="m7 19 2-2" />
          <path d="m7 19 2 2" />
        </svg>
      </button>

      {/* Bring forward */}
      <button
        type="button"
        onClick={onBringForward}
        className={buttonClass}
        style={{ color: 'var(--color-text-faint)' }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        title="Bring forward"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <rect x="5" y="5" width="10" height="10" rx="2" />
          <path d="M17 5h-4" />
          <path d="m17 5-2-2" />
          <path d="m17 5-2 2" />
        </svg>
      </button>

      {/* Bring to front */}
      <button
        type="button"
        onClick={onBringToFront}
        className={buttonClass}
        style={{ color: 'var(--color-text-faint)' }}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        title="Bring to front"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="6" y="6" width="11" height="11" rx="2" />
          <path d="M8 19h9a2 2 0 0 0 2-2V8" />
          <path d="M12 8V3" />
          <path d="m9 6 3-3 3 3" />
        </svg>
      </button>
    </div>
  );
}