import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isMockDataSource } from '@/app/services';
import { translate } from '@/shared/i18n';
import { errorMessage } from '@/shared/api/errors';
import { identityMedia } from '@/features/identity-media/api';
import PhotoEditor from '@/features/identity-media/PhotoEditor';
import { useBranding } from './BrandingProvider';
import Brand from './Brand';

export default function AdminBrandingPanel() {
  useTranslation();
  const branding = useBranding();
  const [draft, setName] = useState<string>();
  const name = draft ?? branding.applicationName;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <section
      className="max-w-2xl space-y-5 rounded-2xl border p-5 sm:p-6"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
    >
      <div>
        <h2 className="text-lg font-semibold">{translate('Application branding')}</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {translate('Name and logo are visible to everyone, including the sign-in page.')}
        </p>
      </div>
      <Brand />
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          setError('');
          setSaved(false);
          void identityMedia
            .branding(name.trim())
            .then((value) => {
              branding.update(value);
              setName(undefined);
              setSaved(true);
            })
            .catch((cause) => setError(errorMessage(cause)))
            .finally(() => setBusy(false));
        }}
      >
        <label className="block text-sm font-medium">
          {translate('Application name')}
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input-theme block w-full mt-2 p-3"
          />
        </label>
        <button
          type="submit"
          disabled={busy || isMockDataSource || !name.trim()}
          className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          {translate('Save name')}
        </button>
      </form>
      <button
        type="button"
        className="btn-accent rounded-xl px-4 py-2 text-sm font-semibold"
        onClick={() => setEditing(true)}
      >
        {translate('Change application logo')}
      </button>
      {isMockDataSource && <p className="text-xs">{translate('Image uploads are unavailable in the demo.')}</p>}
      {error && (
        <p role="alert" className="text-sm" style={{ color: 'var(--color-danger-strong)' }}>
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm">
          {translate('Application branding updated.')}
        </p>
      )}
      {editing && (
        <PhotoEditor
          title={translate('Application logo')}
          logo
          imageId={branding.logoId}
          disabled={isMockDataSource}
          onClose={() => setEditing(false)}
          onSave={async (file) => {
            branding.update(await identityMedia.logo(file));
          }}
        />
      )}
    </section>
  );
}
