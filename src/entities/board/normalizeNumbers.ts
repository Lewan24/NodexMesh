import type { BoardItem } from './types';

const pixelFields = new Set(['x', 'y', 'x2', 'y2', 'width', 'height', 'taskColumnWidth']);
const decimalFields = new Set([
  'pressure',
  'strokeWidth',
  'opacity',
  'curve',
  'labelOffset',
  'viewWidth',
  'viewHeight',
]);

const normalizedItems = new WeakMap<BoardItem, BoardItem>();

/** Limit stored geometry precision without rounding IDs, timestamps or text content. */
export function normalizeItemNumbers(item: BoardItem): BoardItem {
  const cached = normalizedItems.get(item);
  if (cached) return cached;

  const visit = (value: unknown, key = '', inPoints = false): unknown => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const digits = pixelFields.has(key) ? (inPoints ? 2 : 0) : decimalFields.has(key) ? 2 : null;
      return digits === null ? value : Number(value.toFixed(digits));
    }
    if (!value || typeof value !== 'object') return value;

    let changed = false;
    if (Array.isArray(value)) {
      const next = value.map((entry) => {
        const normalized = visit(entry, '', key === 'points');
        changed ||= normalized !== entry;
        return normalized;
      });
      return changed ? next : value;
    }

    const next = Object.fromEntries(
      Object.entries(value).map(([field, entry]) => {
        const normalized = visit(entry, field, inPoints);
        changed ||= normalized !== entry;
        return [field, normalized];
      }),
    );
    return changed ? next : value;
  };

  const normalized = visit(item) as BoardItem;
  normalizedItems.set(item, normalized);
  normalizedItems.set(normalized, normalized);
  return normalized;
}
