import { ShieldCheck } from 'lucide-react';
import { translate } from '@/shared/i18n';

export default function SecurityNotice() {
  return (
    <aside
      className="rounded-2xl border p-4 text-left sm:p-5"
      style={{ background: 'var(--color-accent-soft)', borderColor: 'var(--color-border)' }}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <ShieldCheck size={20} className="shrink-0" style={{ color: 'var(--color-accent)' }} aria-hidden="true" />
        <h2 className="text-sm font-semibold">{translate('Security data collection')}</h2>
      </div>
      <div className="space-y-3 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
        <p>
          {translate(
            'We record your IP address, website traffic, requests and sign-in activity to protect accounts, detect abuse and investigate incidents.',
          )}
        </p>
        <p>
          {translate(
            'This collection is required to use NodexMesh. Security records have a separate retention policy and may remain after account deletion.',
          )}
        </p>
      </div>
    </aside>
  );
}
