import type {
  CommentStatus,
  ItemComment,
} from '@/entities/board/types';

export function createComment(
  text: string,
  status?: CommentStatus,
): ItemComment {
  return {
    id: Math.random()
      .toString(36)
      .slice(2, 10),

    text: text.trim(),

    status,

    createdAt:
      new Date().toISOString(),
  };
}

export function getActiveCommentStatus(
  comments:
    | ItemComment[]
    | undefined,
): CommentStatus | undefined {
  const statuses =
    comments?.map(
      comment =>
        comment.status,
    ) ?? [];

  if (
    statuses.includes('todo')
  ) {
    return 'todo';
  }

  if (
    statuses.includes(
      'in-progress',
    )
  ) {
    return 'in-progress';
  }

  if (
    statuses.includes('open')
  ) {
    return 'open';
  }

  if (
    statuses.includes(
      'resolved',
    )
  ) {
    return 'resolved';
  }

  return undefined;
}