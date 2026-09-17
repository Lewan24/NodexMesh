import type { ItemComment } from '@/entities/board/types';

import { getActiveCommentStatus, getUnresolvedCommentCount } from '@/features/comments/utils/commentUtils';

interface ItemCommentBadgeProps {
  comments?: ItemComment[];
}

export default function ItemCommentBadge({ comments }: ItemCommentBadgeProps) {
  if (!comments?.length) {
    return null;
  }

  const status = getActiveCommentStatus(comments);

  const unresolved = getUnresolvedCommentCount(comments);

  return (
    <div
      className="absolute z-[55] pointer-events-none flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-semibold shadow-md"
      style={{
        right: -6,
        top: -10,

        color: status ? getStatusColor(status) : 'var(--color-text-secondary)',

        backgroundColor: 'var(--color-surface-translucent)',

        border: '1px solid var(--color-border-soft)',

        backdropFilter: 'blur(7px)',
      }}
    >
      <span>💬</span>

      <span>{comments.length}</span>

      {unresolved > 0 && (
        <>
          <span style={{ opacity: 0.4 }}>·</span>

          <span>{status}</span>
        </>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'todo':
      return '#FF6B8A';

    case 'in-progress':
      return '#FFBD65';

    case 'resolved':
      return '#38BDF8';

    default:
      return 'var(--color-text-secondary)';
  }
}
