import { createContext, lazy, Suspense, useContext, useState, type ReactNode } from 'react';
import { BookOpen, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { translate } from '@/shared/i18n';
import './userGuide.css';

const UserGuideDialog = lazy(() => import('./UserGuideDialog'));
const Context = createContext({ openGuide: () => {}, welcome: false });
const preferenceKey = (userId: string) => `nodexmesh.user-guide.${userId}`;

function shouldWelcome(userId: string): boolean {
  try {
    return (
      localStorage.getItem(preferenceKey(userId)) !== 'dismissed' &&
      sessionStorage.getItem(preferenceKey(userId)) !== 'seen'
    );
  } catch {
    return true;
  }
}

export function UserGuideButton({ compact = false }: { compact?: boolean }) {
  useTranslation();
  const { openGuide, welcome } = useContext(Context);
  return (
    <button
      type="button"
      className={`user-guide-trigger${compact ? ' user-guide-trigger-compact' : ''}`}
      data-guide-highlight={welcome || undefined}
      data-read-only-action="true"
      aria-label={translate('User guide')}
      aria-haspopup="dialog"
      data-tooltip={translate('User guide')}
      data-tooltip-description={translate('Explore tools, shortcuts and illustrated step-by-step instructions.')}
      onClick={openGuide}
    >
      <BookOpen size={19} aria-hidden="true" />
      {!compact && <span>{translate('User guide')}</span>}
    </button>
  );
}

export default function UserGuideProvider({ userId, children }: { userId: string; children: ReactNode }) {
  useTranslation();
  const [open, setOpen] = useState(false);
  const [welcome, setWelcome] = useState(() => shouldWelcome(userId));
  const [dontShow, setDontShow] = useState(false);
  const dismiss = () => {
    setWelcome(false);
    try {
      sessionStorage.setItem(preferenceKey(userId), 'seen');
      if (dontShow) localStorage.setItem(preferenceKey(userId), 'dismissed');
    } catch {
      // The guide remains usable when browser storage is blocked.
    }
  };
  const openGuide = () => {
    dismiss();
    setOpen(true);
  };
  return (
    <Context value={{ openGuide, welcome }}>
      {children}
      {welcome && !open && (
        <section
          className="user-guide-welcome"
          role="dialog"
          aria-label={translate('New here? Start with the guide')}
          data-read-only-action="true"
        >
          <button
            type="button"
            className="user-guide-welcome-close"
            aria-label={translate('Close guide introduction')}
            onClick={dismiss}
          >
            <X size={17} aria-hidden="true" />
          </button>
          <BookOpen size={24} aria-hidden="true" />
          <h2>{translate('New here? Start with the guide')}</h2>
          <p>
            {translate(
              'Open illustrated instructions with the highlighted User guide button below. In edit mode, find it at the bottom of Tools. You can also open the guide from your profile or administration.',
            )}
          </p>
          <label>
            <input type="checkbox" checked={dontShow} onChange={(event) => setDontShow(event.target.checked)} />
            {translate('Do not show again')}
          </label>
          <div>
            <button type="button" className="btn-accent" onClick={openGuide}>
              {translate('Open guide')}
            </button>
            <button type="button" className="btn-ghost" onClick={dismiss}>
              {translate('Maybe later')}
            </button>
          </div>
        </section>
      )}
      {open && (
        <Suspense
          fallback={
            <div className="user-guide-loading" role="status">
              {translate('Loading guide…')}
            </div>
          }
        >
          <UserGuideDialog onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </Context>
  );
}
