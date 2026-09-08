import {
  useEffect,
  useState,
} from 'react';

import type {
  BoardItem,
  CommentStatus,
  ItemComment,
} from '@/entities/board/types';

import {
  createComment,
} from '@/features/comments/utils/commentUtils';

interface CommentsDialogProps {
  item: BoardItem;

  onUpdate: (
    updater: (item: BoardItem) => BoardItem,
  ) => void;

  onClose: () => void;
}

const STATUSES: {
  value: CommentStatus;
  label: string;
}[] = [
  {
    value: 'open',
    label: 'Open',
  },
  {
    value: 'todo',
    label: 'To do',
  },
  {
    value: 'in-progress',
    label: 'In progress',
  },
  {
    value: 'resolved',
    label: 'Resolved',
  },
];

export default function CommentsDialog({
  item,
  onUpdate,
  onClose,
}: CommentsDialogProps) {
  const [text, setText] =
    useState('');

  const [status, setStatus] =
    useState<CommentStatus>('open');

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () =>
      document.removeEventListener(
        'keydown',
        handleKeyDown,
      );
  }, [onClose]);

  const comments =
    item.comments ?? [];

  const add = () => {
    const value = text.trim();

    if (!value) return;

    const comment =
      createComment(
        value,
        status,
      );

    onUpdate(current => ({
      ...current,
      comments: [
        ...(current.comments ?? []),
        comment,
      ],
    }));

    setText('');
    setStatus('open');
  };

  const updateComment = (
    id: string,
    patch: Partial<ItemComment>,
  ) => {
    onUpdate(current => ({
      ...current,

      comments:
        current.comments?.map(
          comment =>
            comment.id === id
              ? {
                  ...comment,
                  ...patch,
                  updatedAt:
                    new Date().toISOString(),
                }
              : comment,
        ) ?? [],
    }));
  };

  const deleteComment = (
    id: string,
  ) => {
    onUpdate(current => ({
      ...current,

      comments:
        current.comments?.filter(
          comment =>
            comment.id !== id,
        ) ?? [],
    }));
  };

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center"
      style={{
        backgroundColor:
          'rgba(8,16,20,0.55)',
        backdropFilter: 'blur(3px)',
      }}
      onMouseDown={event => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-xl mx-4 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          maxHeight: '78vh',

          backgroundColor:
            'var(--color-surface)',

          border:
            '1px solid var(--color-border)',

          animation:
            'slide-up 0.15s ease forwards',
        }}
        onMouseDown={event =>
          event.stopPropagation()
        }
      >
        {/* Header */}

        <div
          className="flex items-center justify-between px-5 py-4"
          style={{
            borderBottom:
              '1px solid var(--color-border-soft)',
          }}
        >
          <div>
            <h2
              className="text-sm font-bold"
              style={{
                color:
                  'var(--color-text-primary)',
              }}
            >
              Comments
            </h2>

            <p
              className="text-[11px] mt-0.5"
              style={{
                color:
                  'var(--color-text-faint)',
              }}
            >
              {comments.length}{' '}
              {comments.length === 1
                ? 'comment'
                : 'comments'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl"
            style={{
              color:
                'var(--color-text-faint)',
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comment list */}

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3">
          {comments.length === 0 && (
            <div
              className="text-center py-8 text-xs"
              style={{
                color:
                  'var(--color-text-faint)',
              }}
            >
              No comments yet.
            </div>
          )}

          {comments.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onUpdate={patch =>
                updateComment(
                  comment.id,
                  patch,
                )
              }
              onDelete={() =>
                deleteComment(
                  comment.id,
                )
              }
            />
          ))}
        </div>

        {/* Add */}

        <div
          className="p-4"
          style={{
            borderTop:
              '1px solid var(--color-border-soft)',
          }}
        >
          <textarea
            rows={3}
            value={text}
            onChange={event =>
              setText(
                event.target.value,
              )
            }
            placeholder="Write a comment..."
            className="w-full resize-none rounded-xl border bg-transparent px-3 py-2.5 text-sm outline-none"
            style={{
              color:
                'var(--color-text-primary)',
              borderColor:
                'var(--color-border)',
              backgroundColor:
                'var(--color-surface-alt)',
            }}
          />

          <div className="flex items-center justify-between gap-3 mt-3">
            <select
              value={status}
              onChange={event =>
                setStatus(
                  event.target
                    .value as CommentStatus,
                )
              }
              className="h-9 rounded-xl border px-3 text-xs outline-none"
              style={{
                color:
                  'var(--color-text-primary)',

                backgroundColor:
                  'var(--color-surface-alt)',

                borderColor:
                  'var(--color-border)',
              }}
            >
              {STATUSES.map(
                option => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>

            <button
              type="button"
              onClick={add}
              disabled={
                !text.trim()
              }
              className="h-9 px-4 rounded-xl text-xs font-semibold transition-opacity disabled:opacity-40"
              style={{
                color: 'white',
                backgroundColor:
                  'var(--color-accent)',
              }}
            >
              Add comment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CommentCardProps {
  comment: ItemComment;

  onUpdate: (
    patch: Partial<ItemComment>,
  ) => void;

  onDelete: () => void;
}

function CommentCard({
  comment,
  onUpdate,
  onDelete,
}: CommentCardProps) {
  const [editing, setEditing] =
    useState(false);

  const [text, setText] =
    useState(comment.text);

  const commit = () => {
    const value = text.trim();

    if (value) {
      onUpdate({
        text: value,
      });
    }

    setEditing(false);
  };

  return (
    <div
      className="rounded-2xl border p-3"
      style={{
        borderColor:
          'var(--color-border-soft)',

        backgroundColor:
          'var(--color-surface-alt)',
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <select
          value={comment.status}
          onChange={event =>
            onUpdate({
              status:
                event.target
                  .value as CommentStatus,
            })
          }
          className="text-[10px] font-semibold uppercase tracking-wide rounded-lg px-2 py-1 outline-none"
          style={{
            color:
              getStatusColor(
                comment.status!,
              ),

            backgroundColor:
              'var(--color-surface)',
          }}
        >
          {STATUSES.map(
            option => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ),
          )}
        </select>

        <button
          type="button"
          onClick={onDelete}
          className="text-xs opacity-50 hover:opacity-100"
          style={{
            color:
              'var(--color-danger)',
          }}
        >
          Delete
        </button>
      </div>

      {editing ? (
        <textarea
          autoFocus
          value={text}
          rows={3}
          onChange={event =>
            setText(
              event.target.value,
            )
          }
          onBlur={commit}
          className="w-full bg-transparent resize-none outline-none text-sm"
          style={{
            color:
              'var(--color-text-primary)',
          }}
        />
      ) : (
        <p
          className="text-sm whitespace-pre-wrap break-words cursor-text"
          style={{
            color:
              'var(--color-text-primary)',
          }}
          onDoubleClick={() =>
            setEditing(true)
          }
        >
          {comment.text}
        </p>
      )}

      <div
        className="text-[9px] mt-2"
        style={{
          color:
            'var(--color-text-faint)',
        }}
      >
        {new Date(
          comment.createdAt,
        ).toLocaleString()}
      </div>
    </div>
  );
}

function getStatusColor(
  status: CommentStatus,
): string {
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