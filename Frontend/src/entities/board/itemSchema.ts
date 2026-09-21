import { validMindmapTree } from '@/features/blocks/mindmap/mindmapUtils';
import type { MindmapNode } from './types';
import type { BoardItem } from './types';
import type { ItemWrite } from './records';
import { fail } from '@/shared/api/errors';

type Check = (value: unknown) => boolean;
const text: Check = (v) => typeof v === 'string' && v.length <= 200_000;
const number: Check = (v) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 10_000_000;
const bool: Check = (v) => typeof v === 'boolean';
const choice =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v);
const optional =
  (check: Check): Check =>
  (v) =>
    v === undefined || check(v);
const list =
  (check: Check, limit = 10_000): Check =>
  (v) =>
    Array.isArray(v) && v.length <= limit && v.every(check);
export const object =
  (fields: Record<string, Check>): Check =>
  (v) =>
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.keys(v).every((key) => Object.hasOwn(fields, key)) &&
    Object.entries(fields).every(([key, check]) => check((v as Record<string, unknown>)[key]));
const url: Check = (v) => {
  if (v === '') return true;
  if (typeof v !== 'string' || v.length > 4096) return false;
  try {
    const parsed = new URL(v);
    return ['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
};
const day: Check = (v) =>
  typeof v === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v)) &&
  new Date(v).toISOString().slice(0, 10) === v;
