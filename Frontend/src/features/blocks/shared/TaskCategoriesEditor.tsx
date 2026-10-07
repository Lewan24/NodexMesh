import { Plus, Trash2, Tag } from 'lucide-react';
import type { TaskCategory } from '@/entities/board/types';
import { createId } from '@/shared/lib/createId';
import { translate } from '@/shared/i18n';

export default function TaskCategoriesEditor({
  categories,
  onChange,
  disabled,
}: {
  categories: TaskCategory[];
  onChange: (categories: TaskCategory[]) => void;
  disabled: boolean;
}) {
  const update = (id: string, patch: Partial<TaskCategory>) =>
    onChange(categories.map((category) => (category.id === id ? { ...category, ...patch } : category)));
  return (
    <fieldset disabled={disabled} className="task-category-editor">
      <div className="task-section-heading">
        <Tag size={18} />
        <div>
          <h3>{translate('Project categories')}</h3>
          <p>{translate('Create labels that everyone in this project can use.')}</p>
        </div>
      </div>
      <div className="task-category-rows">
        {categories.map((category) => (
          <div key={category.id} className="task-category-row">
            <input
              type="color"
              className="task-category-color"
              aria-label={translate('Category color')}
              value={category.color}
              onChange={(event) => update(category.id, { color: event.target.value })}
            />
            <input
              className="task-input"
              aria-label={translate('Category name')}
              maxLength={100}
              required
              value={category.name}
              onChange={(event) => update(category.id, { name: event.target.value })}
            />
            <button
              type="button"
              className="task-icon-button task-danger"
              disabled={categories.length === 1}
              aria-label={translate('Delete category')}
              onClick={() => onChange(categories.filter((c) => c.id !== category.id))}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="task-button task-button-secondary"
        disabled={categories.length >= 100}
        onClick={() => onChange([...categories, { id: createId(), name: translate('New category'), color: '#7C3AED' }])}
      >
        <Plus size={16} />
        {translate('Add category')}
      </button>
    </fieldset>
  );
}
