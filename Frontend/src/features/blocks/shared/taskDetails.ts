import type { ChecklistEntry } from '@/entities/board/types';

/** An explicit empty array clears legacy category assignments. */
export function taskCategoryIds(task: ChecklistEntry): string[] {
  return task.categoryIds ?? (task.categoryId ? [task.categoryId] : []);
}

export function normalizeTaskDetails(task: ChecklistEntry): ChecklistEntry {
  const { categoryId: _legacyCategory, ...details } = task;
  return { ...details, text: task.text.trim(), categoryIds: [...new Set(taskCategoryIds(task))] };
}
