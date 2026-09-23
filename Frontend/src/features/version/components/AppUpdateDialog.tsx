import { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink, Rocket } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/dialogs/Modal';
import { checkForAppUpdate, type AppVersionCheck } from '@/features/version/services/versionApi';
import './appUpdateDialog.css';

export default function AppUpdateDialog() {
  const { t } = useTranslation();
  const [versionCheck, setVersionCheck] = useState<AppVersionCheck | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const abort = new AbortController();

    void checkForAppUpdate(fetch, import.meta.env.VITE_API_BASE_URL || '/api/v1', abort.signal)
      .then((result) => {
        if (result.updateAvailable) setVersionCheck(result);
      })
      .catch(() => {
        // An unavailable update service must never prevent the application from opening.
      });

    return () => abort.abort();
  }, []);

  if (!versionCheck || dismissed) return null;

  return (
    <Modal centered label={t('Update available')} onClose={() => setDismissed(true)}>
      <form
        className="update-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-dialog-title"
        aria-describedby="update-dialog-description"
        onSubmit={(event) => {
          event.preventDefault();
          setDismissed(true);
        }}
      >
        <div className="update-dialog-icon" aria-hidden="true">
          <Rocket size={24} strokeWidth={2} />
        </div>

        <div className="update-dialog-copy">
          <span className="update-dialog-eyebrow">{t('New release')}</span>
          <h2 id="update-dialog-title">{t('An application update is available')}</h2>
          <p id="update-dialog-description">
            {t('Contact your administrator to update the application to the latest version.')}
          </p>
        </div>

        <div className="update-dialog-versions" aria-label={t('Version comparison')}>
          <div>
            <span>{t('Current version')}</span>
            <strong>v{versionCheck.currentVersion}</strong>
          </div>
          <div aria-hidden="true" className="update-dialog-arrow">
            <ArrowRight size={18} />
          </div>
          <div>
            <span>{t('Latest version')}</span>
            <strong>v{versionCheck.latestVersion}</strong>
          </div>
        </div>

        <div className="update-dialog-actions">
          <a href={versionCheck.releaseUrl} target="_blank" rel="noreferrer">
            {t('View release changes')}
            <ExternalLink size={15} aria-hidden="true" />
          </a>
          <button type="submit">{t('I understand')}</button>
        </div>
      </form>
    </Modal>
  );
}
