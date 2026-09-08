import {
  useEffect,
  useState,
} from 'react';

import type { BoardItem } from '@/entities/board/types';

import {
  addTag,
  removeTag,
  renameTag,
} from '@/features/tags/utils/tagUtils';

interface ItemInspectorProps {
  item: BoardItem | null;

  onUpdate: (
    updater: (item: BoardItem) => BoardItem,
  ) => void;

  onClose: () => void;
}

export default function ItemInspector({
  item,
  onUpdate,
  onClose,
}: ItemInspectorProps) {
  const [newTag, setNewTag] = useState('');
  const [editingTag, setEditingTag] =
    useState<string | null>(null);
  const [editingValue, setEditingValue] =
    useState('');

  useEffect(() => {
    setNewTag('');
    setEditingTag(null);
    setEditingValue('');
  }, [item?.id]);

  if (!item) return null;

  const tags = item.tags ?? [];

  const handleAdd = () => {
    if (!newTag.trim()) return;

    onUpdate(current => ({
      ...current,
      tags: addTag(
        current.tags,
        newTag,
      ),
    }));

    setNewTag('');
  };

  const handleRemove = (
    tag: string,
  ) => {
    onUpdate(current => ({
      ...current,
      tags: removeTag(
        current.tags,
        tag,
      ),
    }));
  };

  const startEditing = (
    tag: string,
  ) => {
    setEditingTag(tag);
    setEditingValue(tag);
  };

  const commitEditing = () => {
    if (!editingTag) return;

    onUpdate(current => ({
      ...current,
      tags: renameTag(
        current.tags,
        editingTag,
        editingValue,
      ),
    }));

    setEditingTag(null);
    setEditingValue('');
  };

  return (
    <aside
      data-item-inspector="true"
      className="absolute right-3 top-50 z-40 w-72 rounded-2xl shadow-2xl overflow-hidden"
      style={{
        backgroundColor:
          'var(--color-surface-translucent)',
        border:
          '1px solid var(--color-border)',
        backdropFilter: 'blur(12px)',
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
            Item details
          </div>

          <div
            className="text-sm font-semibold capitalize mt-0.5"
            style={{
              color:
                'var(--color-text-primary)',
            }}
          >
            {item.type}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{
            color:
              'var(--color-text-faint)',
          }}
          title="Close"
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

      <section
        className="px-4 py-3"
        style={{
          borderBottom:
            '1px solid var(--color-border-soft)',
        }}
      >
        <button
          type="button"
          onClick={() =>
            onUpdate(current => ({
              ...current,
              locked:
                !current.locked,
            }))
          }
          className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors"
          style={{
            backgroundColor:
              item.locked
                ? 'var(--color-accent-soft)'
                : 'var(--color-surface)',
            color:
              item.locked
                ? 'var(--color-accent)'
                : 'var(--color-text-secondary)',
          }}
        >
          <span className="flex items-center gap-2 text-xs font-semibold">
            {item.locked ? '🔒' : '🔓'}

            Lock position
          </span>

          <span
            className="text-[10px]"
            style={{
              color:
                'var(--color-text-faint)',
            }}
          >
            {item.locked
              ? 'Locked'
              : 'Unlocked'}
          </span>
        </button>
      </section>

      {/* Tags */}

      <section className="p-4">
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
            {tags.length}
          </span>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map(tag => (
              <div
                key={tag}
                className="group/tag flex items-center gap-1 rounded-lg px-2 py-1"
                style={{
                  color:
                    'var(--color-accent)',
                  backgroundColor:
                    'var(--color-accent-soft)',
                }}
              >
                {editingTag === tag ? (
                  <input
                    autoFocus
                    value={editingValue}
                    onChange={event =>
                      setEditingValue(
                        event.target.value,
                      )
                    }
                    onBlur={
                      commitEditing
                    }
                    onKeyDown={event => {
                      if (
                        event.key ===
                        'Enter'
                      ) {
                        commitEditing();
                      }

                      if (
                        event.key ===
                        'Escape'
                      ) {
                        setEditingTag(
                          null,
                        );
                      }
                    }}
                    className="w-24 bg-transparent outline-none text-xs"
                    onMouseDown={event =>
                      event.stopPropagation()
                    }
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={() =>
                      startEditing(tag)
                    }
                    className="text-xs font-medium"
                    title="Double-click to rename"
                  >
                    #{tag}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleRemove(tag)
                  }
                  className="opacity-50 hover:opacity-100 transition-opacity"
                  title={`Remove #${tag}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p
            className="text-xs mb-3"
            style={{
              color:
                'var(--color-text-faint)',
            }}
          >
            No tags yet.
          </p>
        )}

        {/* Add tag */}

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
                event.key === 'Enter'
              ) {
                handleAdd();
              }

              if (
                event.key === 'Escape'
              ) {
                setNewTag('');
              }
            }}
            onMouseDown={event =>
              event.stopPropagation()
            }
            placeholder="Add tag..."
            className="flex-1 min-w-0 bg-transparent outline-none px-1.5 py-2 text-xs"
            style={{
              color:
                'var(--color-text-primary)',
            }}
          />

          <button
            type="button"
            onClick={handleAdd}
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

      {/* Future sections */}

      <div
        className="px-4 py-3"
        style={{
          borderTop:
            '1px solid var(--color-border-soft)',
        }}
      >
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{
            color:
              'var(--color-text-faint)',
          }}
        >
          More properties coming later
        </span>
      </div>
    </aside>
  );
}