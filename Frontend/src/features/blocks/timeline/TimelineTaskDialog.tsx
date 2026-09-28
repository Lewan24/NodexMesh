import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { createId } from '@/shared/lib/createId';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, CheckCircle2, Trash2, UserRound, X } from 'lucide-react';
import type { TimelineTask } from '@/entities/board/types';
import type { ProjectParticipant } from '@/entities/project/shareTypes';

export default function TimelineTaskDialog({
  task,
  isNew,
  onSave,
  onDelete,
  onClose,
  participants,
}: {
  task: TimelineTask;
  isNew: boolean;
  onSave: (task: TimelineTask) => void;
  onDelete: () => void;
  onClose: () => void;
  participants: ProjectParticipant[];
}) {
  useTranslation();
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
        aria-label={isNew ? translate('Add timeline task') : translate('Edit timeline task')}
        className="timeline-task-dialog flex w-full max-w-xl max-h-[90dvh] flex-col shadow-2xl"
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
        <header className="timeline-dialog-header">
          <div>
            <span className="timeline-dialog-eyebrow">{translate('Timeline task')}</span>
            <h2 className="text-xl font-semibold">{isNew ? translate('New task') : translate('Edit task')}</h2>
          </div>
          <button type="button" className="timeline-icon-button" onClick={onClose} aria-label={translate('Close')}>
            <X size={18} />
          </button>
        </header>
        <div className="timeline-dialog-body">
          <label className="timeline-field">
            <span>{translate('Task name')}</span>
            <input
              required
              className="planning-input block w-full"
              placeholder={translate('What needs to be done?')}
              value={draft.title}
              onChange={(event) => patch({ title: event.target.value })}
            />
          </label>
          <div className="timeline-dialog-grid">
            <label className="timeline-field">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} />
                {translate('Start')}
              </span>
              <input
                required
                type="date"
                className="planning-input block w-full"
                value={draft.start}
                onChange={(event) =>
                  patch({
                    start: event.target.value,
                    end: draft.end < event.target.value ? event.target.value : draft.end,
                  })
                }
              />
            </label>
            <label className="timeline-field">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} />
                {translate('End')}
              </span>
              <input
                required
                type="date"
                min={draft.start}
                className="planning-input block w-full"
                value={draft.end}
                onChange={(event) => patch({ end: event.target.value })}
              />
            </label>
          </div>
          <div className="timeline-dialog-grid">
            <label className="timeline-field">
              <span className="inline-flex items-center gap-1.5">
                <UserRound size={14} />
                {translate('Assignee')}
              </span>
              <select
                className="planning-input block w-full"
                value={draft.assigneeUserId ?? ''}
                onChange={(event) => patch({ assigneeUserId: event.target.value || undefined })}
              >
                <option value="">{translate('Unassigned')}</option>
                {participants.map((participant) => (
                  <option key={participant.userId} value={participant.userId}>
                    {participant.displayName} · {translate(participant.role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="timeline-field">
              <span>{translate('Color')}</span>
              <span className="timeline-color-field">
                <input type="color" value={draft.color} onChange={(event) => patch({ color: event.target.value })} />
                <span>{draft.color.toUpperCase()}</span>
              </span>
            </label>
          </div>
          <label className="timeline-complete-toggle">
            <CheckCircle2 size={18} />
            <input type="checkbox" checked={draft.done} onChange={(event) => patch({ done: event.target.checked })} />
            {translate('Completed')}
          </label>
          <fieldset className="timeline-checklist-fieldset">
            <legend className="text-sm font-medium mb-2">{translate('Checklist')}</legend>
            {draft.checklist.map((entry) => (
              <div key={entry.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  aria-label={translate('Complete {{value1}}', { value1: entry.text || translate('Checklist item') })}
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
                  aria-label={translate('Checklist item text')}
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
                  aria-label={translate('Remove checklist item')}
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
              onClick={() => patch({ checklist: [...draft.checklist, { id: createId(), text: '', done: false }] })}
            >
              {translate('+ Checklist item')}
            </button>
          </fieldset>
        </div>
        <footer className="timeline-dialog-footer">
          {!isNew && (
            <button type="button" className="planning-button timeline-danger-button" onClick={onDelete}>
              <Trash2 size={14} /> {translate('Delete task')}
            </button>
          )}
          <button type="button" className="planning-button ml-auto" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button
            type="submit"
            disabled={!draft.title.trim()}
            className="planning-button"
            style={{ background: 'var(--color-accent)', color: 'white' }}
          >
            {translate('Save task')}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}
