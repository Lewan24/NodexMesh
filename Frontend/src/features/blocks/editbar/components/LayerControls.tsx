import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
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
  useTranslation();
  const buttonClass =
    'w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer flex-shrink-0 hover:bg-violet-500/15';

  return (
    <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--edit-bar-control)' }}>
      {/* Send to back */}
      <button
        type="button"
        onClick={onSendToBack}
        className={buttonClass}
        style={{ color: 'var(--color-text-secondary)' }}
        title={translate('Send to back')}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
        style={{ color: 'var(--color-text-secondary)' }}
        title={translate('Send backward')}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
        style={{ color: 'var(--color-text-secondary)' }}
        title={translate('Bring forward')}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
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
        style={{ color: 'var(--color-text-secondary)' }}
        title={translate('Bring to front')}
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="6" y="6" width="11" height="11" rx="2" />
          <path d="M8 19h9a2 2 0 0 0 2-2V8" />
          <path d="M12 8V3" />
          <path d="m9 6 3-3 3 3" />
        </svg>
      </button>
    </div>
  );
}
