import type { BoardSnapshot } from './records';
import { itemSchemas, validateItem } from './itemSchema';
import { fail } from '@/shared/api/errors';

export function validateBoard(board: BoardSnapshot): void {
  if (board.items.length > 20_000) fail(422, 'board_limit', 'The board item limit has been reached.');
  const active = board.items.filter((i) => !i.deletedAt);
  const ids = new Map(active.map((i) => [i.id, i]));
  if (new Set(board.items.map((i) => i.id)).size !== board.items.length)
    fail(422, 'duplicate_id', 'Duplicate item ID.');
  for (const item of active) {
    validateItem(item);
    if (item.boardId !== board.board.id) fail(422, 'invalid_scope', 'Item belongs to another board.');
    if (item.parentItemId) {
      const parent = ids.get(item.parentItemId);
      if (!itemSchemas[item.type].canNest || parent?.type !== 'column' || parent.parentItemId) {
        fail(422, 'invalid_parent', 'Invalid column membership.');
      }
    }
    if (item.frameId && (ids.get(item.frameId)?.type !== 'frame' || item.frameId === item.id)) {
      fail(422, 'invalid_frame', 'Invalid frame membership.');
    }
  }
  const linkKeys = new Set<string>();
  for (const link of board.links) {
    const source = ids.get(link.sourceItemId);
    const target = ids.get(link.targetItemId);
    const key = `${link.sourceItemId}:${link.kind}`;
    if (
      !source ||
      !target ||
      source.id === target.id ||
      linkKeys.has(key) ||
      (link.kind === 'created_from'
        ? source.type !== 'note' || target.type !== 'dispenser'
        : !['line_start', 'line_end'].includes(link.kind) || source.type !== 'line')
    ) {
      fail(422, 'invalid_link', 'Invalid item link.');
    }
    linkKeys.add(key);
  }
}


