import { useState } from 'react';
import { Filter, RotateCcw, X } from 'lucide-react';
import type { KanbanCard } from '@/entities/board/types';
import { translate } from '@/shared/i18n';
import Modal from '@/shared/components/dialogs/Modal';
import { useProjectTasks } from '../shared/ProjectTasksContext';
import { taskCategoryIds } from '../shared/taskDetails';
import {
  EMPTY_KANBAN_FILTERS,
  hasKanbanFilters,
  matchesKanbanFilters,
  type KanbanFilters,
} from './utils/kanbanFilters';
import './kanbanFilters.css';

export default function KanbanFilterControls({
  filters,
  onChange,
  cards,
  readOnly = false,
}: {
  filters: KanbanFilters;
  onChange: (filters: KanbanFilters) => void;
  cards: KanbanCard[];
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const active = hasKanbanFilters(filters);
  const count = cards.filter((card) => matchesKanbanFilters(card, filters)).length;
  return (
    <>
      <button
        type="button"
        data-read-only-action={readOnly || undefined}
        className="completed-tasks-button kanban-filter-button"
        aria-pressed={active}
        aria-haspopup="dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => setEditing(true)}
      >
        <Filter size={16} aria-hidden="true" />
        {translate('Filter tasks')}
        {active && <span aria-hidden="true">●</span>}
      </button>
      <button
        type="button"
        data-read-only-action={readOnly || undefined}
        className="completed-tasks-button kanban-filter-reset"
        disabled={!active}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => onChange(EMPTY_KANBAN_FILTERS)}
      >
        <RotateCcw size={14} aria-hidden="true" />
        {translate('Reset filters')}
      </button>
      {active && (
        <span className="kanban-filter-count" role="status">
          {translate('Showing {{shown}} of {{total}} tasks', { shown: count, total: cards.length })}
        </span>
      )}
      {editing && (
        <KanbanFilterDialog
          filters={filters}
          cards={cards}
          onApply={(next) => {
            onChange(next);
            setEditing(false);
          }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}

function KanbanFilterDialog({
  filters,
  cards,
  onApply,
  onClose,
}: {
  filters: KanbanFilters;
  cards: KanbanCard[];
  onApply: (filters: KanbanFilters) => void;
  onClose: () => void;
}) {
  const project = useProjectTasks();
  const [draft, setDraft] = useState(filters);
  const people = new Map(project.participants.map((person) => [person.userId, person.displayName]));
  for (const id of [
    ...cards.flatMap((card) => (card.assigneeUserId ? [card.assigneeUserId] : [])),
    ...(draft.assigneeIds ?? []),
  ]) {
    if (!people.has(id)) people.set(id, `${translate('Former participant')} · ${id.slice(0, 8)}`);
  }
  const categories = new Map(project.categories.map((category) => [category.id, category.name]));
  for (const id of [...cards.flatMap(taskCategoryIds), ...draft.categoryIds]) {
    if (!categories.has(id)) categories.set(id, `${translate('Unknown category')} · ${id.slice(0, 8)}`);
  }
  const patch = (value: Partial<KanbanFilters>) => setDraft((current) => ({ ...current, ...value }));
  const matches = cards.filter((card) => matchesKanbanFilters(card, draft)).length;
  return (
    <Modal centered label={translate('Filter tasks')} onClose={onClose} readOnlyAction>
      <form
        className="kanban-filter-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onApply({ ...draft, query: draft.query.trim() });
        }}
      >
        <header>
          <h2>{translate('Filter tasks')}</h2>
          <button type="button" aria-label={translate('Close')} onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <div className="kanban-filter-fields">
          <label>
            {translate('Task title or description')}
            <input
              autoFocus
              type="search"
              value={draft.query}
              onChange={(event) => patch({ query: event.target.value })}
            />
          </label>
          <fieldset>
            <legend>{translate('Assignee')}</legend>
            <label>
              <input
                type="checkbox"
                checked={draft.assigneeIds === null}
                onChange={(event) => patch({ assigneeIds: event.target.checked ? null : [] })}
              />
              {translate('All assigned people')}
            </label>
            <div className="kanban-filter-choices">
              {[...people].map(([id, name]) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={draft.assigneeIds === null || draft.assigneeIds.includes(id)}
                    onChange={(event) => {
                      const selected = draft.assigneeIds ?? [...people.keys()];
                      patch({
                        assigneeIds: event.target.checked
                          ? [...selected, id]
                          : selected.filter((candidate) => candidate !== id),
                      });
                    }}
                  />
                  {name}
                </label>
              ))}
            </div>
            <label>
              <input
                type="checkbox"
                checked={draft.includeUnassigned}
                onChange={(event) => patch({ includeUnassigned: event.target.checked })}
              />
              {translate('Include unassigned tasks')}
            </label>
          </fieldset>
          <fieldset>
            <legend>{translate('Categories')}</legend>
            <div className="kanban-filter-choices">
              {[...categories].map(([id, name]) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={draft.categoryIds.includes(id)}
                    onChange={(event) =>
                      patch({
                        categoryIds: event.target.checked
                          ? [...draft.categoryIds, id]
                          : draft.categoryIds.filter((candidate) => candidate !== id),
                      })
                    }
                  />
                  {name}
                </label>
              ))}
            </div>
            <p>{translate('Match any selected category. No selection includes all categories.')}</p>
          </fieldset>
          <label>
            {translate('Deadline before')}
            <input
              type="date"
              value={draft.deadlineBefore}
              onChange={(event) => patch({ deadlineBefore: event.target.value })}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={draft.includeWithoutDeadline}
              disabled={!draft.deadlineBefore}
              onChange={(event) => patch({ includeWithoutDeadline: event.target.checked })}
            />
            {translate('Include tasks without a deadline')}
          </label>
          <p>{translate('Filters only narrow the currently visible tasks. The selected date itself is excluded.')}</p>
          <p role="status">{translate('Matching tasks: {{count}}', { count: matches })}</p>
        </div>
        <footer>
          <button type="button" disabled={!hasKanbanFilters(draft)} onClick={() => setDraft(EMPTY_KANBAN_FILTERS)}>
            {translate('Reset filters')}
          </button>
          <button type="button" onClick={onClose}>
            {translate('Cancel')}
          </button>
          <button type="submit" className="btn-accent">
            {translate('Apply filters')}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
