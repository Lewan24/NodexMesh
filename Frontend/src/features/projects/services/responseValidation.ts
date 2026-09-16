import type { BoardSnapshot } from '@/entities/board/records';
import type { ProjectRecord, ProjectSnapshot } from '@/entities/project/types';
import { validateItem } from '@/entities/board/itemSchema';
import { fail } from '@/shared/api/errors';
import { validateBoard } from '@/entities/board/boardValidation';

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail(422, 'invalid_response', 'Invalid API response.');
  return value as Record<string, unknown>;
}
function string(value: unknown): asserts value is string {
  if (typeof value !== 'string') fail(422, 'invalid_response', 'Invalid API response field.');
}
function audit(value: Record<string, unknown>) {
  string(value.id);
  if (typeof value.revision !== 'string' || !/^[1-9]\d{0,18}$/.test(value.revision))
    fail(422, 'invalid_revision', 'Invalid revision.');
  for (const key of ['createdAt', 'updatedAt']) {
    string(value[key]);
    if (!Number.isFinite(Date.parse(value[key]))) fail(422, 'invalid_date', 'Invalid timestamp.');
  }
  for (const key of ['createdBy', 'updatedBy', 'deletedAt']) if (value[key] !== null) string(value[key]);
}

export function parseProjectRecord(value: unknown): ProjectRecord {
  const project = record(value);
  audit(project);
  for (const key of ['name', 'color', 'ownerId']) string(project[key]);
  return project as unknown as ProjectRecord;
}

export function parseBoardSnapshot(value: unknown): BoardSnapshot {
  const snapshot = record(value);
  const board = record(snapshot.board);
  audit(board);
  string(board.projectId);
  string(board.name);
  for (const key of ['items', 'links', 'comments', 'tags', 'itemTags']) {
    if (!Array.isArray(snapshot[key])) fail(422, 'invalid_response', 'Invalid board collection.');
  }
  const result = snapshot as unknown as BoardSnapshot;
  const ids = new Set<string>();
  for (const item of result.items) {
    audit(record(item));
    validateItem(item);
    if (item.boardId !== board.id || ids.has(item.id)) fail(422, 'invalid_scope', 'Invalid item scope or ID.');
    ids.add(item.id);
  }
  for (const comment of result.comments) {
    audit(record(comment));
    string(comment.text);
    if (!ids.has(comment.itemId) || !['open', 'todo', 'in-progress', 'resolved'].includes(comment.status))
      fail(422, 'invalid_comment', 'Invalid comment.');
  }
  for (const tag of result.tags) {
    string(tag.id);
    string(tag.name);
    string(tag.normalizedName);
    if (tag.projectId !== board.projectId) fail(422, 'invalid_scope', 'Invalid tag scope.');
  }
  for (const tag of result.itemTags) {
    if (!ids.has(tag.itemId) || !result.tags.some((t) => t.id === tag.tagId))
      fail(422, 'invalid_tag', 'Invalid tag reference.');
  }
  validateBoard(result);
  return result;
}

export function parseProjectSnapshots(value: unknown): ProjectSnapshot[] {
  if (!Array.isArray(value)) fail(422, 'invalid_response', 'Invalid project collection.');
  const ids = new Set<string>();
  return value.map((entry: unknown) => {
    const snapshot = record(entry);
    const project = parseProjectRecord(snapshot.project);
    const board = parseBoardSnapshot(snapshot.board);
    if (board.board.projectId !== project.id || ids.has(project.id))
      fail(422, 'invalid_scope', 'Invalid project scope or ID.');
    ids.add(project.id);
    return { project, board };
  });
}
