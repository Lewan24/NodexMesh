import { LockKeyhole } from 'lucide-react';

export default function ItemLockBadge({ inherited = false }: { inherited?: boolean }) {
  const label = inherited ? 'Movement locked: contains a locked item' : 'Item locked';
  return <span role="img" aria-label={label} title={label} className="absolute -top-2 -left-2 z-50 w-5 h-5 rounded-sm border shadow-sm flex items-center justify-center pointer-events-none" style={{ background: '#facc15', borderColor: '#ca8a04', color: '#422006' }}>
    <LockKeyhole size={13} strokeWidth={2.5} />
  </span>;
}
