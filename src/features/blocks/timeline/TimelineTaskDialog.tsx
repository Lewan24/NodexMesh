import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { TimelineTask } from '@/entities/board/types';

export default function TimelineTaskDialog({
  task,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  task: TimelineTask;
  isNew: boolean;
  onSave: (task: TimelineTask) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(task);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
    };
  }, []);
  const patch = (value: Partial<TimelineTask>) => setDraft((current) => ({ ...current, ...value }));
  return createPortal(
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center p-4"
      style={{ zIndex: 200000 }}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <form
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Add timeline task' : 'Edit timeline task'}
        className="w-full max-w-lg max-h-[90dvh] overflow-auto shadow-2xl p-6 space-y-4"
        data-wheel-scroll="true"
        style={{ background: 'var(--color-surface)', color: 'var(--color-text-primary)', borderRadius: 2 }}
        onSubmit={(event) => {
          event.preventDefault();
          onSave({ ...draft, title: draft.title.trim() });
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape') {
            event.preventDefault();
            onClose();
          }
          if (event.key === 'Tab') {
            const fields = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input,textarea'),
            );
            const first = fields[0],
              last = fields[fields.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <h2 className="text-lg font-semibold">{isNew ? 'New task' : 'Edit task'}</h2>
        <label className="block text-sm">
          Task name
          <input
            required
            className="planning-input block w-full mt-1"
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
          />
        </label>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="flex-1">
            Start
            <input
              required
              type="date"
              className="planning-input block w-full mt-1"
              value={draft.start}
              onChange={(event) =>
                patch({
                  start: event.target.value,
                  end: draft.end < event.target.value ? event.target.value : draft.end,
                })
              }
            />
          </label>
          <label className="flex-1">
            End
            <input
              required
              type="date"
              min={draft.start}
              className="planning-input block w-full mt-1"
              value={draft.end}
              onChange={(event) => patch({ end: event.target.value })}
            />
          </label>
        </div>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={draft.done} onChange={(event) => patch({ done: event.target.checked })} />
            Completed
          </label>
          <label className="flex items-center gap-2">
            Color
            <input type="color" value={draft.color} onChange={(event) => patch({ color: event.target.value })} />
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium mb-2">Checklist</legend>
          {draft.checklist.map((entry) => (
            <div key={entry.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                aria-label={`Complete ${entry.text || 'checklist item'}`}
                checked={entry.done}
                onChange={(event) =>
                  patch({
                    checklist: draft.checklist.map((check) =>
                      check.id === entry.id ? { ...check, done: event.target.checked } : check,
                    ),
                  })
                }
              />
              <input
                aria-label="Checklist item text"
                className="planning-input flex-1"
                value={entry.text}
                onChange={(event) =>
                  patch({
                    checklist: draft.checklist.map((check) =>
                      check.id === entry.id ? { ...check, text: event.target.value } : check,
                    ),
                  })
                }
              />
              <button
                type="button"
                aria-label="Remove checklist item"
                className="planning-button"
                onClick={() => patch({ checklist: draft.checklist.filter((check) => check.id !== entry.id) })}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="planning-button"
            onClick={() =>
              patch({ checklist: [...draft.checklist, { id: crypto.randomUUID(), text: '', done: false }] })
            }
          >
            + Checklist item
          </button>
        </fieldset>
        <div className="flex gap-2 pt-3">
          {!isNew && (
            <button type="button" className="planning-button text-rose-500" onClick={onDelete}>
              Delete task
            </button>
          )}
          <button type="button" className="planning-button ml-auto" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={!draft.title.trim()}
            className="planning-button"
            style={{ background: 'var(--color-accent)', color: 'white' }}
          >
            Save task
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
