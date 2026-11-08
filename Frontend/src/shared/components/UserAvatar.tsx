import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { translate } from '@/shared/i18n';
import { publicImageUrl } from '@/shared/lib/publicImage';
import Modal from './dialogs/Modal';

export default function UserAvatar({
  avatarId,
  name,
  size = 32,
  preview = true,
  onClick,
  label,
}: {
  avatarId?: string | null;
  name: string;
  size?: number;
  preview?: boolean;
  onClick?: () => void;
  label?: string;
}) {
  useTranslation();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState<string>();
  const source = publicImageUrl(avatarId);
  const visible = source && source !== failed;
  const content = visible ? (
    <img
      referrerPolicy="no-referrer"
      src={source}
      alt=""
      draggable={false}
      onError={() => setFailed(source)}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  ) : (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'
  );
  const style = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--color-accent-soft)',
    color: 'var(--color-accent)',
    fontSize: Math.max(10, size / 3),
    fontWeight: 600,
  } as const;
  return (
    <>
      {onClick || (preview && visible) ? (
        <button
          type="button"
          style={{ ...style, minWidth: Math.max(24, size), minHeight: Math.max(24, size), cursor: 'pointer' }}
          aria-label={label ?? translate('View profile photo of {{value1}}', { value1: name })}
          title={label ?? name}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            if (onClick) onClick();
            else setOpen(true);
          }}
        >
          {content}
        </button>
      ) : (
        <span style={style} role="img" aria-label={name}>
          {content}
        </span>
      )}
      {open && source && (
        <Modal centered label={translate('Profile photo')} onClose={() => setOpen(false)} readOnlyAction>
          <div
            className="p-4 space-y-3 rounded-2xl"
            style={{
              width: 'min(640px, calc(100vw - 24px))',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          >
            <header className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold truncate">{name}</h2>
              <button type="button" className="btn-ghost rounded-lg px-3 py-2 text-sm" onClick={() => setOpen(false)}>
                {translate('Close')}
              </button>
            </header>
            <img
              referrerPolicy="no-referrer"
              src={source}
              alt={name}
              style={{ display: 'block', width: '100%', maxHeight: '75dvh', objectFit: 'contain' }}
            />
          </div>
        </Modal>
      )}
    </>
  );
}
