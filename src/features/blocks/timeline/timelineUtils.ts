import type { TimelineTask } from '@/entities/board/types';

const DAY = 86400000;
export function reorderTasks(tasks: TimelineTask[], sourceId: string, targetId: string): TimelineTask[] {
  const from = tasks.findIndex(task => task.id === sourceId);
  const to = tasks.findIndex(task => task.id === targetId);
  if (from < 0 || to < 0 || from === to) return tasks;
  const result = [...tasks];
  const [task] = result.splice(from, 1);
  result.splice(to, 0, task!);
  return result;
}
export function dateDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time / DAY : null;
}
export function dayDate(day: number): string { return new Date(day * DAY).toISOString().slice(0, 10); }
export function todayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function taskRange(task: TimelineTask): { start: number; end: number } | null {
  const start = dateDay(task.start);
  if (start === null) return null;
  return { start, end: Math.max(start, dateDay(task.end) ?? start) };
}
export function shiftTask(task: TimelineTask, days: number, resize = false): TimelineTask {
  const range = taskRange(task);
  if (!range) return task;
  return { ...task, start: resize ? task.start : dayDate(range.start + days),
    end: dayDate(resize ? Math.max(range.start, range.end + days) : range.end + days) };
}
export function scheduleRange(tasks: TimelineTask[]) {
  const ranges = tasks.flatMap(task => { const range = taskRange(task); return range ? [range] : []; });
  const first = ranges.length ? Math.min(...ranges.map(range => range.start)) : dateDay(todayDate())!;
  // Monday-aligned weeks; calculation uses UTC days to avoid DST shifts.
  const start = first - ((new Date(first * DAY).getUTCDay() + 6) % 7);
  const last = ranges.length ? Math.max(...ranges.map(range => range.end)) : start + 27;
  return { start, days: Math.max(28, Math.ceil((last - start + 1) / 7) * 7) };
}