const entry = object({ id: text, text, done: bool });
const position = object({ x: number, y: number });
const point = object({ x: number, y: number, pressure: optional(number) });
const points = list(point, 100_000);
const title = { title: text };
const uuid: Check = (v) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const sectionStyle = object({
  color: optional(text),
  fontSize: optional(number),
  bold: optional(bool),
  italic: optional(bool),
  textAlign: optional(choice('left', 'center', 'right')),
});
const appearance = object({
  color: optional(text),
  colorRole: optional(choice('default', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5')),
  topColor: optional(text),
  gradient: optional(object({ from: text, to: text, kind: choice('linear', 'radial'), angle: number })),
  typography: optional(
    object({
      sections: optional(
        object({
          title: optional(sectionStyle),
          description: optional(sectionStyle),
          body: optional(sectionStyle),
          links: optional(sectionStyle),
          caption: optional(sectionStyle),
          labels: optional(sectionStyle),
        }),
      ),
      fontFamily: optional(text),
      fontSize: optional(number),
      bold: optional(bool),
      italic: optional(bool),
      textAlign: optional(choice('left', 'center', 'right')),
      verticalAlign: optional(choice('top', 'middle', 'bottom')),
    }),
  ),
  textAlign: optional(choice('left', 'center', 'right')),
  fontSize: optional(choice('sm', 'base', 'lg')),
  bold: optional(bool),
  italic: optional(bool),
});

export const itemSchemas: Record<BoardItem['type'], { version: 1; canNest: boolean; validate: Check }> = {
  board: {
    version: 1,
    canNest: false,
    validate: object({
      boardId: (value) => value === null || value === undefined || uuid(value),
      title: text,
      description: text,
      icon: text,
    }),
  },
  'section-title': { version: 1, canNest: false, validate: object({ content: text }) },
  note: { version: 1, canNest: true, validate: object({ content: text }) },
  text: { version: 1, canNest: true, validate: object({ content: text, size: choice('sm', 'md', 'lg', 'xl') }) },
  document: {
    version: 1,
    canNest: true,
    validate: object({
      ...title,
      content: text,
      contentFormat: choice('tiptap-html'),
      contentVersion: choice(1),
      autoHeight: optional(bool),
    }),
  },
  code: { version: 1, canNest: true, validate: object({ content: text, language: text, autoHeight: optional(bool) }) },
  icon: {
    version: 1,
    canNest: false,
    validate: object({ iconMode: choice('preset', 'emoji', 'svg', 'url'), source: text, label: text }),
  },
  image: {
    version: 1,
    canNest: true,
    validate: object({ url, caption: text, variant: optional(choice('card', 'sticker')), imgHeight: optional(number) }),
  },
  link: { version: 1, canNest: true, validate: object({ url, ...title, description: text }) },
  embed: { version: 1, canNest: true, validate: object({ url, ...title, showLabel: bool }) },
  checklist: { version: 1, canNest: true, validate: object({ ...title, entries: list(entry) }) },
  kanban: {
    version: 1,
    canNest: false,
    validate: object({
      ...title,
      columns: list(object({ id: text, ...title, color: text, width: optional(number), cards: list(entry) })),
    }),
  },
  timeline: {
    version: 1,
    canNest: false,
    validate: object({
      ...title,
      mode: choice('simple', 'schedule'),
      taskColumnWidth: optional(number),
      tasks: list(
        object({ id: text, ...title, start: day, end: day, done: bool, color: text, checklist: list(entry) }),
      ),
    }),
  },
  column: {
    version: 1,
    canNest: false,
    validate: object({
      ...title,
      layout: optional(choice('vertical', 'horizontal', 'grid')),
      gridColumns: optional(number),
      gap: optional(number),
    }),
  },
  frame: { version: 1, canNest: false, validate: object({ ...title, opacity: optional(number) }) },
  dispenser: { version: 1, canNest: false, validate: object(title) },
  line: {
    version: 1,
    canNest: false,
    validate: object({
      x2: number,
      y2: number,
      arrowStart: bool,
      arrowEnd: bool,
      strokeWidth: number,
      curve: optional(number),
      lineCap: optional(choice('round', 'butt', 'square')),
      label: optional(text),
      labelMode: optional(choice('horizontal', 'follow-line')),
      labelOffset: optional(number),
      labelFontSize: optional(number),
      divider: optional(bool),
    }),
  },
  drawing: {
    version: 1,
    canNest: false,
    validate: object({
      points,
      viewWidth: number,
      viewHeight: number,
      strokeWidth: number,
      strokes: optional(
        list(
          object({ points, x: number, y: number, scaleX: number, scaleY: number, color: text, strokeWidth: number }),
        ),
      ),
    }),
  },
  mindmap: {
    version: 1,
    canNest: false,
    validate: object({
      ...title,
      layout: choice('horizontal', 'vertical'),
      lineStyle: choice('curve', 'elbow', 'straight'),
      lineWidth: (value) => number(value) && (value as number) >= 1 && (value as number) <= 10,
      dashed: bool,
      nodes: (value) =>
        list(
          object({
            id: text,
            parentId: (v) => v === null || text(v),
            label: text,
            side: choice('negative', 'positive'),
            branchColor: text,
            background: text,
            textColor: text,
          }),
        )(value) && validMindmapTree(value as MindmapNode[]),
    }),
  },
  diagram: {
    version: 1,
    canNest: false,
    validate: object({
      ...title,
      nodes: list(
        object({
          id: text,
          position,
          type: choice('shape'),
          data: object({
            label: text,
            shape: choice('process', 'decision', 'terminal', 'database', 'input', 'document', 'service'),
            color: text,
          }),
        }),
      ),
      edges: list(
        object({
          id: text,
          source: text,
          target: text,
          sourceHandle: optional(choice(null, 'top', 'bottom', 'left', 'right')),
          targetHandle: optional(choice(null, 'top', 'bottom', 'left', 'right')),
          label: optional(text),
          type: optional(choice('smoothstep', 'default', 'straight')),
        }),
      ),
    }),
  },
  database: {
    version: 1,
    canNest: false,
    validate: object({
      ...title,
      tables: list(
        object({
          id: text,
          name: text,
          position,
          fields: list(
            object({
              id: text,
              name: text,
              dataType: text,
              primaryKey: bool,
              nullable: bool,
              unique: bool,
              defaultValue: text,
            }),
          ),
        }),
      ),
      relations: list(
        object({
          id: text,
          source: text,
          target: text,
          sourceField: text,
          targetField: text,
          cardinality: choice('1:1', '1:N', 'N:1', 'N:N'),
        }),
      ),
    }),
  },
};

export function validateItem(item: ItemWrite): void {
  const schema = itemSchemas[item.type];
  if (!schema || item.schemaVersion !== schema.version) {
    fail(422, 'unsupported_schema', 'This board needs a newer client. Editing has been stopped.');
  }
  if (
    !uuid(item.id) ||
    !uuid(item.boardId) ||
    ![item.parentItemId, item.frameId].every((v) => v === null || uuid(v)) ||
    !bool(item.locked) ||
    !appearance(item.appearance) ||
    !schema.validate(item.data) ||
    ![item.x, item.y, item.zIndex, item.sortOrder].every(number) ||
    ![item.width, item.height].every((v) => v === null || (number(v) && v > 0)) ||
    !Number.isInteger(item.zIndex) ||
    !Number.isSafeInteger(item.sortOrder) ||
    JSON.stringify(item).length > 2_000_000
  ) {
    fail(422, 'invalid_item', `Invalid ${item.type} content or geometry.`);
  }
}
