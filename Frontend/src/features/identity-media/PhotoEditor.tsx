import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translate } from '@/shared/i18n';
import Modal from '@/shared/components/dialogs/Modal';
import { imageFileError, publicImageUrl } from '@/shared/lib/publicImage';
import { errorMessage } from '@/shared/api/errors';

export default function PhotoEditor({
  imageId,
  title,
  logo = false,
  disabled = false,
  onSave,
  onClose,
}: {
  imageId?: string | null;
  title: string;
  logo?: boolean;
  disabled?: boolean;
  onSave: (file: File | null) => Promise<void>;
  onClose: () => void;
}) {
  useTranslation();
  const helpId = useId();
  const errorId = useId();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState<string>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!file) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const save = async (value: File | null) => {
    setBusy(true);
    setError('');
    try {
      await onSave(value);
      onClose();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      centered
      label={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        className="rounded-2xl p-5 space-y-4 overflow-auto"
        style={{
          width: 'min(460px, calc(100vw - 24px))',
          maxHeight: 'calc(100dvh - 24px)',
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
        onSubmit={(event) => {
          event.preventDefault();
          if (file && !busy && !disabled) void save(file);
        }}
        aria-busy={busy}
      >
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" disabled={busy} className="btn-ghost rounded-lg px-3 py-2 text-sm" onClick={onClose}>
            {translate('Close')}
          </button>
        </header>
        {(preview || publicImageUrl(imageId)) && (
          <img
            referrerPolicy="no-referrer"
            src={preview ?? publicImageUrl(imageId)}
            alt={translate(preview ? 'New image preview' : 'Current image')}
            style={{
              display: 'block',
              width: '100%',
              height: 220,
              objectFit: 'contain',
              borderRadius: 12,
              background: 'var(--color-surface-alt)',
            }}
          />
        )}
        <label className="block text-sm font-medium">
          {translate('Choose image')}
          <input
            autoFocus
            type="file"
            accept={
              logo
                ? 'image/png,image/jpeg,image/gif,image/webp,image/svg+xml'
                : 'image/png,image/jpeg,image/gif,image/webp'
            }
            disabled={busy || disabled}
            className="block w-full mt-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:bg-(--color-accent-soft) file:text-(--color-accent)"
            aria-describedby={`${helpId} ${errorId}`}
            aria-invalid={!!error}
            onChange={(event) => {
              const candidate = event.target.files?.[0];
              if (!candidate) return;
              const problem = imageFileError(candidate, logo);
              setError(problem ? translate(problem) : '');
              setFile(problem ? undefined : candidate);
              event.target.value = '';
            }}
          />
        </label>
        <p id={helpId} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {disabled
            ? translate('Image uploads are unavailable in the demo.')
            : translate(
                logo
                  ? 'PNG, JPEG, GIF, WebP or static SVG. Up to 10 MB. Replacing removes the previous file.'
                  : 'PNG, JPEG, GIF or WebP. Up to 10 MB. Replacing removes the previous file.',
              )}
        </p>
        {error && (
          <p id={errorId} role="alert" className="text-sm" style={{ color: 'var(--color-danger-strong)' }}>
            {error}
          </p>
        )}
        <footer className="flex flex-wrap items-center justify-end gap-2">
          {imageId && (
            <button
              type="button"
              disabled={busy || disabled}
              className="btn-ghost mr-auto rounded-lg px-3 py-2 text-sm"
              onClick={() => void save(null)}
            >
              {translate('Remove image')}
            </button>
          )}
          <button type="button" disabled={busy} className="btn-ghost rounded-lg px-3 py-2 text-sm" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button
            type="submit"
            disabled={!file || busy || disabled || !!error}
            className="btn-accent rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {translate(busy ? 'Saving…' : 'Save image')}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
