import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { LockKeyhole } from 'lucide-react';
import './itemLockBadge.css';

export default function ItemLockBadge({ inherited = false }: { inherited?: boolean }) {
  useTranslation();
  const label = inherited ? translate('Movement locked: contains a locked item') : translate('Item locked');
  return (
    <button
      type="button"
      data-read-only-action="true"
      aria-label={label}
      data-tooltip={label}
      data-tooltip-on-click="true"
      data-tooltip-description={
        inherited
          ? translate('This frame cannot move while it contains a locked item.')
          : [
              translate('Moving and manual resizing are blocked. The current height stays fixed.'),
              translate('Content can still be edited. Extra content scrolls inside the item.'),
            ].join('\n')
      }
      className="item-lock-badge absolute -top-2 -left-2 z-50 w-6 h-6 rounded-sm border shadow-sm flex items-center justify-center"
      style={{ background: '#facc15', borderColor: '#ca8a04', color: '#422006' }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <LockKeyhole size={13} strokeWidth={2.5} aria-hidden="true" />
    </button>
  );
}
