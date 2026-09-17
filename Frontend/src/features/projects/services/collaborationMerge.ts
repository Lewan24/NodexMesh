import type { Project, ProjectSnapshot } from '@/entities/project/types';
import { canonicalJson } from '@/shared/api/canonicalJson';
import { fail } from '@/shared/api/errors';
import { flattenItems } from './boardAdapter';
import { validateBoard } from '@/entities/board/boardValidation';

const equal = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const entities = (value: unknown): value is { id: string }[] =>
  Array.isArray(value) &&
  value.every((entry) => object(entry) && typeof entry.id === 'string') &&
  new Set(value.map((entry) => entry.id)).size === value.length;

/** Three-way merge: only overwrite fields unchanged locally since the last confirmed snapshot. */
export function mergeChanges(base: unknown, local: unknown, remote: unknown): unknown {
  if (equal(local, base)) return remote;
  if (equal(remote, base) || equal(local, remote)) return local;
  if (object(base) && object(local) && object(remote)) {
    return Object.fromEntries(
      [...new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])].map((key) => [
        key,
        mergeChanges(base[key], local[key], remote[key]),
      ]),
    );
  }
  if (entities(base) && entities(local) && entities(remote)) {
    const before = new Map(base.map((entry) => [entry.id, entry]));
    const ours = new Map(local.map((entry) => [entry.id, entry]));
    const theirs = new Map(remote.map((entry) => [entry.id, entry]));
    const common = new Set(base.filter((entry) => ours.has(entry.id) && theirs.has(entry.id)).map((entry) => entry.id));
    const order = (entries: { id: string }[]) =>
      entries.filter((entry) => common.has(entry.id)).map((entry) => entry.id);
    const localReordered = !equal(order(base), order(local));
    const remoteReordered = !equal(order(base), order(remote));
    if (localReordered && remoteReordered && !equal(order(local), order(remote))) conflict();
    const primary = localReordered ? local : remote;
    const secondary = localReordered ? remote : local;
    const ids = [...new Set([...primary, ...secondary, ...base].map((entry) => entry.id))];
    return ids
      .map((id) => mergeChanges(before.get(id), ours.get(id), theirs.get(id)))
      .filter((entry) => entry !== undefined);
  }
  return conflict();
}
function conflict(): never {
  return fail(
    409,
    'collaboration_conflict',
    'You and a collaborator changed the same content. Your local draft is preserved. Download it or reload the shared version.',
  );
}

export function mergeProject(base: Project, local: Project, remote: Project, snapshot: ProjectSnapshot): Project {
  // Roles and ownership are server-managed, never user edits.
  const merged = mergeChanges(base, local, { ...remote, role: base.role, ownerId: base.ownerId }) as Project;
  const result = { ...merged, role: remote.role, ownerId: remote.ownerId };
  // Independent edits must not combine into dangling links, invalid nesting or frames.
  try {
    const entries = flattenItems(result.items, snapshot.board.board.id);
    validateBoard({
      ...snapshot.board,
      items: entries.map(({ item }) => ({
        ...item,
        revision: '1',
        createdAt: snapshot.project.updatedAt,
        updatedAt: snapshot.project.updatedAt,
        createdBy: null,
        updatedBy: null,
        deletedAt: null,
      })),
      links: entries.flatMap((entry) => entry.links),
      comments: [],
      tags: [],
      itemTags: [],
    });
  } catch {
    conflict();
  }
  return result;
}
