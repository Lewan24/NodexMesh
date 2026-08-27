import type {
  ChecklistEntry,
} from '@/entities/board/types';

export function createChecklistEntry(
  text: string,
): ChecklistEntry {
  return {
    id: Math.random()
      .toString(36)
      .slice(2, 9),

    text,
    done: false,
  };
}

export function isLightColor(
  hex: string,
): boolean {
  const red =
    parseInt(
      hex.slice(1, 3),
      16,
    );

  const green =
    parseInt(
      hex.slice(3, 5),
      16,
    );

  const blue =
    parseInt(
      hex.slice(5, 7),
      16,
    );

  return (
    (
      red * 299 +
      green * 587 +
      blue * 114
    ) /
      1000 >
    128
  );
}