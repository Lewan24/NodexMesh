import { useState } from 'react';
import { useBranding } from './BrandingProvider';
import { publicImageUrl } from '@/shared/lib/publicImage';

export default function Brand({ chrome = false, vertical = false }: { chrome?: boolean; vertical?: boolean }) {
  const { applicationName, logoId } = useBranding();
  const [failed, setFailed] = useState<string>();
  const source = publicImageUrl(logoId);
  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${vertical ? 'flex-col' : ''}`} title={applicationName}>
      <span
        className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-sm"
        style={{
          width: vertical ? 44 : 32,
          height: vertical ? 44 : 32,
          background: '#ffffff',
          borderColor: '#ded8eb',
          color: '#6023b4',
        }}
      >
        {source && source !== failed ? (
          <img
            referrerPolicy="no-referrer"
            src={source}
            alt=""
            onError={() => setFailed(source)}
            style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 3 }}
          />
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" opacity=".65" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" opacity=".65" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" opacity=".35" />
          </svg>
        )}
      </span>
      <span
        className="instance-brand-name min-w-0 max-w-56 truncate text-sm font-bold"
        style={{ color: chrome ? 'var(--color-chrome-text-strong)' : 'var(--color-text-primary)' }}
      >
        {applicationName}
      </span>
    </span>
  );
}
