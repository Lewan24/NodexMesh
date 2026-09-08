import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  BoardItem,
} from '@/entities/board/types';

import {
  addTag,
  removeTag,
} from '@/features/tags/utils/tagUtils';

import CommentsDialog from '@/features/comments/CommentsDialog';

import {
  getActiveCommentStatus,
  getUnresolvedCommentCount,
} from '@/features/comments/utils/commentUtils';

interface ItemInspectorProps {
  items: BoardItem[];

  onUpdateAll: (
    updater: (item: BoardItem) => BoardItem,
  ) => void;

  onClose: () => void;
}

interface TagSummary {
  tag: string;
  count: number;
}

export default function ItemInspector({
  items,
  onUpdateAll,
  onClose,
}: ItemInspectorProps) {
  const [newTag, setNewTag] =
    useState('');

  const [
    commentsOpen,
    setCommentsOpen,
  ] = useState(false);

  const single =
    items.length === 1
      ? items[0]
      : null;

  useEffect(() => {
    setNewTag('');
    setCommentsOpen(false);
  }, [
    items
      .map(item => item.id)
      .join('|'),
  ]);

  const tagSummary =
    useMemo<TagSummary[]>(
      () => {
        const counts =
          new Map<string, number>();

        for (const item of items) {
          for (
            const tag of
              item.tags ?? []
          ) {
            counts.set(
              tag,
              (
                counts.get(tag) ??
                0
              ) + 1,
            );
          }
        }

        return Array.from(
          counts.entries(),
        )
          .map(
            ([tag, count]) => ({
              tag,
              count,
            }),
          )
          .sort(
            (a, b) =>
              a.tag.localeCompare(
                b.tag,
              ),
          );
      },
      [items],
    );

  if (items.length === 0) {
    return null;
  }

  const lockedCount =
    items.filter(
      item => item.locked,
    ).length;

  const allLocked =
    lockedCount ===
    items.length;

  const someLocked =
    lockedCount > 0 &&
    !allLocked;

  const handleLock = () => {
    /*
     * If everything is already locked:
     * unlock all.
     *
     * Mixed/unlocked:
     * lock all.
     */
    const nextLocked =
      !allLocked;

    onUpdateAll(
      current => ({
        ...current,
        locked: nextLocked,
      }),
    );
  };

  const handleAddTag = () => {
    if (!newTag.trim()) {
      return;
    }

    onUpdateAll(
      current => ({
        ...current,

        tags: addTag(
          current.tags,
          newTag,
        ),
      }),
    );

    setNewTag('');
  };

  const handleRemoveTag = (
    tag: string,
  ) => {
    onUpdateAll(
      current => ({
        ...current,

        tags: removeTag(
          current.tags,
          tag,
        ),
      }),
    );
  };

  const comments =
    single?.comments ?? [];

  const commentStatus =
    getActiveCommentStatus(
      comments,
    );

  const unresolvedCount =
    getUnresolvedCommentCount(
      comments,
    );

  return (
    <>
      <aside
        data-item-inspector="true"
        className="absolute right-3 top-50 z-40 w-72 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor:
            'var(--color-surface-translucent)',

          border:
            '1px solid var(--color-border)',

          backdropFilter:
            'blur(12px)',
        }}
        onMouseDown={event =>
          event.stopPropagation()
        }
      >
        {/* Header */}

        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom:
              '1px solid var(--color-border-soft)',
          }}
        >
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{
                color:
                  'var(--color-text-faint)',
              }}
            >
              {items.length === 1
                ? 'Item details'
                : 'Selection details'}
            </div>

            <div
              className="text-sm font-semibold capitalize mt-0.5"
              style={{
                color:
                  'var(--color-text-primary)',
              }}
            >
              {items.length === 1
                ? items[0]!.type
                : `${items.length} items`}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg"
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

        {/* Lock */}

        <section
          className="p-4"
          style={{
            borderBottom:
              '1px solid var(--color-border-soft)',
          }}
        >
          <div className="text-xs font-bold uppercase tracking-wide mb-2"
            style={{
              color:
                'var(--color-text-secondary)',
            }}
          >
            Position
          </div>

          <button
            type="button"
            onClick={handleLock}
            className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
            style={{
              backgroundColor:
                allLocked ||
                someLocked
                  ? 'var(--color-accent-soft)'
                  : 'var(--color-surface)',

              color:
                allLocked ||
                someLocked
                  ? 'var(--color-accent)'
                  : 'var(--color-text-secondary)',
            }}
          >
            <span className="text-xs font-semibold">
              {allLocked
                ? '🔒 Locked'
                : someLocked
                  ? '◐ Mixed'
                  : '🔓 Lock position'}
            </span>

            <span
              className="text-[10px]"
              style={{
                color:
                  'var(--color-text-faint)',
              }}
            >
              {items.length > 1
                ? `${lockedCount}/${items.length}`
                : allLocked
                  ? 'Locked'
                  : 'Unlocked'}
            </span>
          </button>
        </section>

        {/* Tags */}

        <section
          className="p-4"
          style={{
            borderBottom:
              '1px solid var(--color-border-soft)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-xs font-bold uppercase tracking-wide"
              style={{
                color:
                  'var(--color-text-secondary)',
              }}
            >
              Tags
            </span>

            <span
              className="text-[10px]"
              style={{
                color:
                  'var(--color-text-faint)',
              }}
            >
              {tagSummary.length}
            </span>
          </div>

          {tagSummary.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tagSummary.map(
                ({
                  tag,
                  count,
                }) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 rounded-lg px-2 py-1"
                    style={{
                      color:
                        'var(--color-accent)',

                      backgroundColor:
                        'var(--color-accent-soft)',

                      opacity:
                        count ===
                        items.length
                          ? 1
                          : 0.7,
                    }}
                  >
                    <span className="text-xs font-medium">
                      #{tag}
                    </span>

                    {items.length >
                      1 && (
                      <span
                        className="text-[9px]"
                        style={{
                          opacity:
                            0.65,
                        }}
                      >
                        {count}/
                        {
                          items.length
                        }
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleRemoveTag(
                          tag,
                        )
                      }
                      className="opacity-50 hover:opacity-100"
                      title={`Remove #${tag} from selected items`}
                    >
                      ×
                    </button>
                  </div>
                ),
              )}
            </div>
          ) : (
            <p
              className="text-xs mb-3"
              style={{
                color:
                  'var(--color-text-faint)',
              }}
            >
              No tags.
            </p>
          )}

          <div
            className="flex items-center rounded-xl border overflow-hidden"
            style={{
              backgroundColor:
                'var(--color-surface)',

              borderColor:
                'var(--color-border)',
            }}
          >
            <span
              className="pl-3 text-sm"
              style={{
                color:
                  'var(--color-text-faint)',
              }}
            >
              #
            </span>

            <input
              value={newTag}
              onChange={event =>
                setNewTag(
                  event.target.value,
                )
              }
              onKeyDown={event => {
                if (
                  event.key ===
                  'Enter'
                ) {
                  handleAddTag();
                }

                if (
                  event.key ===
                  'Escape'
                ) {
                  setNewTag('');
                }
              }}
              placeholder={
                items.length === 1
                  ? 'Add tag...'
                  : `Add to ${items.length} items...`
              }
              className="flex-1 min-w-0 bg-transparent outline-none px-1.5 py-2 text-xs"
              style={{
                color:
                  'var(--color-text-primary)',
              }}
            />

            <button
              type="button"
              onClick={
                handleAddTag
              }
              className="px-3 py-2 text-xs font-semibold"
              style={{
                color:
                  'var(--color-accent)',
              }}
            >
              Add
            </button>
          </div>
        </section>

        {/* Comments */}

        {single && (
          <section className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{
                  color:
                    'var(--color-text-secondary)',
                }}
              >
                Comments
              </span>

              <span
                className="text-[10px]"
                style={{
                  color:
                    'var(--color-text-faint)',
                }}
              >
                {comments.length}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setCommentsOpen(
                  true,
                )
              }
              className="w-full flex items-center justify-between rounded-xl px-3 py-2.5"
              style={{
                backgroundColor:
                  'var(--color-surface)',
              }}
            >
              <div className="flex items-center gap-2">
                <span>💬</span>

                <div className="text-left">
                  <div
                    className="text-xs font-semibold"
                    style={{
                      color:
                        'var(--color-text-primary)',
                    }}
                  >
                    {comments.length === 0
                      ? 'Add comment'
                      : `${comments.length} comments`}
                  </div>

                  {unresolvedCount >
                    0 && (
                    <div
                      className="text-[9px] mt-0.5"
                      style={{
                        color:
                          'var(--color-text-faint)',
                      }}
                    >
                      {
                        unresolvedCount
                      }{' '}
                      unresolved
                    </div>
                  )}
                </div>
              </div>

              {commentStatus && (
                <span
                  className="text-[9px] font-bold uppercase rounded-full px-2 py-1"
                  style={{
                    color:
                      getInspectorStatusColor(
                        commentStatus,
                      ),

                    backgroundColor:
                      'var(--color-surface-alt)',
                  }}
                >
                  {commentStatus}
                </span>
              )}
            </button>
          </section>
        )}

        {/* Multi hint */}

        {items.length > 1 && (
          <div
            className="px-4 py-3 text-[10px]"
            style={{
              borderTop:
                '1px solid var(--color-border-soft)',

              color:
                'var(--color-text-faint)',
            }}
          >
            Bulk changes apply to all{' '}
            {items.length} selected
            items.
          </div>
        )}
      </aside>

      {single &&
        commentsOpen && (
          <CommentsDialog
            item={single}
            onUpdate={
              onUpdateAll
            }
            onClose={() =>
              setCommentsOpen(
                false,
              )
            }
          />
        )}
    </>
  );
}

function getInspectorStatusColor(
  status: string,
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