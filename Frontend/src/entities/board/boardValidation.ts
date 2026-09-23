import { translate } from '@/shared/i18n';
import type { BoardSnapshot } from './records';
import { itemSchemas, validateItem } from './itemSchema';
import { fail } from '@/shared/api/errors';

export function validateBoard(board: BoardSnapshot): void {
  if (board.items.length > 20_000) fail(422, 'board_limit', translate('The board item limit has been reached.'));
  const active = board.items.filter((i) => !i.deletedAt);
  const ids = new Map(active.map((i) => [i.id, i]));
  if (new Set(board.items.map((i) => i.id)).size !== board.items.length)
    fail(422, 'duplicate_id', translate('Duplicate item ID.'));
  for (const item of active) {
    validateItem(item);
    if (item.boardId !== board.board.id) fail(422, 'invalid_scope', translate('Item belongs to another board.'));
    if (item.parentItemId) {
      const parent = ids.get(item.parentItemId);
      if (!itemSchemas[item.type].canNest || parent?.type !== 'column' || parent.parentItemId) {
        fail(422, 'invalid_parent', translate('Invalid column membership.'));
      }
    }
    if (item.frameId && (ids.get(item.frameId)?.type !== 'frame' || item.frameId === item.id)) {
      fail(422, 'invalid_frame', translate('Invalid frame membership.'));
    }
    const visitedFrames = new Set<string>([item.id]);
    let frameId = item.frameId;
    while (frameId) {
      if (visitedFrames.has(frameId)) fail(422, 'invalid_frame', translate('Invalid frame membership.'));
      visitedFrames.add(frameId);
      frameId = ids.get(frameId)?.frameId ?? null;
    }
  }
  const linkKeys = new Set<string>();
  const lineEndpoints = new Map<string, { start?: string; end?: string }>();
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
      fail(422, 'invalid_link', translate('Invalid item link.'));
    }
    linkKeys.add(key);
    if (link.kind === 'line_start' || link.kind === 'line_end') {
      const endpoints = lineEndpoints.get(link.sourceItemId) ?? {};
      if (link.kind === 'line_start') endpoints.start = link.targetItemId;
      else endpoints.end = link.targetItemId;
      lineEndpoints.set(link.sourceItemId, endpoints);
    }
  }
  const connections = new Set<string>();
  for (const endpoints of lineEndpoints.values()) {
    if (!endpoints.start || !endpoints.end) continue;
    const key = [endpoints.start, endpoints.end].sort().join(':');
    if (connections.has(key)) fail(422, 'invalid_link', translate('Only one line can connect the same two items.'));
    connections.add(key);
  }
}
