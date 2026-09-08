import type {
  CommentStatus,
  ItemComment,
} from '@/entities/board/types';

export function createComment(
  text: string,
  status: CommentStatus,
): ItemComment {
  return {
    id: Math.random()
      .toString(36)
      .slice(2, 10),

    text: text.trim(),
    status,
    createdAt: new Date().toISOString(),
  };
}

export function getActiveCommentStatus(
  comments?: ItemComment[],
): CommentStatus | undefined {
  if (!comments?.length) {
    return undefined;
  }

  const unresolved =
    comments.filter(
      comment =>
        comment.status !== 'resolved',
    );

  if (
    unresolved.some(
      comment =>
        comment.status === 'todo',
    )
  ) {
    return 'todo';
  }

  if (
    unresolved.some(
      comment =>
        comment.status === 'in-progress',
    )
  ) {
    return 'in-progress';
  }

  if (
    unresolved.some(
      comment =>
        comment.status === 'open',
    )
  ) {
    return 'open';
  }

  return 'resolved';
}

export function getUnresolvedCommentCount(
  comments?: ItemComment[],
): number {
  return (
    comments?.filter(
      comment =>
        comment.status !== 'resolved',
    ).length ?? 0
  );
}