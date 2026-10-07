import { taskCategoryIds } from './taskDetails';
import { CalendarDays, ListChecks, FileText, UserRound } from 'lucide-react';
import type { ChecklistEntry } from '@/entities/board/types';
import { useProjectTasks } from './ProjectTasksContext';
import { translate } from '@/shared/i18n';
export default function TaskPreview({ task }: { task: ChecklistEntry }) {
  const { categories, participants } = useProjectTasks();
  const selectedCategories = categories.filter((c) => taskCategoryIds(task).includes(c.id));
  const participant = participants.find((p) => p.userId === task.assigneeUserId);
  return (
    <span className="flex flex-wrap items-center gap-2 mt-1 text-[11px] leading-normal">
      {selectedCategories.map((category) => (
        <span
          key={category.id}
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: category.color }} />
          {category.name}
        </span>
      ))}
      {!!task.subtasks?.length && (
        <span className="inline-flex items-center gap-1" title={translate('Subtasks')}>
          <ListChecks size={12} />
          {task.subtasks.filter((s) => s.done).length}/{task.subtasks.length}
        </span>
      )}
      {task.description?.trim() && <FileText size={12} aria-label={translate('Description')} />}
      {task.assigneeUserId && <UserRound size={12} aria-label={participant?.displayName ?? translate('Assignee')} />}
      {task.deadline && (
        <span className="inline-flex items-center gap-1">
          <CalendarDays size={12} />
          {task.deadline}
        </span>
      )}
    </span>
  );
}
