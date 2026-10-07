import { useEffect, useRef, useState, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ListChecks, LoaderCircle, Save, X } from 'lucide-react';
import type { ChecklistEntry, TaskCategory } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import { useTranslation } from 'react-i18next';
import { flushPendingChanges } from '@/shared/api/pendingChanges';
import { useProjectTasks } from './ProjectTasksContext';
import { normalizeTaskDetails } from './taskDetails';
import TaskCategoriesEditor from './TaskCategoriesEditor';
import TaskDetailsFields from './TaskDetailsFields';
import './taskDialog.css';

export default function TaskDialog({
  task,
  readOnly = false,
  onSave,
  onClose,
}: {
  task: ChecklistEntry;
  readOnly?: boolean;
  onSave: (task: ChecklistEntry) => void | Promise<void>;
  onClose: () => void;
}) {
  useTranslation();
  const project = useProjectTasks();
  const disabled = readOnly || project.readOnly;
  const [draft, setDraft] = useState(() => normalizeTaskDetails(task));
  const [categories, setCategories] = useState<TaskCategory[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const backdropPressed = useRef(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const errorId = useId();
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const resize = () => {
      backdropRef.current?.style.setProperty('--task-viewport-height', `${viewport.height}px`);
      backdropRef.current?.style.setProperty('--task-viewport-top', `${viewport.offsetTop}px`);
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
    };
  }, []);

  useEffect(() => {
    const form = formRef.current;
    if (!form || (form.contains(document.activeElement) && !document.activeElement?.matches(':disabled'))) return;
    // Keep focus in the dialog when switching views without opening mobile keyboards.
    const selector = window.matchMedia?.('(pointer: coarse)').matches
      ? 'button:not(:disabled)'
      : categories
        ? '.task-category-editor input:not(:disabled)'
        : '[name="taskName"]:not(:disabled)';
    (form.querySelector<HTMLElement>(selector) ?? form.querySelector<HTMLElement>('button:not(:disabled)'))?.focus({
      preventScroll: true,
    });
  }, [categories !== null, saving]);

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [error]);

  const patch = (value: Partial<ChecklistEntry>) => setDraft((current) => ({ ...current, ...value }));
  const persistCategories = async () => {
    if (!categories) return;
    if (categories.some((category) => !category.name.trim()))
      throw new Error(translate('Enter a name for each category.'));
    await project.saveCategories(categories.map((category) => ({ ...category, name: category.name.trim() })));
    setCategories(null);
  };

  const save = async (close: boolean) => {
    if (savingRef.current) return;
    if (disabled) {
      if (close) onClose();
      return;
    }
    if (close && !draft.text.trim()) {
      setError(translate('Enter a task name before saving.'));
      formRef.current?.querySelector<HTMLInputElement>('[name="taskName"]')?.focus();
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await persistCategories();
      if (close) {
        await onSave(normalizeTaskDetails(draft));
        if (!(await flushPendingChanges(true)))
          throw new Error(translate('Could not save the task. Your changes are still here. Please retry.'));
        onClose();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : translate('Could not save changes. Please retry.'));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return createPortal(
    <div
      ref={backdropRef}
      className="task-dialog-backdrop"
      data-task-backdrop="true"
      onPointerDown={(event) => {
        backdropPressed.current = event.button === 0 && event.target === event.currentTarget;
        event.stopPropagation();
      }}
      onMouseDown={(event) => {
        backdropPressed.current = event.button === 0 && event.target === event.currentTarget;
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target === event.currentTarget && backdropPressed.current) void save(true);
        backdropPressed.current = false;
      }}
    >
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        aria-busy={saving}
        className="task-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          void save(!categories);
        }}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === 'Escape' && !savingRef.current) {
            event.preventDefault();
            if (categories) setCategories(null);
            else onClose();
          }
          if (event.key === 'Tab') {
            const fields = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>('button,input,textarea,select'),
            ).filter((field) => !field.matches(':disabled') && field.tabIndex >= 0);
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
        <header className="task-dialog-header">
          <div className="task-dialog-heading-icon">
            <ListChecks size={22} />
          </div>
          <div className="task-dialog-heading">
            <span>{translate('Task details')}</span>
            <h2 id={titleId}>{translate(categories ? 'Project task categories' : 'Edit task')}</h2>
          </div>
          <button
            type="button"
            className="task-icon-button"
            disabled={saving}
            onClick={() => void save(true)}
            aria-label={translate('Close')}
          >
            <X size={20} />
          </button>
        </header>
        <div className="task-dialog-body" data-wheel-scroll="true">
          {project.categoriesError && !categories && (
            <div className="task-category-load-error" role="status">
              <span>{project.categoriesError}</span>
              <button
                type="button"
                className="task-text-button"
                disabled={saving}
                onClick={() => void project.reloadCategories()}
              >
                {translate('Retry')}
              </button>
            </div>
          )}
          {categories ? (
            <TaskCategoriesEditor categories={categories} onChange={setCategories} disabled={disabled || saving} />
          ) : (
            <TaskDetailsFields
              draft={draft}
              patch={patch}
              disabled={disabled || saving}
              onManageCategories={() => {
                setError('');
                setCategories(project.categories.map((category) => ({ ...category })));
              }}
            />
          )}
          {error && (
            <p ref={errorRef} id={errorId} role="alert" className="task-dialog-error">
              {error}
            </p>
          )}
        </div>
        <footer className="task-dialog-footer">
          <button
            type="button"
            className="task-button task-button-secondary"
            disabled={saving}
            onClick={() => (categories ? setCategories(null) : onClose())}
          >
            {categories && <ChevronLeft size={16} />}
            {translate(categories ? 'Back to task' : 'Cancel')}
          </button>
          {!disabled && (
            <button
              type="submit"
              className="task-button task-button-primary"
              disabled={saving || (!categories && !draft.text.trim())}
            >
              {saving ? <LoaderCircle size={17} className="task-saving-spinner" /> : <Save size={17} />}
              {translate(saving ? 'Saving…' : categories ? 'Save categories' : 'Save task')}
            </button>
          )}
        </footer>
      </form>
    </div>,
    document.body,
  );
}
