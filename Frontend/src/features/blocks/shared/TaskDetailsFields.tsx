import { useLayoutEffect, useRef } from 'react';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  ListChecks,
  Plus,
  Settings2,
  Tag,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { ChecklistEntry, Subtask } from '@/entities/board/types';
import { createId } from '@/shared/lib/createId';
import { translate } from '@/shared/i18n';
import { taskCategoryIds } from './taskDetails';
import { useProjectTasks } from './ProjectTasksContext';

export default function TaskDetailsFields({
  draft,
  patch,
  disabled,
  onManageCategories,
}: {
  draft: ChecklistEntry;
  patch: (value: Partial<ChecklistEntry>) => void;
  disabled: boolean;
  onManageCategories: () => void;
}) {
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const fields = [titleRef.current, descriptionRef.current];
    const resize = () => {
      for (const field of fields) {
        if (!field) continue;
        field.style.height = 'auto';
        field.style.height = `${field.scrollHeight + 2}px`;
      }
    };
    resize();
    // Reflow wrapped text when the dialog changes width, without undoing manual height changes.
    if (typeof ResizeObserver === 'undefined') return;
    let width = titleRef.current?.clientWidth;
    const observer = new ResizeObserver(() => {
      const nextWidth = titleRef.current?.clientWidth;
      if (width !== nextWidth) {
        width = nextWidth;
        resize();
      }
    });
    if (titleRef.current) observer.observe(titleRef.current);
    return () => observer.disconnect();
  }, [draft.text, draft.description]);
  const project = useProjectTasks();
  const selectedIds = taskCategoryIds(draft);
  const subtasks = draft.subtasks ?? [];
  const completed = subtasks.filter((subtask) => subtask.done).length;
  const updateSubtask = (id: string, value: Partial<Subtask>) =>
    patch({ subtasks: subtasks.map((subtask) => (subtask.id === id ? { ...subtask, ...value } : subtask)) });
  return (
    <fieldset disabled={disabled} className="task-details-fields">
      <label className="task-field task-title-field">
        <span>{translate('Task name')}</span>
        <textarea
          ref={titleRef}
          rows={1}
          name="taskName"
          required
          maxLength={200000}
          className="task-input task-multiline"
          value={draft.text}
          placeholder={translate('What needs to be done?')}
          onChange={(event) => patch({ text: event.target.value })}
        />
      </label>
      <label className="task-field">
        <span>
          <FileText size={16} />
          {translate('Description')}
        </span>
        <textarea
          ref={descriptionRef}
          rows={3}
          maxLength={20000}
          className="task-input task-multiline task-description"
          value={draft.description ?? ''}
          placeholder={translate('Add context, notes, or useful details…')}
          onChange={(event) => patch({ description: event.target.value || undefined })}
        />
      </label>
      <div className="task-details-grid">
        <label className="task-field">
          <span>
            <UserRound size={16} />
            {translate('Assignee')}
          </span>
          <select
            className="task-input"
            value={draft.assigneeUserId ?? ''}
            onChange={(event) => patch({ assigneeUserId: event.target.value || undefined })}
          >
            <option value="">{translate('Unassigned')}</option>
            {draft.assigneeUserId && !project.participants.some((p) => p.userId === draft.assigneeUserId) && (
              <option value={draft.assigneeUserId}>{translate('Former participant')}</option>
            )}
            {project.participants.map((participant) => (
              <option key={participant.userId} value={participant.userId}>
                {participant.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="task-field">
          <span>
            <CalendarDays size={16} />
            {translate('Deadline')}
          </span>
          <input
            type="date"
            className="task-input"
            value={draft.deadline ?? ''}
            onChange={(event) => patch({ deadline: event.target.value || undefined })}
          />
        </label>
      </div>
      <fieldset className="task-category-section">
        <legend>
          <Tag size={16} />
          {translate('Categories')}
        </legend>
        <div className="task-category-options">
          {project.categories.map((category) => (
            <label
              key={category.id}
              className={`task-category-option ${selectedIds.includes(category.id) ? 'is-selected' : ''}`}
            >
              <input
                type="checkbox"
                disabled={!project.categoriesReady || (!selectedIds.includes(category.id) && selectedIds.length >= 100)}
                checked={selectedIds.includes(category.id)}
                onChange={(event) =>
                  patch({
                    categoryIds: event.target.checked
                      ? [...selectedIds, category.id]
                      : selectedIds.filter((id) => id !== category.id),
                  })
                }
              />
              <span className="task-category-dot" style={{ backgroundColor: category.color }} />
              <span>{category.name}</span>
              {selectedIds.includes(category.id) && <Check size={14} />}
            </label>
          ))}
          {selectedIds
            .filter((id) => !project.categories.some((category) => category.id === id))
            .map((id) => (
              <label key={id} className="task-category-option is-selected">
                <input
                  type="checkbox"
                  disabled={!project.categoriesReady}
                  checked
                  onChange={() => patch({ categoryIds: selectedIds.filter((current) => current !== id) })}
                />
                <span>{translate('Deleted category')}</span>
                <Check size={14} />
              </label>
            ))}
        </div>
        <button
          type="button"
          className="task-text-button"
          disabled={!project.categoriesReady}
          onClick={onManageCategories}
        >
          <Settings2 size={15} />
          {translate('Edit project categories')}
        </button>
      </fieldset>
      <label className={`task-complete-option ${draft.done ? 'is-completed' : ''}`}>
        <CheckCircle2 size={18} />
        <span>{translate('Completed')}</span>
        <input type="checkbox" checked={draft.done} onChange={(event) => patch({ done: event.target.checked })} />
      </label>
      <fieldset className="task-subtasks-section">
        <legend>
          <ListChecks size={16} />
          {translate('Subtasks')}
          <span className="task-count">
            {completed}/{subtasks.length}
          </span>
        </legend>
        {!!subtasks.length && (
          <div className="task-progress">
            <span style={{ width: `${(completed / subtasks.length) * 100}%` }} />
          </div>
        )}
        <div className="task-subtask-list">
          {subtasks.map((subtask) => (
            <div key={subtask.id} className={`task-subtask-row ${subtask.done ? 'is-completed' : ''}`}>
              <label className="task-subtask-toggle">
                <input
                  type="checkbox"
                  aria-label={translate('Complete {{value1}}', { value1: subtask.text })}
                  checked={subtask.done}
                  onChange={(event) => updateSubtask(subtask.id, { done: event.target.checked })}
                />
              </label>
              <input
                className="task-input"
                aria-label={translate('Subtask name')}
                maxLength={500}
                value={subtask.text}
                placeholder={translate('What needs to be done?')}
                onChange={(event) => updateSubtask(subtask.id, { text: event.target.value })}
              />
              <button
                type="button"
                className="task-icon-button task-danger"
                aria-label={translate('Delete subtask')}
                onClick={() => patch({ subtasks: subtasks.filter((current) => current.id !== subtask.id) })}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="task-text-button"
          disabled={subtasks.length >= 200}
          onClick={() => patch({ subtasks: [...subtasks, { id: createId(), text: '', done: false }] })}
        >
          <Plus size={16} />
          {translate('Add subtask')}
        </button>
      </fieldset>
    </fieldset>
  );
}
